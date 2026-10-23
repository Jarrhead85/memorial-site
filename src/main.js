import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { reveal } from './directives/reveal'
import { loadCatalog } from './stores/catalog'

// Каталог грузится до монтирования: компоненты считают статистику
// и строят списки один раз при setup. Цель сборки — es2020 без
// top-level await, поэтому монтируем по завершении промиса.
loadCatalog().finally(() => {
  createApp(App).use(router).directive('reveal', reveal).mount('#app')

  // PWA: офлайн-режим (только в проде; dev-сервер мешает кэшированию)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* офлайн не критичен */ })
    })
  }
})
