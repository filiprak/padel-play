<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <nav class="nav">
        <RouterLink to="/" class="logo">Padel Play</RouterLink>
        <div class="nav-links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/about">About</RouterLink>
        </div>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
    <footer class="app-footer">
      <p>Built with Vite + Vue 3 + Cloudflare Pages Functions</p>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  border-bottom: 1px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  background: white;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.logo {
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  color: #111827;
}
.nav-links {
  display: flex;
  gap: 1rem;
}
.nav-links a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
}
.nav-links a.router-link-active {
  color: #2563eb;
}
.app-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
.app-footer {
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
