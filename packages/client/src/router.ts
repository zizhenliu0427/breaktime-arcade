import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    {
      path: '/undercover',
      name: 'undercover',
      component: () => import('./pages/undercover/UndercoverHome.vue'),
    },
    {
      path: '/undercover/pass-and-play',
      name: 'pass-play-setup',
      component: () => import('./pages/undercover/PassPlaySetup.vue'),
    },
    {
      path: '/undercover/pass-and-play/game',
      name: 'pass-play-game',
      component: () => import('./pages/undercover/PassPlayGame.vue'),
    },
    {
      path: '/undercover/how-to-play',
      name: 'how-to-play',
      component: () => import('./pages/undercover/HowToPlay.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
