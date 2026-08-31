<template>
  <div class="not-found">
    <h1>404 — Not Found</h1>
    <p>The page you’re looking for doesn’t exist.</p>
    <RouterLink to="/">Go back home</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 3rem 0;
}
.not-found a {
  color: #2563eb;
}
</style>
