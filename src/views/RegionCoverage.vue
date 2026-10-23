<template>
  <main class="regions-page">
    <div class="regions-hero">
      <span class="regions-eyebrow">Статистика</span>
      <h1 class="regions-title">Охваченность по регионам</h1>
      <p class="regions-subtitle">
        Сколько памятников каталога уже имеют реальные фотографии, а какие регионы ждут участников проекта.
      </p>
    </div>

    <div class="regions-summary">
      <div class="summary-card">
        <CountUp :to="total" class="summary-number" />
        <span class="summary-label">памятников</span>
      </div>
      <div class="summary-card">
        <CountUp :to="withPhoto" class="summary-number" />
        <span class="summary-label">с фотографиями</span>
      </div>
      <div class="summary-card">
        <CountUp :to="withoutPhoto" class="summary-number" />
        <span class="summary-label">без фотографий</span>
      </div>
      <div class="summary-card">
        <CountUp :to="regionsCount" class="summary-number" />
        <span class="summary-label">регионов</span>
      </div>
    </div>

    <div class="progress-overall">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: totalPhotoPct + '%' }"></div>
      </div>
      <span class="progress-label">Фото есть у {{ totalPhotoPct }}% памятников каталога</span>
    </div>

    <div class="controls-row">
      <div class="pill-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="pill"
          :class="{ active: sortMode === tab.value }"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <span class="coverage-caption">Кликните регион, чтобы открыть его памятники в каталоге</span>
    </div>

    <div class="regions-grid">
      <router-link
        v-for="(r, idx) in sortedRegions"
        :key="r.region"
        :to="{ path: '/', query: { region: r.region }, hash: '#catalog' }"
        class="region-card"
        :style="{ animationDelay: `${Math.min(idx, 12) * 40}ms` }"
      >
        <div class="region-head">
          <h3 class="region-name">{{ r.region }}</h3>
          <span class="region-pct" :class="{ danger: r.photo === 0 }">{{ r.photoPct }}%</span>
        </div>

        <div class="region-bar">
          <div class="region-bar-track">
            <div class="region-bar-fill" :style="{ width: r.photoPct + '%' }"></div>
          </div>
        </div>

        <div class="region-stats">
          <span class="stat">
            <b class="yes">{{ r.photo }}</b> с фото
          </span>
          <span class="stat">
            <b class="no">{{ r.without }}</b> без фото
          </span>
          <span class="stat cities">
            <b>{{ r.cities }}</b> {{ pluralCities(r.cities) }}
          </span>
        </div>
      </router-link>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { monuments } from '../stores/catalog'
import CountUp from '../components/CountUp.vue'

const tabs = [
  { label: 'Ждут фото', value: 'gap' },
  { label: 'Меньше всего фото', value: 'pct' },
  { label: 'По количеству памятников', value: 'total' },
  { label: 'Все регионы', value: 'alpha' }
]

const sortMode = ref('gap')
const sortOrder = ref('desc')

function switchTab(value) {
  if (sortMode.value === value) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortMode.value = value
    sortOrder.value = 'desc'
  }
}

const total = computed(() => monuments.value.length)

const regionStats = computed(() => {
  const map = {}
  for (const m of monuments.value) {
    if (!map[m.region]) map[m.region] = { region: m.region, total: 0, photo: 0, cities: new Set() }
    map[m.region].total++
    if (m.images && m.images.length) map[m.region].photo++
    map[m.region].cities.add(m.city)
  }
  return Object.values(map).map((r) => ({
    region: r.region,
    total: r.total,
    photo: r.photo,
    without: r.total - r.photo,
    cities: r.cities.size,
    photoPct: Math.round((r.photo / r.total) * 100)
  }))
})

const withPhoto = computed(() => regionStats.value.reduce((s, r) => s + r.photo, 0))
const withoutPhoto = computed(() => regionStats.value.reduce((s, r) => s + r.without, 0))
const regionsCount = computed(() => regionStats.value.length)
const totalPhotoPct = computed(() => Math.round((withPhoto.value / total.value) * 100))

const sortedRegions = computed(() => {
  const list = [...regionStats.value]
  const dir = sortOrder.value === 'desc' ? -1 : 1
  const key = (r) => {
    if (sortMode.value === 'gap') return r.without
    if (sortMode.value === 'pct') return r.photoPct
    if (sortMode.value === 'total') return r.total
    return 0
  }
  if (sortMode.value === 'alpha') {
    list.sort((a, b) => a.region.localeCompare(b.region, 'ru'))
  } else {
    list.sort((a, b) => (key(a) - key(b)) * dir || a.region.localeCompare(b.region, 'ru'))
  }
  return list
})

function pluralCities(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'город'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'города'
  return 'городов'
}
</script>

<style scoped>
.regions-page {
  padding: 8rem 1.5rem 4rem;
  max-width: 1100px;
  margin: 0 auto;
}

.regions-hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.regions-eyebrow {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-memorial-gold);
  margin-bottom: 0.7rem;
}

.regions-title {
  font-family: var(--font-heading);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  color: var(--color-memorial-text);
  margin: 0 0 0.75rem 0;
}

.regions-subtitle {
  color: var(--color-memorial-muted);
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.6;
}

.regions-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--color-memorial-card);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.summary-number {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-memorial-gold);
}

.summary-label {
  color: var(--color-memorial-muted);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-overall {
  background: var(--color-memorial-card);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.progress-track {
  height: 10px;
  background: var(--color-memorial-dark);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8a7235, #c9a84c);
  border-radius: 6px;
  transition: width 0.8s ease;
}

.progress-label {
  display: block;
  margin-top: 0.6rem;
  color: var(--color-memorial-muted);
  font-size: 0.85rem;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.pill-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pill {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  border: 1px solid var(--color-memorial-border);
  background: transparent;
  color: var(--color-memorial-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pill:hover {
  border-color: var(--color-memorial-gold);
  color: var(--color-memorial-gold);
}

.pill.active {
  background: var(--color-memorial-gold);
  border-color: var(--color-memorial-gold);
  color: #14100a;
  font-weight: 600;
}

.coverage-caption {
  color: var(--color-memorial-muted);
  font-size: 0.78rem;
}

.regions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

@media (min-width: 640px) {
  .regions-grid { grid-template-columns: repeat(2, 1fr); }
}

.region-card {
  display: block;
  background: var(--color-memorial-card);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s ease, transform 0.25s ease;
  animation: cardIn 0.4s ease both;
}

.region-card:hover {
  border-color: var(--color-memorial-gold);
  transform: translateY(-2px);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.region-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.7rem;
}

.region-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  color: var(--color-memorial-text);
  margin: 0;
}

.region-pct {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-memorial-gold);
  flex-shrink: 0;
}

.region-pct.danger {
  color: #f87171;
}

.region-bar-track {
  height: 8px;
  background: var(--color-memorial-dark);
  border-radius: 5px;
  overflow: hidden;
}

.region-bar-fill {
  height: 100%;
  background: var(--color-memorial-gold);
  border-radius: 5px;
  transition: width 0.6s ease;
}

.region-stats {
  display: flex;
  gap: 1.2rem;
  margin-top: 0.75rem;
  font-size: 0.82rem;
  color: var(--color-memorial-muted);
}

.stat b {
  font-weight: 600;
}

.stat .yes { color: #4ade80; }
.stat .no { color: #f87171; }
.stat.cities b { color: var(--color-memorial-text); }
</style>