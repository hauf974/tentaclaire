import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/play' },
    { path: '/screen', component: () => import('../views/ScreenView.vue') },
    { path: '/play', component: () => import('../views/PlayView.vue') },
    { path: '/admin', component: () => import('../views/AdminView.vue') },
  ],
});

export default router;
