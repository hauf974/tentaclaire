import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/screen' },
    { path: '/screen', component: () => import('../views/ScreenView.vue'), meta: { title: 'Tentaclaire — Écran' } },
    { path: '/play', component: () => import('../views/PlayView.vue'), meta: { title: 'Tentaclaire — Manette' } },
    {
      path: '/admin',
      component: () => import('../views/AdminView.vue'),
      meta: { title: 'Tentaclaire — Administration' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFoundView.vue'),
      meta: { title: 'Tentaclaire — Page introuvable' },
    },
  ],
});

router.afterEach((to) => {
  document.title = typeof to.meta.title === 'string' ? to.meta.title : 'Tentaclaire';
});

export default router;
