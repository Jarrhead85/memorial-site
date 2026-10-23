<template>
  <section class="hero">
    <div class="hero-bg" aria-hidden="true">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>
      <div class="hero-grid"></div>
      <ConstellationCanvas />
    </div>
    <div class="hero-content">
      <span class="hero-eyebrow">{{ monuments.length }} памятников &middot; {{ regionsCount }} регионов &middot; одна история</span>
      <h1 class="hero-title">Бессмертная <em>память</em></h1>
      <p class="hero-subtitle">
        Малоизвестные памятники, которые хранят историю России —
        от бронзовой лягушки размером 44&nbsp;мм до мемориалов великой эпохи.
      </p>
      <div class="hero-actions">
        <a href="#catalog" class="hero-btn hero-btn-gold" @click.prevent="scrollToCatalog">
          Смотреть каталог
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
        <router-link to="/map" class="hero-btn hero-btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          Открыть карту
        </router-link>
      </div>
    </div>
    <button class="hero-scroll" aria-label="Прокрутить к каталогу" @click="scrollToCatalog">
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  </section>
</template>

<script setup>
import ConstellationCanvas from './ConstellationCanvas.vue'
import { computed } from 'vue'
import { monuments } from '../stores/catalog'

const regionsCount = computed(() => new Set(monuments.value.map((m) => m.region)).size)

function scrollToCatalog() {
  const el = document.getElementById('catalog')
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 64
    window.scrollTo({ top, behavior: 'smooth' })
  }
}
</script>

<style scoped>
.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100svh;
  min-height: 620px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, #0a0a0f 0%, #0d0d16 55%, #0a0a0f 100%);
  z-index: 0;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}

.hero-glow-1 {
  width: 60vw;
  height: 60vh;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse at center, rgba(201, 168, 76, 0.14) 0%, transparent 65%);
  animation: glowDrift1 14s ease-in-out infinite;
}

.hero-glow-2 {
  width: 34vw;
  height: 30vh;
  right: 8%;
  bottom: 4%;
  background: radial-gradient(ellipse at center, rgba(139, 37, 0, 0.12) 0%, transparent 70%);
  animation: glowDrift2 18s ease-in-out infinite;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(201, 168, 76, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201, 168, 76, 0.035) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse 70% 55% at 50% 45%, #000 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 45%, #000 0%, transparent 75%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 1.5rem;
  max-width: 860px;
  animation: reveal 1.1s ease-out forwards;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-memorial-gold);
  padding: 0.45rem 1.1rem;
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 999px;
  background: rgba(201, 168, 76, 0.06);
  margin-bottom: 1.75rem;
  opacity: 0;
  animation: fadeUp 0.9s ease-out 0.15s forwards;
}

.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(2.6rem, 7.2vw, 5.6rem);
  font-weight: 700;
  line-height: 1.05;
  color: var(--color-memorial-text);
  margin: 0 0 1.25rem 0;
  letter-spacing: 0.01em;
}

.hero-title em {
  font-style: normal;
  background: linear-gradient(115deg, var(--color-memorial-gold) 15%, var(--color-memorial-gold-light) 40%, #f0e2b6 50%, var(--color-memorial-gold-light) 60%, var(--color-memorial-gold) 85%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: goldShimmer 7s ease-in-out infinite;
}

.hero-subtitle {
  font-size: clamp(1rem, 2.2vw, 1.25rem);
  color: var(--color-memorial-muted);
  margin: 0 auto 2.25rem;
  max-width: 620px;
  font-weight: 300;
  line-height: 1.65;
  opacity: 0;
  animation: fadeUp 0.9s ease-out 0.35s forwards;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  flex-wrap: wrap;
  opacity: 0;
  animation: fadeUp 0.9s ease-out 0.55s forwards;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.8rem 1.6rem;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}

.hero-btn svg {
  width: 17px;
  height: 17px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hero-btn:hover svg {
  transform: translateX(4px);
}

.hero-btn-ghost svg {
  transition: transform 0.3s ease;
}

.hero-btn-ghost:hover svg {
  transform: translateY(-2px) scale(1.08);
}

.hero-btn-gold {
  background: linear-gradient(115deg, var(--color-memorial-gold) 0%, var(--color-memorial-gold-light) 100%);
  color: #14100a;
  box-shadow: 0 6px 26px rgba(201, 168, 76, 0.25);
}

.hero-btn-gold:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 34px rgba(201, 168, 76, 0.35);
}

.hero-btn-ghost {
  border-color: rgba(201, 168, 76, 0.4);
  color: var(--color-memorial-gold-light);
  background: rgba(201, 168, 76, 0.04);
}

.hero-btn-ghost:hover {
  background: rgba(201, 168, 76, 0.12);
  transform: translateY(-2px);
}

.hero-scroll {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  opacity: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  animation: fadeUp 1s ease-out 1.1s forwards;
}

.chevron {
  width: 26px;
  height: 26px;
  color: var(--color-memorial-gold);
  animation: bounce 2.2s infinite;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-9px);
  }
  60% {
    transform: translateY(-4px);
  }
}

/* Медленный дрейф свечений фона */
@keyframes glowDrift1 {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-46%, -54%) scale(1.12);
    opacity: 0.82;
  }
}

@keyframes glowDrift2 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translate(-6%, -8%) scale(1.15);
    opacity: 1;
  }
}
</style>
