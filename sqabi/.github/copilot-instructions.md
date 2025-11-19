## Quick orientation for AI coding agents

This file contains the minimal, actionable knowledge an AI agent needs to be productive in this repository.

1) Big picture
- This is a single-repo web app with a Vite + React front-end and a small Express API in `server/`.
- Front-end entry: `src/main.jsx` → `src/App.jsx` mounts routes from `pages.config.js` and uses `AuthContext`, `QueryClient` and components in `src/components`.
- Back-end entry: `server/index.js` (loads `.env` / `.env.local`, mounts routes and serves API on `PORT`, default 5174). Routes live in `server/routes/`.

2) How to run (developer workflows)
- Full dev (runs frontend + API): `npm run dev` (uses `concurrently`).
  - Front-end dev server: `npm run dev:web` → Vite.
  - API dev server: `npm run dev:api` → nodemon + `server/index.js`, picks dotenv from `DOTENV_CONFIG_PATH` or `.env.local`.
- Run only API: `npm run api` (useful if embedding frontend elsewhere).
- Build front-end: `npm run build` (Vite build), preview: `npm run preview`.

3) Important environment variables
- DOTENV_CONFIG_PATH — path to dotenv file (used by `dev:api` and `npm run api`).
- PORT — API port (default 5174).
- CORS_ORIGIN — optional CORS origin (if not set, server uses permissive CORS).
- DATA_DIR — optional directory for JSON storage (see below).

4) Storage & data conventions
- The server uses file-based storage for domain entities (connections, charts, dashboards, datasources). Implementation: `server/store/fileStore.js` writing JSON files under `<repo>/data/`.
- Entity → file mapping is in `server/routes/entities.js` (MAP variable). Files are named like `data/connections.json`, `data/charts.json`.
- Entities API normalizes to { items, total } on GET `/api/entities/:EntityName`.

5) API shape and client usage
- API mount point: `/api` (see `server/index.js`). Important routers:
  - `/api/entities` — CRUD via `server/routes/entities.js` (file-based).
  - `/api/db` — DB helpers (`test-connection`, `list-objects`) implemented in `server/routes/db.js` with multi-dialect support (postgres, mysql, mssql, sqlite).
  - `/api/dataset` — `validate` and `fetch`, implemented in `server/routes/dataset.js` (field type mapping, preview and row counting).
- Front-end client: `src/api/base44Client.js` — use `base44.entities.<Name>` for CRUD and `base44.functions.invoke('validateDatasetQuery', payload)` for RPC-like functions. The client normalizes responses.

6) Dialect and DB notes (important behaviour to preserve)
- DB routes accept a `connection_id` that points to `data/connections.json`. Connection objects may embed a `config` object — the server flattens it. See `loadConnectionById` in `server/routes/db.js` and `dataset.js`.
- Supported dialects: postgres, mysql, mssql, sqlite. Each dialect has distinct result/metadata shapes; the code handles them explicitly (do not change mapping logic lightly).

7) Front-end patterns and conventions
- Pages are wired using `pages.config.js` (exports Pages, Layout, mainPage). New pages should be added there.
- UI components live under `src/components/ui/*` and use Tailwind classes. Prefer existing components (e.g. `Button`, `Toaster`) rather than ad-hoc markup.
- API usage should go through `src/api/base44Client.js` to benefit from normalization (entities vs functions).

8) Where to look for examples
- Entity CRUD flow: front-end calls `base44.entities.Connection` → server `server/routes/entities.js` → `server/store/fileStore.js` → `data/connections.json`.
- DB test and list objects: client calls `base44.functions.invoke('testDatabaseConnection', payload)` or `listDatabaseObjects`; server implementation in `server/routes/db.js` and `server/routes/dataset.js`.

9) Small safety rules for code edits
- Keep API route shapes and response normalization intact. The front-end expects `{ items, total }` for entities and `{ fields, preview }` for dataset validate.
- When changing database code, preserve dialect branches (`postgres`, `mysql`, `mssql`, `sqlite`) and the data-shape mapping functions (`mapFieldType`, `isAggregable`) used by the UI.

10) Edit examples (explicit references an AI can use)
- Add an entity: update `server/routes/entities.js` MAP and create or migrate `data/<name>.json` using the same item shape ({ id, created_date, updated_date, ...payload }).
- Call dataset validate from client:
  - Example: `await base44.functions.invoke('validateDatasetQuery', { connection_id, source_type: 'query', sql_query })` (see `src/api/base44Client.js`).

If anything above is unclear or you want additional details (e.g., sample `.env.local`, data file examples, or more file-level references), tell me which area to expand and I will iterate.
