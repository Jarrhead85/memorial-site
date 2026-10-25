<template>
  <article class="card">
    <!-- stretched-link: одна ссылка на всю карточку, интерактивные дети выше по z-index -->
    <router-link
      :to="`/monument/${monument.slug}`"
      class="card-stretch"
      :aria-label="monument.title"
    ></router-link>
    <div class="card-image-wrap">
      <img
        v-if="hasPhoto"
        :src="heroUrl"
        :alt="monument.title"
        class="card-image"
        loading="lazy"
        decoding="async"
        @error="imgFailed = true"
      />
      <div v-else class="card-placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="placeholder-text">Фото скоро появится</span>
      </div>
      <span class="card-category">{{ monument.category }}</span>
      <span class="card-photo-source" v-if="hasPhoto">
        Фото: {{ monument.images[0].source }}
      </span>
      <div class="card-vote">
        <VoteButton :monument-id="monument.id" :initial-likes="monument.likes" />
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ monument.title }}</h3>
      <div class="card-meta">
        <svg class="meta-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span class="card-city">{{ monument.city }}</span>
        <template v-if="monument.year">
          <span class="card-sep">&middot;</span>
          <span class="card-year">{{ monument.year }}</span>
        </template>
      </div>
      <p class="card-desc">{{ monument.shortDescription }}</p>
      <span class="card-more">Читать историю
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import VoteButton from './VoteButton.vue'

const props = defineProps({
  monument: {
    type: Object,
    required: true
  }
})

const imgFailed = ref(false)
// Фото считается настоящим, только если есть запись в images
// (раньше сюда попадали случайные стоковые картинки-заглушки)
const hasPhoto = computed(
  () => !imgFailed.value && !!(props.monument.images && props.monument.images.length)
)
// Единственное место хранения ссылки на фото — images[0]; отдельного поля image больше нет
const heroUrl = computed(() => props.monument.images[0].url)
</script>

<style scoped>
.card {
  position: relative;
  background: linear-gradient(180deg, var(--color-memorial-card-2) 0%, var(--color-memorial-card) 100%);
  border: 1px solid var(--color-memorial-border);
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}

/* stretched-link: покрывает карточку целиком; интерактивные элементы
   (кнопка лайка) поднимаются выше по z-index и кликаются независимо */
.card-stretch {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 16px;
}

.card:hover {
  border-color: rgba(201, 168, 76, 0.55);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 0 24px rgba(201, 168, 76, 0.08);
  transform: translateY(-4px);
}

.card-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--color-memorial-deeper);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover .card-image {
  transform: scale(1.06);
}

/* Затемнение снизу, чтобы бейджи читались на любом фото */
.card-image-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10, 10, 15, 0.55) 0%, transparent 45%);
  pointer-events: none;
}

.card-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background:
    radial-gradient(ellipse 80% 60% at 50% 30%, rgba(201, 168, 76, 0.07) 0%, transparent 70%),
    linear-gradient(160deg, #17171f 0%, #101018 100%);
  color: #55556a;
}

.placeholder-icon {
  width: 34px;
  height: 34px;
  opacity: 0.8;
}

.placeholder-text {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #55556a;
}

.card-category {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 1;
  background: rgba(10, 10, 15, 0.78);
  backdrop-filter: blur(6px);
  color: var(--color-memorial-gold-light);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.35);
}

.card-photo-source {
  position: absolute;
  bottom: 0.6rem;
  left: 0.75rem;
  z-index: 1;
  background: rgba(10, 10, 15, 0.72);
  backdrop-filter: blur(6px);
  color: rgba(232, 212, 139, 0.85);
  font-size: 0.66rem;
  padding: 0.22rem 0.55rem;
  border-radius: 6px;
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-vote {
  position: absolute;
  bottom: 0.6rem;
  right: 0.6rem;
  z-index: 2;
}

.card-body {
  padding: 1.2rem 1.25rem 1.3rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-family: var(--font-heading);
  font-size: 1.18rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.7rem 0;
}

.meta-pin {
  width: 13px;
  height: 13px;
  color: var(--color-memorial-gold-dim);
  flex-shrink: 0;
}

.card-city,
.card-year {
  font-size: 0.8rem;
  color: var(--color-memorial-muted);
}

.card-sep {
  color: var(--color-memorial-muted);
  font-size: 0.75rem;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--color-memorial-muted);
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-more {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  color: var(--color-memorial-gold);
  font-size: 0.82rem;
  font-weight: 600;
  transition: gap 0.25s ease, color 0.25s ease;
}

.card-more svg {
  width: 14px;
  height: 14px;
}

.card:hover .card-more {
  gap: 0.65rem;
  color: var(--color-memorial-gold-light);
}
</style>
