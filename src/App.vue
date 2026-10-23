<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'

const showTop = ref(false)
const onScroll = () => { showTop.value = window.scrollY > 700 }
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="app-root">
    <div class="particles" aria-hidden="true">
      <span v-for="i in 24" :key="i" class="particle" :style="{
        left: Math.random() * 100 + '%',
        animationDuration: (12 + Math.random() * 14) + 's',
        animationDelay: (Math.random() * 12) + 's',
        width: (2 + Math.random() * 2.5) + 'px',
        height: (2 + Math.random() * 2.5) + 'px',
        opacity: 0.15 + Math.random() * 0.3
      }"></span>
    </div>
    <AppHeader />
    <main>
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    <Transition name="fade">
      <button
        v-if="showTop"
        class="to-top"
        type="button"
        aria-label="Наверх"
        title="Наверх"
        @click="toTop"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </Transition>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  position: relative;
}

.to-top {
  position: fixed;
  right: 1.4rem;
  bottom: 1.6rem;
  z-index: 90;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(201, 168, 76, 0.4);
  background: rgba(10, 10, 15, 0.75);
  backdrop-filter: blur(8px);
  color: var(--color-memorial-gold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s ease, transform 0.2s ease;
}

.to-top svg {
  width: 20px;
  height: 20px;
}

.to-top:hover {
  background: rgba(201, 168, 76, 0.18);
  transform: translateY(-3px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  background: radial-gradient(circle, #c9a84c 0%, transparent 70%);
  border-radius: 50%;
  animation: floatUp linear infinite;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.08;
  }
  100% {
    transform: translateY(-100vh) translateX(30px) scale(0.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .particle {
    display: none;
  }
}
</style>
