<script setup lang="ts">
defineProps<{
  msg: string
}>()

const count = defineModel<number>('count', { default: 0 })
</script>

<template>
  <div class="card">
    <h2>{{ msg }}</h2>
    <p>Edit <code>src/components/HelloWorld.vue</code> to test HMR.</p>
    <button type="button" @click="count++">count is {{ count }}</button>
    <p class="hint">Check <code>src/router</code> and <code>functions/api</code> for examples.</p>
  </div>
</template>

<style scoped>
.card {
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
}
.card h2 {
  margin-bottom: 0.5rem;
}
.card button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: none;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.hint {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
