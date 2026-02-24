# Save Flow & UX Audit

Audit of the persistence and display logic across all 4 views. Covers what works, what was fixed, and what still needs development.

---

## Architecture Overview

```
User Action → Frontend (App.tsx) → Service Layer (gemini.ts) → Backend (Express) → data/store.json
                                                                                  → data/images/*.png
```

- **Store load**: `App` component calls `loadAllData()` on mount, passes `storeData` + `refreshStore` to all views as props.
- **Save**: Each view calls its respective `save*()` function after a successful Gemini response, then calls `refreshStore()` to sync state.
- **Delete**: History panels call `deleteEntry(collection, id)`, then `refreshStore()`.
- **Images**: Vision saves base64 images as separate `.png` files in `data/images/`, referenced by filename in `store.json`.
- **Generated Images**: Every image created by Gemini (or uploaded) is auto-saved to `data/images/` and tracked in `store.json` under `generatedImages[]`. Users can reuse them without regenerating.

---

## Per-View Status

### 1. Dashboard View

| Feature | Status | Notes |
|---------|--------|-------|
| Static stat cards | Working | Hardcoded values (vendas, clientes, espera, energia) |
| Alerts section | Working | Hardcoded 2 alerts |
| "Gerar Insights com Gemini" button | Working | Calls `/api/dashboard-insights` |
| Dynamic AI insights display | Working | Replaces hardcoded cards when generated |
| Fallback to hardcoded insights | Working | Shows sample insights when no AI data |
| Chart grid below insights | Working | Renders charts from Gemini response |
| Auto-save snapshot | Working | Saves after successful generation |
| Restore last snapshot on mount | **Fixed** | Was reading `last.text` but saved as `stats.text`. Now saves `text` at top level. |
| Error banner | Working | Shows on Gemini API errors (429, 503, etc.) |
| History panel for snapshots | **Not implemented** | Snapshots save but there's no UI to browse previous ones |
| "Exportar Relatorio" button | **Not implemented** | Button exists but has no onClick handler |

**TODO:**
- Add history panel or dropdown to browse past dashboard snapshots
- Implement "Exportar Relatorio" (PDF/CSV export) or remove the button

---

### 2. Vision View

| Feature | Status | Notes |
|---------|--------|-------|
| Camera list (3 cameras) | Working | Switching cameras clears analysis and main image |
| "Gerar Opcoes com Gemini" | Working | Generates 3 image variations via `Promise.allSettled` |
| **Auto-save generated images** | Working | Every generated image is auto-saved to `data/images/` and tracked in `generatedImages[]` per camera |
| **Auto-save uploaded images** | Working | Uploaded images are also auto-saved to the same gallery |
| **Saved images gallery** | Working | Per-camera thumbnail grid in sidebar. Click to select + auto-analyze. Delete button on hover. |
| Image upload | Working | FileReader → base64 → auto-analyze → auto-save |
| Bounding box overlays | Working | Normalized coords (0-1000) rendered as CSS |
| Analysis summary (Markdown) | Working | Rendered below image |
| Charts from analysis | Working | `ChartGrid` renders below summary |
| "Salvar Analise" button | Working | Saves image file + analysis to backend. Hidden when viewing a server-loaded image. |
| Analysis history panel | Working | Shows saved analyses with thumbnail, camera name, timestamp |
| Load saved analysis | Working | Restores result + loads image from server URL |
| Delete saved analysis | Working | Deletes from store + removes image file |
| Delete saved image | Working | Removes from gallery + clears main view if it was the active image |
| Error banner | Working | Shows on generate, analyze, save, and delete failures |
| Empty state message | Working | Context-aware: shows "Selecione uma imagem salva" when gallery exists, generic message otherwise |

**Image lifecycle:**
```
Generate/Upload → base64 in memory → auto-save to data/images/ (POST /api/data/generated-image)
                                   → appears in sidebar gallery as thumbnail
                                   → user clicks thumbnail → loads from /api/data/images/:file → analyzes
```

**TODO:**
- When loading a saved analysis, the camera selector doesn't switch to match the saved camera
- Gallery could grow large — consider pagination or a limit on saved images per camera

---

### 3. Sustainability View

| Feature | Status | Notes |
|---------|--------|-------|
| Water consumption gauge | Working | Hardcoded 185L / 150L target |
| Energy consumption gauge | Working | Hardcoded 12.4kWh / 15kWh target |
| "Gerar Resumo do Dia" button | Working | Calls `/api/sustainability-report` |
| Report rendered as Markdown | Working | Shows in right panel |
| Charts from report | Working | `ChartGrid` below the report panel |
| Auto-save report | Working | Saves after generation |
| Restore last report on mount | Working | Loads most recent from `sustainabilityReports[0]` |
| History panel (left column) | Working | Shows past reports with selection highlight |
| Load saved report | Working | Restores report text + charts |
| Delete saved report | Working | Clears current view if deleted item was selected |
| Error banner | Working | Shows on generate and delete failures |
| History subtitle | **Fixed** | Was producing `"undefined..."`. Now falls back to `"Relatorio salvo"` |
| Empty state | Working | Shows leaf icon + instruction text when no report |

**TODO:**
- Consumption gauge values are hardcoded. Could be dynamic from store data or Gemini.
- Input data for the report is hardcoded (`water: "15% acima da media"` etc.). Should allow user input or pull from real sensors.
- Layout is 3-col (`lg:grid-cols-3`) — gauges + history on left, report + charts spanning 2 cols on right

---

### 4. Chat View

| Feature | Status | Notes |
|---------|--------|-------|
| Message display | Working | User (blue, right-aligned) / Assistant (white, left-aligned) |
| Markdown in messages | Working | Both user and assistant messages |
| Inline charts | Working | Charts render below assistant messages that include them |
| Send on Enter / button | Working | Disabled while loading |
| Loading indicator (dots) | Working | Animated bounce dots |
| Auto-scroll | Working | Scrolls to bottom on new messages |
| Auto-save session | Working | Saves after each assistant response |
| Session sidebar | Working | Shows when `chatSessions.length > 0` |
| Load past session | Working | Restores messages + session ID |
| "Nova Conversa" button (header) | Working | Resets messages + generates new session ID |
| "Nova Conversa" button (sidebar) | Working | Plus icon in sidebar header |
| Delete session | Working | Removes from store, resets view if current session deleted |
| Session title | Working | Uses first user message (truncated to 40 chars) |
| Error in chat | Working | Shows user-friendly error as assistant message bubble |
| Disclaimer | Working | "O Gemini pode cometer erros..." at bottom |

**TODO:**
- Chat context is hardcoded (`vendas: "R$ 4.250,00"`, etc.). Should pull from dashboard stats or real data.
- No message editing or deletion within a session
- No search within chat history
- The initial greeting message has no `timestamp` field (minor, cosmetic)
- Session sidebar only appears after first save — on fresh app, sidebar is hidden until a conversation is saved

---

## Shared / App-Level

| Feature | Status | Notes |
|---------|--------|-------|
| Store load on mount | Working | `useEffect` + `refreshStore` callback |
| Error handling (Gemini API) | Working | 429, 503, 400, 401/403 classified and forwarded |
| Error handling (network) | Working | `TypeError` from `fetch` detected |
| Error banner component | Working | Dismissable, red, with AlertTriangle icon |
| Sidebar navigation | Working | Collapsible, active state, tooltips |
| Search bar | **Not implemented** | Static input, no handler |
| Notification bell | **Not implemented** | Shows dot but no dropdown/modal |
| Settings page | **Not implemented** | Nav button exists, no view or handler |
| Help page | **Not implemented** | Nav button exists, no view or handler |

---

## Persistence Backend (`server/routes/persistence.ts`)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/data` | Working | Returns full store.json (with migration for missing `generatedImages`) |
| `POST /api/data/generated-image` | Working | Saves a single generated/uploaded image to `data/images/`, adds to `generatedImages[]` |
| `POST /api/data/vision` | Working | Saves analysis entry + extracts base64 image to file |
| `POST /api/data/chat` | Working | Creates or updates by session ID |
| `POST /api/data/sustainability` | Working | Saves report + charts |
| `POST /api/data/dashboard` | Working | Saves insights + charts + text |
| `DELETE /api/data/:collection/:id` | Working | Supports `generated-images`, `vision`, `chat`, `sustainability`, `dashboard`. Deletes image files for vision + generated-images. |
| `GET /api/data/images/:filename` | Working | Serves saved images via `res.sendFile` |
| Directory auto-creation | Working | `ensureDataDir()` creates `data/` and `data/images/` |
| Store migration | Working | `readStore()` adds `generatedImages: []` to existing stores that lack the field |
| Concurrent write safety | **Not implemented** | No file locking. Rapid concurrent writes could corrupt `store.json` |

---

## Bugs Fixed in This Audit

1. **Dashboard `text` not restored on reload** — `saveDashboardSnapshot` now includes `text` at the top level of the entry, matching what the frontend reads from `last.text`.

2. **Vision history subtitle `"undefined..."`** — Changed from `a.result?.summary?.slice(0, 40) + '...'` (which produces `"undefined..."` when summary is falsy) to a ternary with fallback `"Analise salva"`.

3. **Sustainability history subtitle `"undefined..."`** — Same fix, fallback to `"Relatorio salvo"`.

4. **Vision save of loaded-from-history images** — When a user loads a saved analysis, `mainImage` becomes a server URL (`/api/data/images/...`). The backend regex for base64 extraction wouldn't match. Now: (a) `handleSaveAnalysis` returns early for server URLs, (b) the "Salvar" button is hidden when viewing a loaded item.

5. **Silent save/delete failures** — Vision save, vision delete, and sustainability delete now set the `error` state and show the `ErrorBanner` to the user.

---

## Development Priorities (Next Steps)

### High Priority
- [ ] **Dashboard history panel** — snapshots save but can't be browsed
- [ ] **Dynamic context for Chat** — pull real stats instead of hardcoded context
- [ ] **Dynamic sustainability input** — allow user to enter or connect real consumption data

### Medium Priority
- [ ] **Search functionality** — header search bar across all saved data
- [ ] **Settings page** — at minimum: clear all data, export/import store
- [ ] **File locking for persistence** — prevent corrupt writes under concurrent use
- [ ] **Store size management** — cap number of entries per collection, prune old data

### Low Priority
- [ ] **Export report** — PDF/CSV export for dashboard
- [ ] **Notification system** — bell dropdown with alert history
- [ ] **Help page** — usage guide or link to docs
- [ ] **Chat message editing** — edit or delete individual messages
- [ ] **Chat search** — search within message history
- [ ] **Vision re-analyze** — re-analyze a saved image with a different task
