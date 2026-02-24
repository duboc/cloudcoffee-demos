# CloudCoffee AI Manager

AI-powered coffee shop management demo built with React, TypeScript, and Google Gemini on Vertex AI. Features computer vision monitoring with bounding box detection, sustainability tracking, a conversational store assistant, and dynamic AI-generated charts — all with local persistence.

## Features

- **Dashboard** — Store overview with sales metrics, customer count, wait times, and energy consumption. "Gerar Insights com Gemini" generates dynamic AI insights and charts that replace the default cards. Snapshots are auto-saved and restored on reload.
- **Computer Vision** — Multi-camera monitoring (Frente de Caixa, Vitrine de Salgados, Entrada Principal). Generates synthetic camera images via Gemini, analyzes them with bounding box overlays, and produces charts (object counts, stock levels). Supports image upload. All generated and uploaded images are auto-saved per camera for reuse without regeneration.
- **Sustainability** — Water and energy consumption gauges with AI-generated sustainability reports, actionable recommendations, and charts (consumption vs goals, waste breakdown). Reports are saved with browsable history.
- **Chat ("Fale com a Loja")** — Context-aware conversational assistant powered by Gemini. Answers questions about sales, inventory, weather, and queues. Quantitative queries produce inline charts. Sessions are auto-saved with full history.

## Quick Start

```bash
./start.sh
```

The script checks prerequisites, installs dependencies, configures `.env`, and starts the dev servers.

## Manual Setup

```bash
# 1. Authenticate with Google Cloud
gcloud auth application-default login

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env → set GOOGLE_CLOUD_PROJECT

# 4. Start the dev servers (frontend + backend)
npm run dev
```

The frontend runs at **http://localhost:3000** and proxies `/api/*` requests to the Express backend on port 3001.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS 4, Lucide icons, Motion (animations) |
| Charts | Recharts (bar, line, pie, area) from Gemini-generated data |
| Backend | Express 4 (API proxy to Vertex AI + file-based persistence) |
| AI | Google Gemini via Vertex AI (`gemini-2.5-flash` for text, `gemini-2.0-flash-exp` for images) |
| Auth | Google Cloud Application Default Credentials (ADC) |
| Persistence | Local JSON file (`data/store.json`) + image files (`data/images/`) |

## Prerequisites

- Node.js v18+
- A Google Cloud project with the Vertex AI API enabled
- Authenticated via `gcloud auth application-default login`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (Vite) and backend (Express) |
| `npm run dev:client` | Start Vite dev server only (port 3000) |
| `npm run dev:server` | Start Express API server only (port 3001, with auto-reload) |
| `npm run build` | Production build to `dist/` |
| `npm run start` | Production server (serves API + built frontend) |
| `npm run preview` | Build + start production server |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run clean` | Remove `dist/` |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | Google Cloud project ID |
| `GOOGLE_CLOUD_LOCATION` | No | `global` | Gemini API location |
| `PORT` | No | `3001` | Express server port |

Set variables in a `.env` file at the project root. See [`.env.example`](.env.example).

## Project Structure

```
cloudcoffee-demos/
├── server/
│   ├── index.ts                 # Express entry point
│   └── routes/
│       ├── gemini.ts            # Vertex AI API routes (5 endpoints)
│       └── persistence.ts      # File-based persistence (CRUD + image serving)
├── src/
│   ├── App.tsx                  # Main app (sidebar, header, all 4 views)
│   ├── main.tsx                 # React DOM entry point
│   ├── index.css                # Global styles, Tailwind imports, fonts
│   ├── components/
│   │   ├── GeminiChart.tsx      # Recharts wrapper (bar, line, pie, area)
│   │   └── HistoryPanel.tsx     # Reusable history sidebar with delete
│   ├── lib/
│   │   └── utils.ts             # cn() className merge utility
│   └── services/
│       └── gemini.ts            # Frontend API client + persistence functions
├── data/                        # Auto-created at runtime (gitignored)
│   ├── store.json               # All saved data (analyses, chats, reports, snapshots)
│   └── images/                  # Saved PNG images
├── docs/
│   └── save-flow-audit.md       # Persistence audit and TODO list
├── index.html                   # HTML template
├── start.sh                     # Quick-start script
├── vite.config.ts               # Vite config + /api proxy
├── tsconfig.json                # TypeScript config
├── .env.example                 # Environment variable template
├── package.json                 # Dependencies and scripts
└── ARCHITECTURE.md              # Architecture deep-dive
```

## API Endpoints

### Gemini (AI)

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `POST /api/generate-image` | `gemini-2.0-flash-exp` | Generate synthetic camera images |
| `POST /api/analyze-image` | `gemini-2.5-flash` | Object detection with bounding boxes, summary, and charts |
| `POST /api/store-insights` | `gemini-2.5-flash` | Context-aware chat with optional charts |
| `POST /api/sustainability-report` | `gemini-2.5-flash` | Sustainability report with charts |
| `POST /api/dashboard-insights` | `gemini-2.5-flash` | Dynamic dashboard insights and charts |

All AI endpoints return structured JSON with `{ text, charts[] }` and classify errors (429 rate limit, 503 unavailable, 400 bad request, 401/403 auth) with user-friendly messages in Portuguese.

### Persistence (Data)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/data` | Load entire store |
| `POST /api/data/generated-image` | Save a generated/uploaded image |
| `POST /api/data/vision` | Save analysis + image file |
| `POST /api/data/chat` | Create or update chat session |
| `POST /api/data/sustainability` | Save sustainability report |
| `POST /api/data/dashboard` | Save dashboard snapshot |
| `DELETE /api/data/:collection/:id` | Delete entry (+ image file cleanup) |
| `GET /api/data/images/:filename` | Serve saved images |

## Persistence

All data is stored locally in `data/` (auto-created, gitignored):

- **`store.json`** — JSON file with all metadata: vision analyses, chat sessions, sustainability reports, dashboard snapshots, and generated image references.
- **`images/`** — Saved PNG files referenced by filename in `store.json`.

Data survives page reloads. Each view auto-saves after successful Gemini responses and restores the last state on mount.

## Error Handling

Gemini API errors are classified and surfaced to users via a dismissable banner:

| Error | HTTP Status | User Message |
|-------|-------------|-------------|
| Rate limit | 429 | "Limite de requisicoes da API Gemini atingido..." |
| Service down | 503 | "O servico Gemini esta temporariamente indisponivel..." |
| Bad request / safety filter | 400 | "A requisicao foi bloqueada..." |
| Auth failure | 401/403 | "Erro de autenticacao com a API Gemini..." |
| Network error | — | "Nao foi possivel conectar ao servidor..." |

## Production Deployment

On Cloud Run or GCE, ADC is automatic via the attached service account. Set `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` as environment variables, then:

```bash
npm run build
npm run start
```

The Express server serves both the API routes and the static frontend from `dist/`.

## License

Apache 2.0 — see [LICENSE](LICENSE).
