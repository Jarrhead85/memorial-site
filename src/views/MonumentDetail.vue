<template>
  <main class="detail-page" v-if="monument">
    <div class="detail-top">
      <router-link to="/#catalog" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Назад к каталогу
      </router-link>
    </div>

    <div
      class="hero-image-wrap"
      :class="{ 'is-placeholder': !hasPhoto }"
      role="button"
      tabindex="0"
      v-if="hasPhoto"
      :aria-label="'Открыть фото: ' + monument.title"
      @click="lightboxOpen = true"
      @keydown.enter="lightboxOpen = true"
    >
      <img :src="heroImage" :alt="monument.title" class="hero-image" />
      <div class="hero-overlay"></div>
      <div class="photo-credit" v-if="currentImage" @click.stop>
        <a
          v-if="currentImage.sourceUrl"
          :href="currentImage.sourceUrl"
          target="_blank"
          rel="noopener"
        >Фото: {{ currentImage.source }}</a>
        <span v-else>Фото: {{ currentImage.source }}</span>
      </div>
      <div class="hero-zoom-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        Увеличить
      </div>
    </div>
    <div class="hero-image-wrap is-placeholder" v-else>
      <div class="hero-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="hero-placeholder-icon" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <p>У этого памятника пока нет фотографии</p>
        <span>Загляните в историю ниже — а фото можно добавить самому</span>
      </div>
    </div>

    <div class="gallery-thumbs" v-if="allImages.length > 1">
      <button
        v-for="(img, idx) in allImages"
        :key="idx"
        class="gallery-thumb"
        :class="{ active: idx === galleryIndex }"
        :aria-label="`Фото ${idx + 1} из ${allImages.length}`"
        @click="galleryIndex = idx"
      >
        <img :src="img.url" :alt="`${monument.title} — фото ${idx + 1}`" loading="lazy" />
      </button>
    </div>

    <div class="detail-container">
      <div class="title-row" v-reveal>
        <div class="title-block">
          <h1 class="detail-title">{{ monument.title }}</h1>
          <div class="meta-row">
            <span class="badge">{{ monument.city }}</span>
            <span class="badge">{{ monument.region }}</span>
            <span class="badge badge-year" v-if="monument.year">{{ monument.year }}</span>
            <span class="badge">{{ monument.category }}</span>
          </div>
        </div>
        <div class="title-actions">
          <VoteButton :monument-id="monument.id" :initial-likes="monument.likes" />
          <button
            class="share-btn"
            type="button"
            :title="shared ? 'Ссылка скопирована' : 'Поделиться'"
            :aria-label="shared ? 'Ссылка скопирована' : 'Поделиться'"
            @click="share"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path v-if="!shared" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/>
              <path v-if="!shared" d="M16 6l-4-4-4 4"/><path v-if="!shared" d="M12 2v13"/>
              <path v-else d="M20 6L9 17l-5-5"/>
            </svg>
            <span>{{ shared ? 'Скопировано' : 'Поделиться' }}</span>
          </button>
        </div>
      </div>

      <div class="content-grid" v-reveal="{ delay: 100 }">
        <div class="main-content">
          <div
            v-for="(paragraph, idx) in historyParagraphs"
            :key="idx"
            class="history-paragraph"
          >
            {{ paragraph }}
          </div>
        </div>

        <aside class="sidebar">
          <div class="sidebar-card sidebar-photo-card">
            <h3 class="sidebar-title">Знаете это место?</h3>
            <p class="sidebar-note">
              Пришлите реальное фото памятника — после модерации оно появится в галерее.
            </p>
            <button class="submit-photo-btn" @click="photoVisible = true">
              <span class="submit-photo-plus">+</span> Добавить фото
            </button>
          </div>

          <div class="sidebar-card" v-if="monument.facts && monument.facts.length">
            <h3 class="sidebar-title">Факты</h3>
            <ul class="facts-list">
              <li v-for="(fact, idx) in monument.facts" :key="idx" class="fact-item">
                <span class="fact-bullet"></span>
                <span>{{ fact }}</span>
              </li>
            </ul>
          </div>

          <div class="sidebar-card" v-if="monument.coordinates">
            <h3 class="sidebar-title">Координаты</h3>
            <button class="coords-btn" @click="mapVisible = true">
              <span class="coords-pin"></span>
              <span class="coords-lat">
                {{ monument.coordinates.lat }}&deg;, {{ monument.coordinates.lng }}&deg;
              </span>
              <span class="coords-hint">Показать на карте &rarr;</span>
            </button>
          </div>

          <div class="sidebar-card" v-if="monument.factsSource">
            <h3 class="sidebar-title">Источник истории</h3>
            <a
              v-if="monument.factsSource.url"
              class="facts-source"
              :href="monument.factsSource.url"
              target="_blank"
              rel="noopener"
            >{{ monument.factsSource.label }} &rarr;</a>
            <span v-else class="facts-source">{{ monument.factsSource.label }}</span>
          </div>
        </aside>
      </div>

      <section class="other-section" v-if="otherMonuments.length" v-reveal>
        <h2 class="other-title">Рядом по теме</h2>
        <div class="other-grid">
          <router-link
            v-for="m in otherMonuments"
            :key="m.id"
            :to="`/monument/${m.slug}`"
            class="other-card-link"
          >
            <article class="other-card">
              <div class="other-img-wrap">
                <img v-if="m.images && m.images.length" :src="m.images[0].url" :alt="m.title" class="other-img" loading="lazy" />
                <div v-else class="other-img other-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
              <div class="other-body">
                <h4 class="other-name">{{ m.title }}</h4>
                <span class="other-city">{{ m.city }}</span>
              </div>
            </article>
          </router-link>
        </div>
      </section>

      <MemoryWall :monument-id="monument.id" />
    </div>
  </main>

  <main class="not-found" v-else>
    <div class="not-found-content">
      <h1 class="not-found-title">Памятник не найден</h1>
      <p class="not-found-note">Возможно, страница переехала. Загляните в каталог — там {{ monuments.length }} историй.</p>
      <router-link to="/#catalog" class="back-link not-found-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Вернуться к каталогу
      </router-link>
    </div>
  </main>

  <!-- Лайтбокс для полноэкранного просмотра фото -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="lightboxOpen && hasPhoto"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="`Фото: ${monument.title}`"
        @click.self="lightboxOpen = false"
      >
        <button class="lightbox-close" aria-label="Закрыть" @click="lightboxOpen = false">&times;</button>
        <img :src="heroImage" :alt="monument.title" class="lightbox-img" />
        <div class="lightbox-caption" v-if="currentImage">
          {{ monument.title }}
          <a
            v-if="currentImage.sourceUrl"
            :href="currentImage.sourceUrl"
            target="_blank"
            rel="noopener"
          > — {{ currentImage.source }}</a>
          <span v-else-if="currentImage.source"> — {{ currentImage.source }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>

  <MapModal
    v-if="monument && monument.coordinates"
    :visible="mapVisible"
    :coordinates="monument.coordinates"
    :title="monument.title"
    @close="mapVisible = false"
  />

  <PhotoSubmit
    v-if="monument"
    :visible="photoVisible"
    :monument-id="monument.id"
    :monument-title="monument.title"
    @close="photoVisible = false"
    @submitted="loadApprovedPhotos"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { monuments } from '../stores/catalog'
import VoteButton from '../components/VoteButton.vue'
import MemoryWall from '../components/MemoryWall.vue'
import MapModal from '../components/MapModal.vue'
import PhotoSubmit from '../components/PhotoSubmit.vue'
import { useModalScrollLock } from '../composables/useModalScrollLock'

const route = useRoute()

const mapVisible = ref(false)
const photoVisible = ref(false)
const lightboxOpen = ref(false)
const shared = ref(false)
let shareTimer = null

async function share() {
  const m = monument.value
  if (!m) return
  const url = window.location.href
  const data = { title: `«Бессмертная память» — ${m.title}`, text: `${m.title} — ${m.city}`, url }
  try {
    if (navigator.share) {
      try {
        await navigator.share(data)
        return // пользователь поделился; отмена тоже тихо выходим
      } catch (e) {
        if (e && e.name === 'AbortError') return
        // прочие ошибки share — падаем на копирование
      }
    }
    await navigator.clipboard.writeText(`${data.text}\n${url}`)
  } catch { /* clipboard недоступен */ }
  shared.value = true
  clearTimeout(shareTimer)
  shareTimer = setTimeout(() => { shared.value = false }, 2200)
}
const galleryIndex = ref(0)
const approvedPhotos = ref([])

useModalScrollLock(() => mapVisible.value || photoVisible.value || lightboxOpen.value)

watch(() => route.params.slug, () => {
  galleryIndex.value = 0
  lightboxOpen.value = false
  loadApprovedPhotos()
})

const monument = computed(() => {
  return monuments.value.find(m => m.slug === route.params.slug)
})

const allImages = computed(() => {
  const m = monument.value
  if (!m) return []
  return [...(m.images || []), ...approvedPhotos.value]
})

const hasPhoto = computed(() => allImages.value.length > 0)

const heroImage = computed(() => {
  const m = monument.value
  if (!m) return ''
  return (allImages.value[galleryIndex.value] && allImages.value[galleryIndex.value].url) || ''
})

const currentImage = computed(() => {
  return allImages.value[galleryIndex.value] || null
})

async function loadApprovedPhotos() {
  const m = monument.value
  if (!m) return
  try {
    const res = await fetch(`/api/photos?monumentId=${m.id}`)
    if (!res.ok) throw new Error('bad status')
    const data = await res.json()
    approvedPhotos.value = (data.photos || []).map(p => ({
      url: p.url,
      source: p.source,
      sourceUrl: p.sourceUrl
    }))
    if (galleryIndex.value >= allImages.value.length) galleryIndex.value = 0
  } catch {
    approvedPhotos.value = []
  }
}

onMounted(loadApprovedPhotos)

const historyParagraphs = computed(() => {
  if (!monument.value || !monument.value.fullHistory) return []
  return monument.value.fullHistory.split('\n').filter(p => p.trim())
})

// Соседние памятники: сначала та же категория, затем тот же регион —
// вместо случайного перемешивания
const otherMonuments = computed(() => {
  if (!monument.value) return []
  const self = monument.value
  const others = monuments.value.filter(m => m.id !== self.id)
  const score = (m) => (m.category === self.category ? 2 : 0) + (m.region === self.region ? 1 : 0)
  return [...others]
    .sort((a, b) => score(b) - score(a) || b.likes - a.likes)
    .slice(0, 3)
})

function onKeydown(e) {
  if (e.key === 'Escape') lightboxOpen.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-bottom: 4rem;
}

.detail-top {
  position: absolute;
  top: 74px;
  left: 0;
  right: 0;
  z-index: 5;
  padding: 0 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-memorial-gold);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: rgba(10, 10, 15, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201, 168, 76, 0.3);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.back-link svg {
  width: 14px;
  height: 14px;
}

.back-link:hover {
  background: rgba(201, 168, 76, 0.15);
  border-color: rgba(201, 168, 76, 0.55);
}

.not-found {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 1.5rem 2rem;
}

.not-found-content {
  text-align: center;
}

.not-found-title {
  font-family: var(--font-heading);
  font-size: 2rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.75rem 0;
}

.not-found-note {
  color: var(--color-memorial-muted);
  margin: 0 0 1.5rem 0;
}

.not-found-link {
  background: none;
  border: 1px solid rgba(201, 168, 76, 0.4);
}

.hero-image-wrap {
  position: relative;
  width: 100%;
  height: 56vh;
  min-height: 340px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--color-memorial-deeper);
}

.hero-image-wrap.is-placeholder {
  cursor: default;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Ken Burns: фото «дышит» — медленно отдаляется при открытии страницы */
  animation: kenBurns 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes kenBurns {
  from {
    transform: scale(1.07);
  }
  to {
    transform: scale(1);
  }
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to top, #0a0a0f 8%, transparent 100%);
  pointer-events: none;
}

.photo-credit {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: rgba(10, 10, 15, 0.72);
  backdrop-filter: blur(6px);
  color: var(--color-memorial-gold);
  font-size: 0.75rem;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.25);
  cursor: default;
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-credit a {
  color: var(--color-memorial-gold);
  text-decoration: none;
}

.photo-credit a:hover {
  text-decoration: underline;
}

.hero-zoom-hint {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--color-memorial-text);
  background: rgba(10, 10, 15, 0.55);
  backdrop-filter: blur(6px);
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.hero-zoom-hint svg {
  width: 13px;
  height: 13px;
}

.hero-image-wrap:hover .hero-zoom-hint {
  opacity: 1;
}

.hero-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  text-align: center;
  padding: 1.5rem;
  background:
    radial-gradient(ellipse 70% 55% at 50% 35%, rgba(201, 168, 76, 0.08) 0%, transparent 70%),
    linear-gradient(160deg, #14141d 0%, #0c0c13 100%);
  color: var(--color-memorial-muted);
}

.hero-placeholder p {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  color: var(--color-memorial-text);
  margin: 0;
}

.hero-placeholder span {
  font-size: 0.88rem;
  color: var(--color-memorial-muted);
}

.hero-placeholder-icon {
  width: 44px;
  height: 44px;
  color: #4a4a60;
  margin-bottom: 0.4rem;
}

.gallery-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 1.5rem 0;
  max-width: 1000px;
  margin: 0 auto;
}

.gallery-thumb {
  width: 88px;
  height: 60px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: none;
  transition: border-color 0.25s ease, opacity 0.25s ease;
  opacity: 0.75;
}

.gallery-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-thumb:hover {
  border-color: rgba(201, 168, 76, 0.5);
  opacity: 1;
}

.gallery-thumb.active {
  border-color: var(--color-memorial-gold);
  opacity: 1;
}

.detail-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  margin-top: 1.75rem;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.45);
  background: rgba(10, 10, 15, 0.6);
  color: var(--color-memorial-gold);
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.share-btn svg {
  width: 16px;
  height: 16px;
}

.share-btn:hover {
  background: rgba(201, 168, 76, 0.14);
  border-color: var(--color-memorial-gold);
  transform: translateY(-1px);
}

.share-btn:active {
  transform: translateY(0) scale(0.96);
}

.detail-title {
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  color: var(--color-memorial-text);
  margin: 0 0 0.9rem 0;
  line-height: 1.15;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  background: var(--color-memorial-card);
  border: 1px solid var(--color-memorial-border);
  color: var(--color-memorial-muted);
  padding: 0.32rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.badge-year {
  color: var(--color-memorial-gold);
  border-color: rgba(201, 168, 76, 0.35);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr 320px;
  }
}

.history-paragraph {
  font-size: 1rem;
  color: var(--color-memorial-text);
  line-height: 1.8;
  margin-bottom: 1.25rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-card {
  background: linear-gradient(180deg, var(--color-memorial-card-2) 0%, var(--color-memorial-card) 100%);
  border: 1px solid var(--color-memorial-border);
  border-radius: 14px;
  padding: 1.3rem;
}

.sidebar-photo-card {
  border-color: rgba(201, 168, 76, 0.3);
  background:
    radial-gradient(ellipse 90% 70% at 50% 0%, rgba(201, 168, 76, 0.07) 0%, transparent 70%),
    var(--color-memorial-card);
}

.sidebar-title {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  color: var(--color-memorial-gold);
  margin: 0 0 0.9rem 0;
}

.sidebar-note {
  font-size: 0.85rem;
  color: var(--color-memorial-muted);
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.submit-photo-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
  color: var(--color-memorial-gold);
  border: 1px solid rgba(201, 168, 76, 0.5);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.25s ease, color 0.25s ease, transform 0.15s ease;
}

.submit-photo-btn:hover {
  background: var(--color-memorial-gold);
  color: #14100a;
}

.submit-photo-btn:active {
  transform: scale(0.98);
}

.submit-photo-plus {
  font-size: 1.1rem;
  line-height: 1;
}

.facts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.facts-source {
  color: var(--color-memorial-gold-light);
  font-size: 0.88rem;
  text-decoration: none;
  border-bottom: 1px dashed rgba(201, 168, 76, 0.4);
  padding-bottom: 2px;
}

.facts-source:hover {
  color: var(--color-memorial-gold);
  border-bottom-color: var(--color-memorial-gold);
}

.fact-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  font-size: 0.88rem;
  color: var(--color-memorial-text);
  line-height: 1.5;
}

.fact-item:last-child {
  margin-bottom: 0;
}

.fact-bullet {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  background: var(--color-memorial-gold);
  border-radius: 50%;
  margin-top: 0.45rem;
}

.coords-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid var(--color-memorial-border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  transition: border-color 0.25s ease, background 0.25s ease;
}

.coords-btn:hover {
  border-color: var(--color-memorial-gold);
  background: rgba(201, 168, 76, 0.06);
}

.coords-btn > span {
  display: inline-flex;
  align-items: center;
}

.coords-pin {
  width: 8px;
  height: 8px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #ef4444;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.coords-btn .coords-lat {
  font-size: 0.9rem;
  color: var(--color-memorial-text);
}

.coords-hint {
  font-size: 0.78rem;
  color: var(--color-memorial-gold);
  transition: transform 0.25s ease;
}

.coords-btn:hover .coords-hint {
  transform: translateX(3px);
}

.other-section {
  margin-top: 4rem;
}

.other-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-memorial-gold);
  margin: 0 0 1.5rem 0;
}

.other-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.other-card-link {
  text-decoration: none;
  color: inherit;
}

.other-card {
  background: var(--color-memorial-card);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  transition: border-color 0.3s ease, transform 0.3s ease;
}

.other-card:hover {
  border-color: rgba(201, 168, 76, 0.5);
  transform: translateY(-3px);
}

.other-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-memorial-deeper);
}

.other-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.other-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3d3d52;
}

.other-placeholder svg {
  width: 26px;
  height: 26px;
}

.other-card:hover .other-img {
  transform: scale(1.05);
}

.other-body {
  padding: 0.85rem 1rem;
}

.other-name {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.25rem 0;
}

.other-city {
  font-size: 0.8rem;
  color: var(--color-memorial-muted);
}

/* Лайтбокс */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(5, 5, 8, 0.92);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
}

.lightbox-img {
  max-width: 100%;
  max-height: 86vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7);
  /* лёгкий «наезд» камеры при открытии лайтбокса */
  animation: lightboxIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes lightboxIn {
  from {
    transform: scale(0.93);
    opacity: 0.5;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.lightbox-close {
  position: absolute;
  top: 1.1rem;
  right: 1.3rem;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 10, 15, 0.6);
  color: var(--color-memorial-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.lightbox-close:hover {
  border-color: var(--color-memorial-gold);
  color: var(--color-memorial-gold);
}

.lightbox-caption {
  position: absolute;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-memorial-muted);
  font-size: 0.82rem;
  background: rgba(10, 10, 15, 0.6);
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  white-space: nowrap;
  max-width: 92vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lightbox-caption a {
  color: var(--color-memorial-gold);
  text-decoration: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .detail-top {
    top: 66px;
  }
  .hero-image-wrap {
    height: 42vh;
    min-height: 260px;
  }
}
</style>
