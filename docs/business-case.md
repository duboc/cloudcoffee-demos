# CloudCoffee AI Manager — Caso de Negocio

## Visao Geral

O CloudCoffee AI Manager e uma aplicacao de gestao inteligente para cafeterias que utiliza Google Gemini (via Vertex AI) para visao computacional, analise de dados e assistente conversacional. A solucao demonstra como IA generativa pode ser integrada a operacoes de varejo para tomada de decisao em tempo real.

---

## Casos de Uso

| # | Caso de Uso | Problema | Solucao com IA | Beneficio |
|---|------------|----------|----------------|-----------|
| 1 | **Monitoramento de Filas** | Gerente nao consegue monitorar todas as cameras simultaneamente | Gemini analisa imagens das cameras, detecta pessoas na fila e gera contagem automatica com bounding boxes | Reducao do tempo de espera e melhor alocacao de funcionarios |
| 2 | **Controle de Estoque Visual** | Ruptura de estoque na vitrine so e percebida quando o cliente reclama | Visao computacional identifica itens na vitrine e alerta quando o estoque esta baixo | Menos vendas perdidas e reposicao proativa |
| 3 | **Analise de Fluxo de Clientes** | Falta de dados sobre horarios de pico e comportamento de clientes | IA analisa imagens da entrada e gera graficos de fluxo por periodo | Planejamento de escala e promocoes baseado em dados reais |
| 4 | **Relatorio de Sustentabilidade** | Dados de consumo de agua e energia ficam em planilhas sem analise | Gemini cruza dados de consumo, identifica anomalias e gera recomendacoes praticas | Reducao de custos operacionais e conformidade ambiental |
| 5 | **Assistente do Gerente** | Gerente precisa consultar multiplos sistemas para tomar decisoes | Chat com IA que cruza vendas, clima, estoque e fila para responder perguntas em linguagem natural | Decisoes mais rapidas e informadas |
| 6 | **Dashboard Inteligente** | Metricas do dashboard sao estaticas e nao geram insights | IA analisa metricas em tempo real e gera insights acionaveis com graficos dinamicos | Identificacao proativa de oportunidades e alertas |

---

## Tecnologias Google Cloud Utilizadas

| Tecnologia | Funcao na Solucao |
|-----------|-------------------|
| **Gemini 2.5 Flash** | Analise de texto, chat, relatorios e insights com resposta estruturada em JSON |
| **Gemini 2.0 Flash** | Geracao de imagens sinteticas para simulacao de cameras |
| **Vertex AI** | Plataforma de IA que hospeda os modelos Gemini com autenticacao via ADC |
| **Cloud Run** | Hospedagem serverless da aplicacao (frontend + backend) |
| **Cloud Build** | Build automatico do container a partir do codigo-fonte |
| **Artifact Registry** | Armazenamento do container image gerado pelo Cloud Build |

---

## Arquitetura Simplificada

| Camada | Componente | Descricao |
|--------|-----------|-----------|
| **Frontend** | React + TypeScript | Interface do gerente com 4 visoes: Dashboard, Visao Computacional, Sustentabilidade e Chat |
| **Backend** | Express (Node.js) | API proxy que intermedia chamadas ao Vertex AI e gerencia persistencia local |
| **IA** | Gemini via Vertex AI | Modelos de linguagem e visao que retornam respostas estruturadas (JSON com texto + graficos) |
| **Deploy** | Cloud Run (source deploy) | Deploy direto do codigo-fonte sem necessidade de Dockerfile |

---

## Diferenciais da Solucao

| Diferencial | Descricao |
|------------|-----------|
| **IA Generativa Aplicada** | Nao e apenas um chatbot — a IA gera insights, graficos e analises visuais integradas ao fluxo de trabalho |
| **Respostas Estruturadas** | Gemini retorna JSON com texto + dados para graficos, permitindo visualizacoes dinamicas (Recharts) |
| **Visao Computacional Acessivel** | Analise de imagens com bounding boxes sem necessidade de treinar modelos customizados |
| **Deploy Simplificado** | Um unico comando (`./deploy.sh`) publica a aplicacao completa no Cloud Run |
| **Sem Chaves de API** | Autenticacao via Application Default Credentials (ADC) — sem secrets no codigo |
