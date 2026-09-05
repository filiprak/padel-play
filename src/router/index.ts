import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/matches/new',
      name: 'match-new',
      component: () => import('@/views/MatchFormView.vue'),
    },
    {
      path: '/matches/:id/edit',
      name: 'match-edit',
      component: () => import('@/views/MatchFormView.vue'),
      props: (route) => ({ matchId: route.params.id }),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

export default router
