# Architecture

This document describes the internal design of CloudCoffee AI Manager for developers working on the codebase.

## High-Level Overview

The app is a React SPA with an Express backend. The frontend communicates with backend API routes, which call the Gemini API via Vertex AI using Application Default Credentials (ADC). No API keys are exposed to the client.

```
┌─────────────────────────┐       ┌─────────────────────────────────┐
│  Browser (React SPA)    │       │  Express Backend (server/)      │
│                         │       │                                 │
│  App.tsx                │       │  routes/gemini.ts               │
│   ├── DashboardView     │       │   ├── POST /api/generate-image  │
│   ├── VisionView ───────┼──►────┤   ├── POST /api/analyze-image   │──► Vertex AI
│   ├── SustainabilityView┼──►────┤   ├── POST /api/sustainability  │    (ADC)
│   └── ChatView ─────────┼──►────┤   └── POST /api/store-insights  │
│                         │       │                                 │
│  services/gemini.ts     │       │  @google/genai SDK              │
│  (fetch calls to /api)  │       │  (vertexai: true)               │
└─────────────────────────┘       └─────────────────────────────────┘
        :3000                              :3001
     (Vite dev)                     (Express, or same port in prod)
```

In development, Vite proxies `/api/*` requests to the Express server. In production, Express serves both the API and the built frontend from `dist/`.

## Source Files

### `server/index.ts`

Express entry point. Configures JSON body parsing (50MB limit for base64 images), mounts API routes at `/api`, and serves the production frontend from `dist/`.

### `server/routes/gemini.ts`

All Vertex AI interactions. Initializes the `@google/genai` SDK with `vertexai: true` and ADC:

```ts
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});
```

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `POST /api/generate-image` | `gemini-2.0-flash-exp` | Generate synthetic camera images |
| `POST /api/analyze-image` | `gemini-2.5-flash` | Object detection with bounding boxes + narrative summary |
| `POST /api/store-insights` | `gemini-2.5-flash` | Context-aware chat responses |
| `POST /api/sustainability-report` | `gemini-2.5-flash` | Sustainability report from consumption data |

### `src/App.tsx`

Contains all UI components in a single file. This is the core of the application.

**Top-level component: `App`**
- Manages global state: active view, sidebar toggle, alerts.
- Renders the sidebar (`NavItem`), header (search bar, notifications, user avatar), and the active view.

**View components (defined in the same file):**

| Component | Purpose | Backend Endpoint |
|-----------|---------|-----------------|
| `DashboardView` | Stats cards (sales, customers, wait time, energy) + alerts list + hardcoded Gemini insights | None (static data) |
| `VisionView` | Camera selector, image generation, image analysis with bounding box overlays | `/api/generate-image`, `/api/analyze-image` |
| `SustainabilityView` | Water/energy consumption bars + AI-generated sustainability report | `/api/sustainability-report` |
| `ChatView` | Chat interface with message history, input, typing indicator | `/api/store-insights` |

**Helper components:**

| Component | Purpose |
|-----------|---------|
| `NavItem` | Sidebar navigation button with active state and collapsed tooltip |
| `StatCard` | Metric card with title, value, change indicator, and icon |
| `SparklesIcon` | Custom SVG icon for Gemini branding |

### `src/services/gemini.ts`

Frontend API client. Four functions that call the backend via `fetch()`. Function signatures are identical to the original SDK-based version so `App.tsx` required no changes during migration.

| Function | Endpoint | Input | Output |
|----------|----------|-------|--------|
| `generateVisionExample(prompt)` | `/api/generate-image` | Text prompt | Base64 PNG data URL or `null` |
| `analyzeImage(imageBase64, task)` | `/api/analyze-image` | Base64 image + task description | `{ objects: [{label, box_2d, info}], summary }` |
| `getStoreInsights(query, context)` | `/api/store-insights` | User query + context object | Markdown text |
| `getSustainabilityReport(data)` | `/api/sustainability-report` | `{water, electricity, waste}` | Markdown text |

### `src/lib/utils.ts`

Single utility: `cn()` -- merges Tailwind CSS class names using `clsx` + `tailwind-merge`. Used throughout the app for conditional styling.

### `src/index.css`

Imports Tailwind CSS and loads Google Fonts (Inter for body text, JetBrains Mono for monospace).

## Data Flow

### Computer Vision Pipeline

```
User clicks "Gerar Opcoes com Gemini"
  │
  ├── fetch POST /api/generate-image  x3 (parallel)  → 3 synthetic images
  │
  ├── Auto-selects first image
  │
  └── fetch POST /api/analyze-image
        │
        ├── Returns { objects[], summary }
        │
        ├── objects[] → rendered as bounding box overlays on the image
        │
        └── summary  → rendered as Markdown in the report panel
```

Users can also upload their own images, which skip generation and go directly to analysis.

### Chat Pipeline

```
User types message → appended to messages[]
  │
  └── fetch POST /api/store-insights (query + hardcoded context)
        │
        └── Response appended to messages[] as assistant message
```

The store context (sales, weather, queue, stock) is currently hardcoded in `ChatView`.

### Sustainability Pipeline

```
User clicks "Gerar Resumo do Dia"
  │
  └── fetch POST /api/sustainability-report (hardcoded data)
        │
        └── Markdown rendered in report panel
```

## Authentication

The app uses **Google Cloud Application Default Credentials (ADC)**. No API keys are involved.

- **Local development:** Run `gcloud auth application-default login` to authenticate.
- **Cloud Run / GCE:** ADC is automatic via the attached service account. Ensure the service account has the `Vertex AI User` role.

The `@google/genai` SDK picks up credentials automatically when `vertexai: true` is set.

## Styling System

- **Tailwind CSS 4** via Vite plugin (no `tailwind.config.js` needed).
- **Google-inspired color palette:** `#4285f4` (blue), `#34a853` (green), `#ea4335` (red), `#fbbc05` (yellow), `#1a73e8` (primary blue), `#202124` (text), `#5f6368` (secondary text), `#dadce0` (borders), `#f1f3f4` (background).
- **Animations:** Page transitions use `motion/react` with fade/slide effects. Loading states use Tailwind's `animate-spin` and `animate-bounce`.

## Configuration

### Vite (`vite.config.ts`)

- Path alias: `@/` maps to project root.
- Dev proxy: `/api/*` requests are forwarded to Express at `localhost:3001`.

### TypeScript (`tsconfig.json`)

- Target: ES2022, JSX: react-jsx, module resolution: bundler.
- `noEmit: true` -- TypeScript is used for type checking only; Vite handles transpilation.

## Vertex AI Notes

Differences from the Gemini AI Studio API that affect this codebase:

- **`contents` requires `role` field:** Vertex AI rejects bare objects. All requests use `contents: [{ role: 'user', parts: [...] }]`.
- **Image generation config:** Requires `responseModalities: ['TEXT', 'IMAGE']` and `outputMimeType` in `imageConfig`, otherwise only text is returned.

## Current Limitations & Development Notes

- **Single-file UI:** All views and components live in `App.tsx`. As the app grows, these should be extracted into separate files under `src/components/` or `src/views/`.
- **Hardcoded data:** Dashboard stats, chat context, and sustainability metrics are hardcoded. A real implementation would fetch from the backend/database.
- **No tests:** No test framework or test files exist yet.
- **No routing:** View switching is handled via React state, not a router. Adding `react-router` would enable deep linking.
- **UI language:** All user-facing text is in Portuguese (pt-BR).
