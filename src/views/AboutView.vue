<template>
  <div class="about">
    <h1>About</h1>
    <p>This is a boilerplate SPA using:</p>
    <ul>
      <li><strong>Vite 8</strong> + <strong>Vue 3</strong> + <strong>TypeScript</strong> + <strong>Vue Router</strong></li>
      <li><strong>Cloudflare Pages Functions</strong> for API (<code>functions/api/*.ts</code>)</li>
      <li><strong>pnpm</strong> as package manager</li>
      <li>Path alias <code>@</code> → <code>src</code></li>
    </ul>
    <h2>Project structure</h2>
    <pre>src/            # Vue SPA
functions/      # Cloudflare Pages Functions (API routes)
public/         # Static assets
dist/           # Build output (deployed to Pages)
wrangler.toml   # Cloudflare config
vite.config.ts  # Vite config</pre>
  </div>
</template>

<style scoped>
.about {
  line-height: 1.6;
}
.about ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}
.about pre {
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow: auto;
  font-size: 0.85rem;
}
</style>
