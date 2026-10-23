<template>
  <section class="stats-section" ref="sectionRef">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number" :class="{ visible: visible }">{{ displayedMonuments }}</span>
        <span class="stat-label">памятников</span>
      </div>
      <div class="stat-item">
        <span class="stat-number" :class="{ visible: visible }">{{ displayedCities }}</span>
        <span class="stat-label">городов</span>
      </div>
      <div class="stat-item">
        <span class="stat-number" :class="{ visible: visible }">{{ displayedPhotos }}</span>
        <span class="stat-label">с фотографиями</span>
      </div>
      <div class="stat-item">
        <span class="stat-number stat-text" :class="{ visible: visible }">Вся</span>
        <span class="stat-label">Россия</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { monuments } from '../stores/catalog'

const sectionRef = ref(null)
const visible = ref(false)
const animProgress = ref(0)

// Каталог загружается до монтирования приложения, поэтому срезы можно взять один раз
const targetMonuments = computed(() => monuments.value.length)
const targetCities = computed(() => new Set(monuments.value.map((m) => m.city)).size)
const targetPhotos = computed(() => monuments.value.filter((m) => m.images && m.images.length).length)

const displayedMonuments = computed(() => {
  if (!visible.value) return '0'
  return `${Math.round(targetMonuments.value * animProgress.value)}`
})

const displayedCities = computed(() => {
  if (!visible.value) return '0'
  return `${Math.round(targetCities.value * animProgress.value)}`
})

const displayedPhotos = computed(() => {
  if (!visible.value) return '0'
  return `${Math.round(targetPhotos.value * animProgress.value)}`
})

let observer = null
let animFrame = null

function animateCount() {
  const duration = 1500
  const start = performance.now()

  function tick(now) {
    const elapsed = now - start
    animProgress.value = Math.min(elapsed / duration, 1)
    if (animProgress.value < 1) {
      animFrame = requestAnimationFrame(tick)
    }
  }
  animFrame = requestAnimationFrame(tick)
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        animateCount()
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.3 }
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.stats-section {
  padding: 3.5rem 1.5rem 3rem;
  text-align: center;
}

.stats-grid {
  display: flex;
  justify-content: center;
  gap: 3.5rem;
  flex-wrap: wrap;
  max-width: 1000px;
  margin: 0 auto;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.stat-number {
  font-family: var(--font-heading);
  font-size: 2.75rem;
  font-weight: 700;
  background: linear-gradient(115deg, var(--color-memorial-gold) 10%, var(--color-memorial-gold-light) 60%, var(--color-memorial-gold) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0;
  transform: translateY(15px);
  transition: opacity 0.6s ease, transform 0.6s ease;
  font-variant-numeric: tabular-nums;
}

.stat-number.visible {
  opacity: 1;
  transform: translateY(0);
}

.stat-text {
  font-size: 2rem;
}

.stat-label {
  font-size: 0.82rem;
  color: var(--color-memorial-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
</style>
