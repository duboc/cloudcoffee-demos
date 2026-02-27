# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudCoffee AI Manager — an AI-powered coffee shop management demo using React 19, TypeScript, Express, and Google Gemini via Vertex AI. All user-facing text is in **Portuguese (pt-BR)**.

## Commands

```bash
npm run dev            # Start frontend (Vite :3000) + backend (Express :3001) concurrently
npm run dev:client     # Frontend only
npm run dev:server     # Backend only (tsx watch, auto-reload)
npm run build          # Vite production build to dist/
npm run start          # Production: Express serves dist/ + API
npm run lint           # Type-check only (tsc --noEmit) — no linter or formatter configured
./start.sh             # Quick setup: checks prereqs, gcloud auth, installs deps, starts dev
./deploy.sh            # Deploy to Cloud Run from source
```

## Architecture

**React SPA + Express backend + Vertex AI (Gemini)**

- **Frontend** (`src/`): Single-page app built with Vite. All views live in `App.tsx` (monolithic ~1000-line component with state-based view switching, no router). Charts rendered via `components/GeminiChart.tsx` (Recharts). API calls go through `services/gemini.ts`.
- **Backend** (`server/`): Minimal Express app (`index.ts`, ~30 lines) mounting two route modules:
  - `routes/gemini.ts` — Vertex AI endpoints (image generation, analysis, chat, sustainability reports, dashboard insights, briefings, feedback)
  - `routes/persistence.ts` — File-based CRUD using `data/store.json` + `data/images/`
- **Dev proxy**: Vite proxies `/api/*` to Express at :3001

## Vertex AI / Gemini

- SDK: `@google/genai` with `vertexai: true` — uses Application Default Credentials (ADC), no API keys
- Auth locally: `gcloud auth application-default login`
- Required env: `GOOGLE_CLOUD_PROJECT`. Optional: `GOOGLE_CLOUD_LOCATION` (default: `global`), `PORT` (default: `3001`)

### Model Preferences

| Use case | Model | Region |
|----------|-------|--------|
| Text interactions | `gemini-3-flash-preview` (fallback: `gemini-3.1-pro-preview`) | global |
| Image interactions | `gemini-3.1-flash-image-preview` | global |
| Voice/Live API | `gemini-live-2.5-flash-native-audio` | us-central1 |

Models are configured as constants in `server/routes/gemini.ts` (`textModel`, `imageModel`).

## Key Conventions

- ES modules throughout (`"type": "module"` in package.json)
- Path alias: `@/*` maps to project root (configured in tsconfig + vite.config.ts)
- Styling: Tailwind CSS 4 via `@tailwindcss/vite` plugin (no tailwind.config.js), Google color palette
- JSON body limit: 50MB (for base64 image transport)
- Persistence: flat-file JSON (`data/store.json`), images as PNGs in `data/images/` — the `data/` directory is gitignored and created at runtime
- Git commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `ui:`, `test:`

## Development Workflow

### Planning Protocol

Before writing code for non-trivial tasks:

1. Check for `PLAN.md` in the project root. If it exists, follow it — execute only the next unchecked task.
2. If no `PLAN.md` exists and the task requires multiple steps, generate one as a Markdown checklist with specific, executable instructions per item.
3. Critique the plan for gaps and edge cases before proceeding.
4. Execute one checklist item at a time. Mark each `[x]` in `PLAN.md` after completion.

### Memory Bank Protocol

If a `memory-bank/` folder exists, read ALL files in it before starting any work. These contain persistent project context (`projectbrief.md`, `techContext.md`, `systemPatterns.md`, `activeContext.md`, `progress.md`).

At session end (when asked to stop/wrap up): update `activeContext.md` with work completed and next steps, and update `progress.md` with current state.

### Test-Driven Development

Follow TDD when adding new functionality:

1. Write a failing test first that captures expected behavior.
2. Write the minimum code to make the test pass.
3. Refactor only after the test is green.

### Code Rules

- Explain your approach step-by-step before writing code.
- Reference files by path and line number, not by pasting entire contents.
- Use the codebase's exact identifiers in reasoning — function names, class names, variable names as they appear.
- One task at a time. Complete one change, verify it works, then move to the next.
- Do not introduce new dependencies unless specified in `PLAN.md` or `memory-bank/techContext.md`.
- Do not modify architecture or design patterns unless explicitly instructed.

### Debugging Protocol

When encountering errors, do not guess-and-check. Instead:

1. List all files modified since the last working state.
2. Explain the role of each modified file in the current feature.
3. Identify the root cause.
4. Propose 2-3 targeted fixes with tradeoffs before implementing.

### Self-Review Checklist

Before presenting any code change, verify:

- No injection vulnerabilities, no hardcoded secrets, inputs validated at system boundaries.
- No N+1 queries, no unnecessary allocations.
- Edge cases handled, error paths covered.
- Functions under 50 lines, explicit error handling (no silent failures).
