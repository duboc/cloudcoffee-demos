import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');

const router = Router();

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || '',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const textModel = 'gemini-3-flash-preview';
const textModelFallback = 'gemini-3.1-pro-preview';
const imageModel = 'gemini-3.1-flash-image-preview';

// Try primary text model, fall back to pro on failure
async function generateText(contents: any[], config?: any) {
  try {
    return await ai.models.generateContent({ model: textModel, contents, config });
  } catch (error: any) {
    console.warn(`Primary model (${textModel}) failed, falling back to ${textModelFallback}:`, error.message || error);
    return await ai.models.generateContent({ model: textModelFallback, contents, config });
  }
}

// Extract HTTP status and user-friendly message from Gemini API errors
function parseGeminiError(error: any): { status: number; message: string; code: string } {
  const msg = error.message || String(error);
  const status = error.status || error.statusCode || error.httpStatusCode || error.code;

  // 429 / RESOURCE_EXHAUSTED — rate limit
  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('quota')) {
    return { status: 429, message: 'Limite de requisições da API Gemini atingido. Aguarde alguns segundos e tente novamente.', code: 'RATE_LIMITED' };
  }

  // 503 / UNAVAILABLE — service down
  if (status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE')) {
    return { status: 503, message: 'O serviço Gemini está temporariamente indisponível. Tente novamente em instantes.', code: 'SERVICE_UNAVAILABLE' };
  }

  // 400 / INVALID_ARGUMENT — bad request (e.g. safety block, bad image)
  if (status === 400 || msg.includes('400') || msg.includes('INVALID_ARGUMENT') || msg.includes('SAFETY')) {
    return { status: 400, message: 'A requisição foi bloqueada (possível filtro de segurança ou dados inválidos).', code: 'BAD_REQUEST' };
  }

  // 401/403 — auth issues
  if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('UNAUTHENTICATED')) {
    return { status: 403, message: 'Erro de autenticação com a API Gemini. Verifique as credenciais do projeto.', code: 'AUTH_ERROR' };
  }

  // Default — internal error
  return { status: 500, message: `Erro interno ao chamar a API Gemini: ${msg}`, code: 'INTERNAL_ERROR' };
}

function handleGeminiError(res: Response, endpoint: string, error: any) {
  const parsed = parseGeminiError(error);
  console.error(`${endpoint} error [${parsed.code}]:`, error.message || error);
  res.status(parsed.status).json({ error: parsed.message, code: parsed.code });
}

// POST /api/generate-image
// Generate a synthetic camera image from a text prompt
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
          outputMimeType: 'image/png',
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0].content?.parts) {
      res.json({ image: null, error: 'No candidates returned' });
      return;
    }

    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        res.json({ image: `data:image/png;base64,${base64}` });
        return;
      }
    }

    res.json({ image: null, error: 'No image data in response' });
  } catch (error: any) {
    handleGeminiError(res, 'generate-image', error);
  }
});

// POST /api/analyze-image
// Analyze a camera image with bounding box detection + charts
router.post('/analyze-image', async (req: Request, res: Response) => {
  try {
    const { imageData, task } = req.body;

    // Resolve image data: either a base64 data URI or a server file path
    let base64Data: string;
    if (imageData.startsWith('data:')) {
      base64Data = imageData.split(',')[1];
    } else if (imageData.startsWith('/api/data/images/')) {
      const filename = imageData.replace('/api/data/images/', '');
      const filePath = path.join(IMAGES_DIR, filename);
      if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'Imagem não encontrada no servidor.', code: 'BAD_REQUEST' });
        return;
      }
      base64Data = fs.readFileSync(filePath).toString('base64');
    } else {
      res.status(400).json({ error: 'Formato de imagem não reconhecido.', code: 'BAD_REQUEST' });
      return;
    }

    const prompt = `Analise esta imagem de uma câmera de segurança de uma cafeteria.
  Tarefa: ${task}

  Retorne um JSON com a seguinte estrutura:
  {
    "objects": [
      {
        "label": "string (ex: Pessoa, Pão de Queijo, Fila)",
        "box_2d": [ymin, xmin, ymax, xmax], // Coordenadas normalizadas de 0 a 1000
        "info": "string (detalhe adicional)"
      }
    ],
    "summary": "Resumo narrativo do que está acontecendo para o gerente",
    "charts": [
      {
        "type": "bar ou pie",
        "title": "Título descritivo do gráfico",
        "data": [{"name": "Categoria", "value": 10}]
      }
    ]
  }

  Gere gráficos relevantes baseados na análise. Exemplos:
  - Contagem de objetos por categoria (bar chart)
  - Nível de estoque por item (bar chart)
  - Distribuição de pessoas por área (pie chart)

  Seja preciso nas coordenadas dos bounding boxes.`;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    if (!response.candidates || response.candidates.length === 0) {
      res.json({
        summary: 'A IA não conseguiu analisar a imagem. Verifique se a imagem é clara ou se houve um bloqueio de segurança.',
        charts: [],
      });
      return;
    }

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (!parsed.charts) parsed.charts = [];
      res.json(parsed);
    } catch {
      res.json({ summary: 'Erro ao processar a resposta da IA.', charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'analyze-image', error);
  }
});

// POST /api/store-insights
// Context-aware chat assistant for store management — returns { text, charts }
router.post('/store-insights', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Você é o assistente de IA operacional da cafeteria "CloudCoffee". Seu papel é ajudar o gerente a operar a loja no dia a dia. Você não apenas responde perguntas — você age como um braço direito do gestor.

Contexto atual da loja: ${JSON.stringify(context)}
Solicitação do gestor: ${query}

## Suas capacidades:

1. **Rascunho de e-mails**: Quando o gestor pedir para escrever, redigir ou enviar um e-mail (para fornecedores, equipe, matriz, clientes), redija o e-mail completo com assunto, saudação, corpo e despedida. Use tom profissional.

2. **Listas e checklists**: Quando o gestor pedir uma lista (de compras, tarefas do dia, checklist de abertura/fechamento, itens para reunião), gere uma lista organizada com checkboxes em Markdown (- [ ] item).

3. **Planos operacionais**: Quando o gestor pedir um plano (para evento, promoção, treinamento, melhoria), estruture com objetivo, etapas numeradas, responsáveis sugeridos e prazo sugerido.

4. **Análise de dados**: Quando a pergunta envolver números (vendas, estoque, fluxo, comparações), cruze os dados do contexto e gere gráficos relevantes.

5. **Comunicados internos**: Quando pedir um aviso para a equipe, redija no formato de comunicado com título, data e corpo claro.

6. **Resumo de turno / briefing**: Quando pedir resumo do dia ou briefing, organize as informações do contexto em um resumo estruturado com destaques, alertas e próximos passos.

7. **Respostas gerais**: Para perguntas simples ou conversacionais, responda de forma direta e útil.

## Formato de resposta:

Retorne um JSON com a seguinte estrutura:
{
  "text": "Sua resposta completa em Markdown (use formatação rica: títulos, listas, negrito, blocos de citação para e-mails)",
  "charts": [
    {
      "type": "bar ou line ou pie ou area",
      "title": "Título do gráfico",
      "data": [{"name": "X", "value": 10}]
    }
  ]
}

Inclua gráficos APENAS quando a solicitação envolver dados numéricos.
Para e-mails, listas, planos e comunicados, retorne charts como array vazio [].
Sempre responda em português brasileiro.`,
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({ text: parsed.text || '', charts: parsed.charts || [] });
    } catch {
      res.json({ text: response.text || '', charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'store-insights', error);
  }
});

// POST /api/sustainability-report
// Generate AI sustainability report — returns { text, charts }
router.post('/sustainability-report', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Gere um breve relatório narrado de sustentabilidade para o gerente da cafeteria baseado nos seguintes dados de consumo: ${JSON.stringify(data)}.
            Identifique anomalias e dê recomendações práticas.

            Retorne um JSON com a seguinte estrutura:
            {
              "text": "Relatório completo em Markdown",
              "charts": [
                {
                  "type": "bar ou line ou pie ou area",
                  "title": "Título do gráfico",
                  "data": [{"name": "Categoria", "value": 10}]
                }
              ]
            }

            Gere gráficos relevantes como:
            - Consumo atual vs meta (bar chart)
            - Distribuição de resíduos (pie chart)
            - Tendência de consumo energético (line ou area chart)`,
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({ text: parsed.text || '', charts: parsed.charts || [] });
    } catch {
      res.json({ text: response.text || '', charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'sustainability-report', error);
  }
});

// POST /api/dashboard-insights
// Generate dynamic AI insights for dashboard — replaces hardcoded content
router.post('/dashboard-insights', async (req: Request, res: Response) => {
  try {
    const { stats } = req.body;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Você é o assistente de IA da cafeteria "CloudCoffee". Analise os dados atuais da loja e gere insights acionáveis para o gerente.

            Dados atuais: ${JSON.stringify(stats || {
              vendas: 'R$ 4.250,00',
              clientes: 142,
              tempoEspera: '4m 20s',
              consumoEnergia: '12.4 kWh',
              fila: '5 pessoas',
              estoque: 'Pão de queijo baixo (2 unidades)',
              clima: '18°C, nublado',
            })}

            Retorne um JSON com a seguinte estrutura:
            {
              "text": "Resumo geral dos insights em Markdown (2-3 parágrafos curtos)",
              "insights": [
                {
                  "type": "opportunity ou alert ou info",
                  "title": "Título curto",
                  "description": "Descrição detalhada da oportunidade ou alerta"
                }
              ],
              "charts": [
                {
                  "type": "bar ou line ou pie ou area",
                  "title": "Título do gráfico",
                  "data": [{"name": "Categoria", "value": 10}]
                }
              ]
            }

            Gere 2-3 insights relevantes e 2-3 gráficos úteis como:
            - Distribuição de vendas por período (bar chart)
            - Fluxo de clientes (line chart)
            - Mix de produtos (pie chart)`,
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({
        text: parsed.text || '',
        insights: parsed.insights || [],
        charts: parsed.charts || [],
      });
    } catch {
      res.json({ text: response.text || '', insights: [], charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'dashboard-insights', error);
  }
});

// POST /api/daily-briefing
// Generate a morning operations briefing for the store manager
router.post('/daily-briefing', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Você é o assistente de IA da cafeteria "CloudCoffee". Gere um briefing matinal completo para o gerente baseado no contexto operacional abaixo.

Contexto da loja: ${JSON.stringify(context)}

## Estrutura do briefing:

1. **Cabeçalho**: Data, clima, status geral da loja (aberta/operacional)
2. **Itens de Ação Prioritários**: Lista de tarefas classificadas como:
   - "urgente" (vermelho): Problemas que precisam de ação imediata
   - "importante" (laranja): Tarefas que devem ser feitas hoje
   - "rotina" (azul): Tarefas operacionais regulares
3. **Alertas de Estoque**: Itens em nível crítico ou baixo que precisam de reposição
4. **Recomendações de Equipe**: Sugestões de alocação de pessoal por período
5. **Previsão de Demanda**: Estimativa de movimento por período do dia
6. **Meta de Receita**: Meta do dia e estratégias para atingi-la

## Formato de resposta:

Retorne um JSON com a seguinte estrutura:
{
  "text": "Briefing completo em Markdown com formatação rica (títulos, listas, negrito, tabelas)",
  "actionItems": [
    {
      "priority": "urgente | importante | rotina",
      "category": "Categoria (ex: Estoque, Equipe, Promoção, Manutenção)",
      "description": "Descrição da ação"
    }
  ],
  "weatherSummary": "Resumo curto do clima e impacto na operação",
  "revenueTarget": "Meta de receita formatada (ex: R$ 5.000,00)",
  "charts": [
    {
      "type": "bar ou line ou pie ou area",
      "title": "Título do gráfico",
      "data": [{"name": "Categoria", "value": 10}]
    }
  ]
}

Gere 3-4 gráficos relevantes:
- Previsão de demanda por hora (bar chart)
- Status do estoque (bar chart)
- Distribuição de tarefas por prioridade (pie chart)
- Projeção de receita vs meta (bar chart)

Gere entre 5-8 itens de ação variados entre as prioridades.
Sempre responda em português brasileiro.`,
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({
        text: parsed.text || '',
        actionItems: parsed.actionItems || [],
        weatherSummary: parsed.weatherSummary || '',
        revenueTarget: parsed.revenueTarget || '',
        charts: parsed.charts || [],
      });
    } catch {
      res.json({ text: response.text || '', actionItems: [], weatherSummary: '', revenueTarget: '', charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'daily-briefing', error);
  }
});

// POST /api/feedback-analysis
// Analyze customer reviews with sentiment analysis and improvement plans
router.post('/feedback-analysis', async (req: Request, res: Response) => {
  try {
    const { reviews } = req.body;

    const response = await generateText(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Você é o assistente de IA da cafeteria "CloudCoffee". Analise as seguintes avaliações de clientes (Google Reviews) e gere um relatório completo de análise de feedback.

Avaliações dos clientes:
${JSON.stringify(reviews, null, 2)}

## O que você deve fazer:

1. **Análise de Sentimento**: Classifique cada avaliação como positiva, neutra ou negativa. Calcule as porcentagens gerais e a nota média.
2. **Categorização por Tema**: Agrupe os feedbacks nas categorias: atendimento, produto, ambiente, preco, e outros temas que identificar. Conte menções e determine o sentimento predominante por categoria.
3. **Identificação de Tendências**: Identifique padrões recorrentes nos feedbacks.
4. **Plano de Melhoria**: Crie um plano de ações prioritárias baseado nos feedbacks, com área, ação específica, prioridade (Alta/Média/Baixa) e impacto esperado.

## Formato de resposta:

Retorne um JSON com a seguinte estrutura:
{
  "text": "Relatório completo em Markdown com análise detalhada, destaques positivos, pontos de atenção e conclusões",
  "sentimentSummary": {
    "positive": 60,
    "neutral": 20,
    "negative": 20,
    "averageRating": 3.8
  },
  "categoryBreakdown": [
    {
      "category": "Atendimento",
      "mentions": 5,
      "sentiment": "Positivo"
    }
  ],
  "improvementPlan": [
    {
      "area": "Atendimento",
      "action": "Implementar treinamento de cordialidade",
      "priority": "Alta",
      "impact": "Aumento de 15% na satisfação"
    }
  ],
  "charts": [
    {
      "type": "pie",
      "title": "Distribuição de Sentimento",
      "data": [{"name": "Positivo", "value": 60}, {"name": "Neutro", "value": 20}, {"name": "Negativo", "value": 20}]
    }
  ]
}

Gere 3 gráficos:
- Distribuição de sentimento (pie chart)
- Menções por categoria (bar chart)
- Distribuição de notas (bar chart com notas de 1 a 5)

Sempre responda em português brasileiro.`,
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' },
    );

    try {
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({
        text: parsed.text || '',
        sentimentSummary: parsed.sentimentSummary || { positive: 0, neutral: 0, negative: 0, averageRating: 0 },
        categoryBreakdown: parsed.categoryBreakdown || [],
        improvementPlan: parsed.improvementPlan || [],
        charts: parsed.charts || [],
      });
    } catch {
      res.json({ text: response.text || '', sentimentSummary: { positive: 0, neutral: 0, negative: 0, averageRating: 0 }, categoryBreakdown: [], improvementPlan: [], charts: [] });
    }
  } catch (error: any) {
    handleGeminiError(res, 'feedback-analysis', error);
  }
});

export default router;
