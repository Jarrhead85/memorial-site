<template>
  <main class="home">
    <HeroSection />
    <StatsSection />

    <section id="catalog" class="catalog-section">
      <div class="catalog-container">
        <div class="catalog-head-row">
          <div>
            <span class="section-eyebrow">Каталог</span>
            <h2 class="catalog-title">{{ allMonuments.length }} историй по всей стране</h2>
          </div>
          <button class="suggest-btn" type="button" @click="suggestOpen = true">
            <span class="suggest-plus">+</span> Предложить памятник
          </button>
        </div>

        <div class="catalog-controls">
          <div class="search-box">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              v-model="query"
              type="search"
              class="search-input"
              placeholder="Поиск: название, город, регион…"
              aria-label="Поиск по каталогу"
            />
            <button
              v-if="query"
              class="search-clear"
              aria-label="Очистить поиск"
              @click="query = ''"
            >&times;</button>
          </div>

          <select v-model="selectedRegion" class="control-select" aria-label="Фильтр по региону">
            <option value="Все">Все регионы</option>
            <option v-for="r in allRegions" :key="r" :value="r">{{ r }}</option>
          </select>

          <select v-model="sortBy" class="control-select" aria-label="Сортировка">
            <option value="likes">По популярности</option>
            <option value="title">По названию</option>
            <option value="photo">Сначала с фото</option>
          </select>

          <label class="photo-check">
            <input v-model="onlyWithPhoto" type="checkbox" />
            Только с фото
          </label>
        </div>

        <FilterBar
          :categories="allCategories"
          v-model="activeCategory"
        />

        <div class="result-row">
          <p class="result-count" aria-live="polite">
            Показано <b>{{ visibleMonuments.length }}</b> из {{ filteredMonuments.length }}
          </p>
          <button
            v-if="hasActiveFilters"
            class="reset-filters"
            @click="resetFilters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Сбросить фильтры
          </button>
        </div>

        <div v-if="filteredMonuments.length" class="monuments-grid">
          <MonumentCard
            v-for="(m, i) in visibleMonuments"
            :key="m.id"
            v-reveal="{ delay: (i % 6) * 65 }"
            :monument="m"
          />
        </div>

        <div v-if="filteredMonuments.length > visibleMonuments.length" class="load-more-row">
          <button class="load-more" @click="showMore">
            Показать ещё
            <span class="load-more-count">
              {{ Math.min(PAGE_SIZE, filteredMonuments.length - visibleMonuments.length) }} из
              {{ filteredMonuments.length - visibleMonuments.length }}
            </span>
          </button>
        </div>

        <div v-if="filteredMonuments.length === 0" class="empty-result">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" class="empty-icon" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <p class="empty-title">Ничего не найдено</p>
          <p class="empty-note">Попробуйте изменить запрос или сбросить фильтры</p>
          <button class="reset-filters" @click="resetFilters">Сбросить всё</button>
        </div>
      </div>
    </section>

    <section class="leaderboard-section">
      <div class="catalog-container">
        <LeaderboardSection />
      </div>
    </section>

    <AboutSection />

    <MonumentSuggest :open="suggestOpen" @close="suggestOpen = false" />
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeroSection from '../components/HeroSection.vue'
import StatsSection from '../components/StatsSection.vue'
import FilterBar from '../components/FilterBar.vue'
import MonumentCard from '../components/MonumentCard.vue'
import AboutSection from '../components/AboutSection.vue'
import LeaderboardSection from '../components/LeaderboardSection.vue'
import MonumentSuggest from '../components/MonumentSuggest.vue'
import { monuments } from '../stores/catalog'
import { useVoting } from '../composables/useVoting'

const route = useRoute()
const router = useRouter()
const { getLikes } = useVoting()

const suggestOpen = ref(false)

const activeCategory = ref('Все')
const selectedRegion = ref('Все')
const query = ref('')
const sortBy = ref('likes')
const onlyWithPhoto = ref(false)

const allMonuments = computed(() => monuments.value)

const allCategories = computed(() => {
  const cats = new Set(monuments.value.map(m => m.category))
  return [...cats]
})

const allRegions = computed(() => {
  const regs = new Set(monuments.value.map(m => m.region))
  return [...regs].sort((a, b) => a.localeCompare(b, 'ru'))
})

// Регион из ссылки (/regions ведёт сюда с ?region=…).
// Если параметра нет — фильтр сбрасывается, а не «залипает».
watch(
  () => route.query.region,
  (region) => {
    if (region && allRegions.value.includes(region)) {
      selectedRegion.value = region
    } else if (!region) {
      selectedRegion.value = 'Все'
    }
  },
  { immediate: true }
)

const hasActiveFilters = computed(
  () =>
    activeCategory.value !== 'Все' ||
    selectedRegion.value !== 'Все' ||
    onlyWithPhoto.value ||
    query.value.trim() !== ''
)

// Постраничный показ: когда каталог вырастет до 1500+ записей,
// рендерить всё разом станет тяжело. Любое изменение фильтров
// сбрасывает страницу.
const PAGE_SIZE = 60
const visibleCount = ref(PAGE_SIZE)
watch(
  [activeCategory, selectedRegion, onlyWithPhoto, query, sortBy],
  () => {
    visibleCount.value = PAGE_SIZE
  }
)
const visibleMonuments = computed(() => filteredMonuments.value.slice(0, visibleCount.value))
function showMore() {
  visibleCount.value += PAGE_SIZE
}

function resetFilters() {
  activeCategory.value = 'Все'
  selectedRegion.value = 'Все'
  onlyWithPhoto.value = false
  query.value = ''
  sortBy.value = 'likes'
  if (route.query.region) {
    // убираем ?region из адреса, чтобы фильтр не вернулся при перезагрузке
    router.replace({ query: {} })
  }
}

const filteredMonuments = computed(() => {
  const q = query.value.trim().toLowerCase()
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е')
  const result = monuments.value.filter(m => {
    if (activeCategory.value !== 'Все' && m.category !== activeCategory.value) return false
    if (selectedRegion.value !== 'Все' && m.region !== selectedRegion.value) return false
    if (onlyWithPhoto.value && !(m.images && m.images.length)) return false
    if (q) {
      const haystack = norm([m.title, m.city, m.region, m.category, m.shortDescription, String(m.year)]
        .join(' '))
      if (!haystack.includes(norm(q))) return false
    }
    return true
  })

  // m.likes остаётся «чистой» базой каталога — VoteButton сам прибавит
  // личные лайки. Для сортировки считается отдельное поле totalLikes,
  // иначе личные лайки учитывались бы дважды.
  const withLikes = result.map(m => ({
    ...m,
    totalLikes: m.likes + getLikes(m.id)
  }))

  if (sortBy.value === 'title') {
    withLikes.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  } else if (sortBy.value === 'photo') {
    const hasPhoto = m => (m.images && m.images.length ? 0 : 1)
    withLikes.sort((a, b) => hasPhoto(a) - hasPhoto(b) || b.totalLikes - a.totalLikes)
  } else {
    withLikes.sort((a, b) => b.totalLikes - a.totalLikes)
  }
  return withLikes
})
</script>

<style scoped>
.home {
  min-height: 100vh;
}

.catalog-section {
  padding: 4.5rem 1.5rem 3rem;
  scroll-margin-top: 64px;
}

.leaderboard-section {
  padding: 0 1.5rem 4.5rem;
}

.catalog-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-eyebrow {
  display: block;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-memorial-gold);
  margin-bottom: 0.75rem;
}

.catalog-title {
  font-family: var(--font-heading);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  color: var(--color-memorial-text);
  text-align: center;
  margin: 0 0 2.25rem 0;
}

.catalog-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.1rem;
}

.search-box {
  position: relative;
  flex: 1 1 300px;
  max-width: 460px;
}

.search-icon {
  position: absolute;
  left: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-memorial-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.7rem 2.6rem 0.7rem 2.6rem;
  border-radius: 999px;
  border: 1px solid var(--color-memorial-border);
  background: var(--color-memorial-card);
  color: var(--color-memorial-text);
  font-family: var(--font-body);
  font-size: 0.9rem;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-memorial-gold);
  box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
}

.search-input::placeholder {
  color: var(--color-memorial-muted);
}

.search-clear {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-memorial-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}

.search-clear:hover {
  background: rgba(201, 168, 76, 0.2);
  color: var(--color-memorial-gold-light);
}

.control-select {
  padding: 0.62rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--color-memorial-border);
  background: var(--color-memorial-card);
  color: var(--color-memorial-text);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.25s ease;
}

.control-select:focus {
  outline: none;
  border-color: var(--color-memorial-gold);
}

.photo-check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--color-memorial-muted);
  font-size: 0.85rem;
  cursor: pointer;
  user-select: none;
}

.photo-check input {
  accent-color: var(--color-memorial-gold);
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.result-count {
  color: var(--color-memorial-muted);
  font-size: 0.85rem;
  margin: 1rem 0 0;
}

.result-count b {
  color: var(--color-memorial-gold);
}

.reset-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.4);
  background: transparent;
  color: var(--color-memorial-gold);
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.reset-filters svg {
  width: 12px;
  height: 12px;
}

.reset-filters:hover {
  background: rgba(201, 168, 76, 0.12);
  color: var(--color-memorial-gold-light);
}

.monuments-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1.75rem;
}

@media (min-width: 640px) {
  .monuments-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .monuments-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.empty-result {
  text-align: center;
  padding: 4rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  width: 44px;
  height: 44px;
  color: #3d3d52;
  margin-bottom: 0.5rem;
}

.catalog-head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.4rem;
}

.suggest-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.3rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.45);
  background: rgba(201, 168, 76, 0.06);
  color: var(--color-memorial-gold-light);
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease, transform 0.2s ease, border-color 0.25s ease;
  white-space: nowrap;
}

.suggest-btn:hover {
  background: rgba(201, 168, 76, 0.16);
  border-color: var(--color-memorial-gold);
  transform: translateY(-1px);
}

.suggest-plus { font-size: 1.05rem; line-height: 1; }

.empty-title {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--color-memorial-text);
}

.empty-note {
  color: var(--color-memorial-muted);
  font-size: 0.9rem;
}

.load-more-row {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.load-more {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.8rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.45);
  background: rgba(201, 168, 76, 0.06);
  color: var(--color-memorial-gold-light);
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease, transform 0.2s ease;
}

.load-more:hover {
  background: rgba(201, 168, 76, 0.14);
  border-color: var(--color-memorial-gold);
  transform: translateY(-2px);
}

.load-more-count {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-memorial-muted);
}
</style>
