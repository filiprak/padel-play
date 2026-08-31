# Padel Play

SPA boilerplate with **Vite + Vue 3 + TypeScript** (frontend) + **Cloudflare Pages Functions** (API) + **pnpm**.

## Stack

- **Frontend**: Vite 8, Vue 3.5, Vue Router 5, TypeScript 5.9, SPA with history mode
- **API**: Cloudflare Pages Functions (`functions/api/*.ts`) — file-based routing (`/api/hello` → `functions/api/hello.ts`)
- **DB**: Turso (libSQL, SQLite at edge) via `@libsql/client/web` + optional `drizzle-orm` (`db/schema.ts`)
- **Deploy**: Cloudflare Pages (static `dist/` + Functions)
- **Package Manager**: pnpm 11.24.0 (enforced via `devEngines` + `packageManager`)

## Project Structure

```
.
├── db/
│   ├── schema.sql        # SQL schema (courts + bookings)
│   └── schema.ts         # Drizzle typed schema (optional)
├── drizzle.config.ts     # drizzle-kit config (turso)
├── functions/
│   ├── lib/turso.ts      # getTursoClient(env) helpers
│   └── api/
│       ├── hello.ts      # GET /api/hello, POST /api/hello
│       ├── health.ts     # GET /api/health
│       ├── echo.ts       # ANY /api/echo
│       ├── db-health.ts  # GET /api/db-health (Turso ping)
│       ├── courts.ts     # GET/POST /api/courts
│       ├── courts/[id].ts # GET/PATCH/DELETE /api/courts/:id
│       ├── bookings.ts   # GET/POST /api/bookings
│       └── bookings/[id].ts # GET/DELETE /api/bookings/:id
├── public/
│   ├── favicon.svg
│   ├── _redirects        # SPA fallback: /* -> /index.html 200
│   └── _headers          # Security headers
├── src/
│   ├── assets/main.css
│   ├── components/HelloWorld.vue
│   ├── router/index.ts
│   ├── views/
│   │   ├── HomeView.vue  # Demo fetch to /api/hello
│   │   ├── AboutView.vue
│   │   └── NotFoundView.vue
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts        # alias @ -> src
├── tsconfig.json         # project references
├── tsconfig.app.json
├── tsconfig.node.json
├── wrangler.toml         # Cloudflare Pages config
└── env.d.ts
```

## Prerequisites

- Node.js 22+
- pnpm 11.24+ (`corepack enable` if needed)

## Getting Started

```bash
pnpm install
pnpm dev              # Vite dev server only (http://localhost:5173), API mocked via proxy if configured
```

### Full Pages + Functions local preview

```bash
pnpm build
pnpm pages:dev        # wrangler pages dev dist — serves SPA + Functions at http://localhost:8788
```

### Other scripts

```bash
pnpm type-check       # vue-tsc --noEmit
pnpm preview          # vite preview of dist/
pnpm deploy           # build + wrangler pages deploy dist
pnpm cf-typegen       # generate cloudflare-env.d.ts from wrangler.toml bindings
pnpm db:init          # create tables + seed sample courts (needs TURSO_DATABASE_URL)
pnpm db:generate      # drizzle-kit generate migrations from db/schema.ts
pnpm db:migrate       # drizzle-kit migrate
```

## Cloudflare Functions

File-based routing under `functions/`:

- `functions/api/hello.ts` → `GET /api/hello` (`onRequestGet`), `POST /api/hello` (`onRequestPost`)
- `functions/api/health.ts` → `GET /api/health`
- `functions/api/echo.ts` → `ANY /api/echo` (`onRequest`)
- `functions/api/db-health.ts` → `GET /api/db-health` (Turso connectivity)
- `functions/api/courts.ts` → `GET /api/courts?limit=&offset=`, `POST /api/courts`
- `functions/api/courts/[id].ts` → `GET/PATCH/DELETE /api/courts/:id`
- `functions/api/bookings.ts` → `GET /api/bookings?court_id=`, `POST /api/bookings` (overlap check)
- `functions/api/bookings/[id].ts` → `GET /api/bookings/:id`, `DELETE /api/bookings/:id` (`?hard=1` for hard delete)

Turso helper: `functions/lib/turso.ts:8` `getTursoClient(env)` uses `@libsql/client/web` (fetch-based for workerd). Env required: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.

## Turso DB

```bash
# 1. Create Turso DB
turso db create padel-play
turso db show padel-play --url
turso db tokens create padel-play

# 2. Configure locally
cp .dev.vars.example .dev.vars   # edit TURSO_*
cp .env.example .env             # for drizzle-kit / scripts

# 3. Init schema + seed
pnpm db:init
# or manually:
turso db shell padel-play < db/schema.sql

# 4. Test locally
pnpm build && pnpm pages:dev
curl http://localhost:8788/api/db-health
curl http://localhost:8788/api/courts
curl -X POST http://localhost:8788/api/courts -H 'Content-Type: application/json' -d '{"name":"Test Court"}'
curl -X POST http://localhost:8788/api/bookings -H 'Content-Type: application/json' -d '{"court_id":1,"player_name":"Ada","starts_at":"2026-09-01T10:00:00Z","ends_at":"2026-09-01T11:30:00Z"}'
```

Schema: `db/schema.sql:1` (`courts`, `bookings` with FK + indexes). Typed version via `db/schema.ts:1` for drizzle. Production: set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in Cloudflare Pages -> Settings -> Variables/Secrets.

Frontend demo: `src/views/HomeView.vue:31` uses `src/composables/useCourts.ts:1` and `src/lib/api.ts:1` to list/create courts and check `db-health`.

Bindings: edit `wrangler.toml` and run `pnpm cf-typegen` to generate types in `cloudflare-env.d.ts`. Access via `context.env.MY_KV` in Functions.

Example `wrangler.toml` binding:

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Env vars for local dev: create `.dev.vars`:

```
MY_VAR=hello
```

## SPA Routing

- Vue Router uses `createWebHistory` (HTML5 history mode).
- `public/_redirects` ensures Cloudflare serves `index.html` for non-file routes: `/* /index.html 200` (API routes excluded).
- `public/_headers` sets `X-Frame-Options`, `Cache-Control`, etc.

## Env Variables

Client-exposed vars must be prefixed with `VITE_`:

```
VITE_API_BASE=/api
```

See `.env.example`.

## Deployment

1. Connect repo to Cloudflare Pages (Framework preset: Vite).
2. Build command: `pnpm build`
3. Output directory: `dist`
4. Functions directory: `functions` (auto-detected)

Or manual:

```bash
pnpm deploy
```

## Path Alias

`@` → `src` (configured in `vite.config.ts` and `tsconfig.app.json`).

```ts
import HelloWorld from '@/components/HelloWorld.vue'
```

## License

ISC
