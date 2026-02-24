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

const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.0-flash-exp';

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

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
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
      config: {
        responseMimeType: 'application/json',
      },
    });

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

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Você é o assistente de IA corporativo de uma cafeteria chamada "CloudCoffee".
            Contexto atual da loja: ${JSON.stringify(context)}
            Pergunta do gestor: ${query}

            Responda de forma profissional e baseada em dados, cruzando informações de vendas, clima e visão computacional se necessário.

            Retorne um JSON com a seguinte estrutura:
            {
              "text": "Sua resposta completa em Markdown",
              "charts": [
                {
                  "type": "bar ou line ou pie ou area",
                  "title": "Título do gráfico",
                  "data": [{"name": "X", "value": 10}]
                }
              ]
            }

            Inclua gráficos APENAS quando a pergunta for quantitativa ou envolver dados numéricos (vendas, estoque, fluxo, comparações).
            Para perguntas simples ou conversacionais, retorne charts como array vazio [].`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

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

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
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
      config: {
        responseMimeType: 'application/json',
      },
    });

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

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
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
      config: {
        responseMimeType: 'application/json',
      },
    });

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

export default router;
