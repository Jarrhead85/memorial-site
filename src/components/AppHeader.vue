<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { monuments } from '../stores/catalog'

const scrolled = ref(false)
const menuOpen = ref(false)
const route = useRoute()
const router = useRouter()

function goRandom() {
  if (!monuments.value.length) return
  const m = monuments.value[Math.floor(Math.random() * monuments.value.length)]
  menuOpen.value = false
  router.push(`/monument/${m.slug}`)
}

const handleScroll = () => {
  scrolled.value = window.scrollY > 40
}

function onKeydown(e) {
  if (e.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', onKeydown)
})

// При смене страницы мобильное меню закрывается само
watch(() => route.fullPath, () => {
  menuOpen.value = false
})
</script>

<template>
  <header :class="['header', { scrolled }]">
    <div class="header-inner">
      <router-link to="/" class="logo" aria-label="Бессмертная память — на главную">
        <svg class="logo-icon" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 22.5V11.8c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v10.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M8.5 22.5h15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M16 9.5v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span class="logo-text">Бессмертная память</span>
      </router-link>
      <nav class="nav-desktop" aria-label="Основная навигация">
        <router-link to="/" class="nav-link" :class="{ exact: route.path === '/' }">Главная</router-link>
        <router-link to="/map" class="nav-link" :class="{ exact: route.path === '/map' }">Карта</router-link>
        <router-link to="/regions" class="nav-link" :class="{ exact: route.path === '/regions' }">Регионы</router-link>
        <router-link to="/#catalog" class="nav-link" :class="{ exact: route.path === '/' && route.hash === '#catalog' }">Каталог</router-link>
        <router-link to="/#about" class="nav-link" :class="{ exact: route.path === '/' && route.hash === '#about' }">О проекте</router-link>
      </nav>
      <button
        class="random-btn"
        type="button"
        title="Случайный памятник"
        aria-label="Открыть случайный памятник"
        @click="goRandom"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4"/>
          <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>
        </svg>
      </button>
      <button
        class="burger"
        :class="{ active: menuOpen }"
        :aria-expanded="menuOpen"
        aria-label="Открыть меню"
        @click="menuOpen = !menuOpen"
      >
        <span></span><span></span><span></span>
      </button>
    </div>
    <Transition name="slide">
      <nav v-if="menuOpen" class="mobile-menu" aria-label="Мобильная навигация">
        <router-link to="/" class="mobile-link" :class="{ exact: route.path === '/' }">Главная</router-link>
        <router-link to="/map" class="mobile-link" :class="{ exact: route.path === '/map' }">Карта</router-link>
        <router-link to="/regions" class="mobile-link" :class="{ exact: route.path === '/regions' }">Регионы</router-link>
        <router-link to="/#catalog" class="mobile-link" :class="{ exact: route.path === '/' && route.hash === '#catalog' }">Каталог</router-link>
        <router-link to="/#about" class="mobile-link" :class="{ exact: route.path === '/' && route.hash === '#about' }">О проекте</router-link>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
  border-bottom: 1px solid rgba(201, 168, 76, 0.14);
  /* фон постоянный: поверх светлых hero-изображений пункты меню
     должны оставаться читаемыми и до первого скролла */
  background: rgba(10, 10, 15, 0.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.header.scrolled {
  border-bottom-color: rgba(201, 168, 76, 0.22);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}
.header-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--color-memorial-gold);
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  white-space: nowrap;
}
.logo-icon { flex-shrink: 0; }
.nav-desktop { display: flex; gap: 1.75rem; align-items: center; }

.random-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(201, 168, 76, 0.35);
  background: rgba(201, 168, 76, 0.06);
  color: var(--color-memorial-gold-light);
  cursor: pointer;
  transition: background 0.25s ease, transform 0.2s ease, border-color 0.25s ease;
}

.random-btn svg {
  width: 18px;
  height: 18px;
}

.random-btn:hover {
  background: rgba(201, 168, 76, 0.16);
  border-color: var(--color-memorial-gold);
  transform: rotate(12deg) scale(1.06);
}

.random-btn:active {
  transform: scale(0.94);
}
.nav-link {
  text-decoration: none;
  color: var(--color-memorial-muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.25s ease;
  position: relative;
  padding: 0.25rem 0;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
  transition: width 0.3s ease;
}
.nav-link:hover { color: var(--color-memorial-gold-light); }
.nav-link:hover::after,
.nav-link.exact::after { width: 100%; }
.nav-link.exact { color: var(--color-memorial-gold); }
.burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
}
.burger span {
  display: block;
  width: 24px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-memorial-gold);
  transition: all 0.3s ease;
}
.burger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
.burger.active span:nth-child(2) { opacity: 0; }
.burger.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
.mobile-menu {
  position: fixed;
  top: 58px;
  left: 0;
  right: 0;
  background: rgba(10, 10, 15, 0.97);
  backdrop-filter: blur(20px);
  padding: 1.75rem 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border-bottom: 1px solid rgba(201, 168, 76, 0.15);
}
.mobile-link {
  text-decoration: none;
  color: var(--color-memorial-text);
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.35rem 0;
}
.mobile-link.exact { color: var(--color-memorial-gold); }
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
@media (max-width: 768px) {
  .nav-desktop { display: none; }
  .burger { display: flex; }
  .logo-text { font-size: 1.05rem; }
}
</style>
