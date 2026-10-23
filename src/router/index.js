import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/monument/:slug', name: 'monument', component: () => import('../views/MonumentDetail.vue') },
  { path: '/map', name: 'map', component: () => import('../views/CountryMap.vue') },
  { path: '/regions', name: 'regions', component: () => import('../views/RegionCoverage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Кнопки «назад/вперёд» возвращают прежнюю прокрутку
    if (savedPosition) return savedPosition
    // Переходы к якорям (#catalog, #about) — с учётом фиксированной шапки
    if (to.hash) {
      return { el: to.hash, top: 76, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

export default router
