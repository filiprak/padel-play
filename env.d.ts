/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Cloudflare bindings populated by `wrangler types` -> cloudflare-env.d.ts
// This augments the global CloudflareEnv interface for Pages Functions.
interface CloudflareEnv {
  // Example bindings:
  // MY_KV: KVNamespace
  // MY_D1: D1Database
}
