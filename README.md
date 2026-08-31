# Padel Play

SPA boilerplate with **Vite + Vue 3 + TypeScript** (frontend) + **Cloudflare Pages Functions** (API) + **pnpm**.

## Stack

- **Frontend**: Vite 8, Vue 3.5, Vue Router 5, TypeScript 5.9, SPA with history mode
- **API**: Cloudflare Pages Functions (`functions/api/*.ts`) — file-based routing (`/api/health` → `functions/api/health.ts`, `/api/courts` → `functions/api/courts.ts`)
- **DB**: Turso (libSQL, SQLite at edge) via `@libsql/client/web` + `drizzle-orm` (`db/schema.ts:1`, `functions/lib/drizzle.ts:1`)
- **REST**: Reusable `RestEndpoint` class (`functions/lib/rest.ts:33`) — extend to implement endpoints
- **Deploy**: Cloudflare Pages (static `dist/` + Functions)
- **Package Manager**: pnpm 11.24.0 (enforced via `devEngines` + `packageManager`)

## Project Structure

```
.
├── db/
│   ├── schema.sql        # SQL schema (courts + users)
│   └── schema.ts         # Drizzle typed schema (optional)
├── drizzle.config.ts     # drizzle-kit config (turso)
├── functions/
│   ├── lib/turso.ts      # getTursoClient(env) helpers
│   ├── lib/rest.ts       # RestEndpoint base class
│   ├── lib/drizzle.ts    # getDb(env) → drizzle-orm with db/schema
│   └── api/
│       ├── health.ts     # GET /api/health (simple)
│       ├── courts.ts     # GET/POST /api/courts (RestEndpoint + drizzle-orm)
│       ├── courts/[id].ts # GET/PATCH/DELETE /api/courts/:id (RestEndpoint + drizzle-orm)
│       ├── users.ts      # GET/POST /api/users (RestEndpoint + drizzle-orm)
│       └── users/[id].ts # GET/PATCH/DELETE /api/users/:id (RestEndpoint + drizzle-orm)
├── public/
│   ├── favicon.svg
│   ├── _redirects        # SPA fallback: /* -> /index.html 200
│   └── _headers          # Security headers
├── src/
│   ├── assets/main.css
│   ├── components/HelloWorld.vue
│   ├── router/index.ts
│   ├── views/
│   │   ├── HomeView.vue  # Demo fetch to /api/health + /api/courts
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

File-based routing under `functions/` (all except `health` extend `RestEndpoint`):

- `functions/api/health.ts` → `GET /api/health` (plain handler)
- `functions/api/courts.ts` → `GET /api/courts?limit=&offset=`, `POST /api/courts` (RestEndpoint + drizzle-orm)
- `functions/api/courts/[id].ts` → `GET/PATCH/DELETE /api/courts/:id` (RestEndpoint + drizzle-orm)
- `functions/api/users.ts` → `GET /api/users?q=&limit=&offset=` + `POST /api/users` (RestEndpoint + drizzle-orm)
- `functions/api/users/[id].ts` → `GET/PATCH/PUT/DELETE /api/users/:id` (RestEndpoint + drizzle-orm)

Turso helper: `functions/lib/turso.ts:13` `getTursoClient(env)` uses `@libsql/client/web` (fetch-based for workerd). Env required: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Wrapped as `getDb(env)` in `functions/lib/drizzle.ts:1` → `drizzle(client, {schema})`.

### REST Framework (`functions/lib/rest.ts:33`)

Reusable base class to avoid boilerplate:

```ts
import { RestEndpoint, type RestContext } from '../lib/rest'
import { users } from '../../db/schema'
import { asc } from 'drizzle-orm'

class UsersEndpoint extends RestEndpoint {
  async get(ctx: RestContext) {
    const { limit, offset } = this.pagination(ctx)
    const db = this.db(ctx)
    const rows = await db.select().from(users).orderBy(asc(users.id)).limit(limit).offset(offset)
    return this.json({ users: rows })
  }
  async post(ctx: RestContext) {
    const body = await this.parseJson<{ name: string; email: string }>(ctx)
    const err = this.requireFields(body, ['name','email'])
    if (err) return this.error(err, 400)
    const [user] = await this.db(ctx).insert(users).values(body as never).returning()
    return this.json({ user }, { status: 201 })
  }
}
const ep = new UsersEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
```

Helpers: `this.json`/`this.error`, `this.client(ctx)` (`@libsql/client/web`), `this.db(ctx)` (`drizzle-orm/libsql/web` typed with `db/schema.ts`), `this.parseJson`, `this.query`/`this.param`/`this.numParam`, `this.pagination`, `this.requireFields`, `before()` hook, `endpoint()` factory.

### Drizzle ORM (`db/schema.ts:1`, `functions/lib/drizzle.ts:1`)

Schemas already define `courts` + `users` (`sqliteTable` with `drizzle-orm/sqlite-core`). `getDb(env)` wraps `getTursoClient` → `drizzle(client, {schema})`:

```ts
import { getDb } from './drizzle'
import { users, courts } from '../../db/schema'
import { eq, like, or, asc, count } from 'drizzle-orm'

const db = getDb(env)
await db.select().from(users).where(eq(users.id, 1))
await db.select().from(users).where(or(like(users.name, '%ada%'), like(users.email, '%ada%')))
await db.insert(users).values({ name: 'Ada', email: 'ada@example.com', role: 'player' }).returning()
await db.update(users).set({ name: 'Ada L.' }).where(eq(users.id, 1)).returning()
await db.delete(users).where(eq(users.id, 1)).returning()
await db.select({ total: count() }).from(users)
```

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
curl http://localhost:8788/api/health
curl http://localhost:8788/api/courts
curl -X POST http://localhost:8788/api/courts -H 'Content-Type: application/json' -d '{"name":"Test Court"}'
curl http://localhost:8788/api/users
curl -X POST http://localhost:8788/api/users -H 'Content-Type: application/json' -d '{"name":"Ada","email":"ada@example.com"}'
curl http://localhost:8788/api/users/1
```

Schema: `db/schema.sql:1` (`courts` + `users` with indexes). Typed version via `db/schema.ts:1` for drizzle. Production: set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in Cloudflare Pages -> Settings -> Variables/Secrets.

Frontend demo: `src/views/HomeView.vue:1` uses `src/composables/useCourts.ts:1` and `src/lib/api.ts:1` to list/create courts and check `/api/health`.

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
