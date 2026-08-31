# Padel Play

SPA boilerplate with **Vite + Vue 3 + TypeScript** (frontend) + **Cloudflare Pages Functions** (API) + **pnpm**.

## Stack

- **Frontend**: Vite 8, Vue 3.5, Vue Router 5, TypeScript 5.9, SPA with history mode
- **API**: Cloudflare Pages Functions (`functions/api/*.ts`) — file-based routing (`/api/hello` → `functions/api/hello.ts`)
- **Deploy**: Cloudflare Pages (static `dist/` + Functions)
- **Package Manager**: pnpm 11.24.0 (enforced via `devEngines` + `packageManager`)

## Project Structure

```
.
├── functions/
│   └── api/
│       ├── hello.ts      # GET /api/hello, POST /api/hello
│       ├── health.ts     # GET /api/health
│       └── echo.ts       # ANY /api/echo
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
```

## Cloudflare Functions

File-based routing under `functions/`:

- `functions/api/hello.ts` → `GET /api/hello` (`onRequestGet`), `POST /api/hello` (`onRequestPost`)
- `functions/api/health.ts` → `GET /api/health`
- `functions/api/echo.ts` → `ANY /api/echo` (`onRequest`)

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
