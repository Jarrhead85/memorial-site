<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="`Карта: ${title}`"
        @click.self="$emit('close')"
      >
        <div class="modal-container">
          <button class="modal-close" aria-label="Закрыть" @click="$emit('close')">&times;</button>
          <h2 class="modal-title">{{ title }}</h2>
          <div class="modal-map">
            <iframe
              :src="mapUrl"
              title="Карта местоположения памятника"
              width="100%"
              height="100%"
              frameborder="0"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
          <a
            :href="`https://yandex.ru/maps/?pt=${coordinates.lng},${coordinates.lat}&z=15&l=map`"
            target="_blank"
            rel="noopener noreferrer"
            class="modal-link"
          >
            Открыть в Яндекс Картах
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useModalScrollLock } from '../composables/useModalScrollLock'

const props = defineProps({
  visible: { type: Boolean, default: false },
  coordinates: { type: Object, required: true },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close'])

useModalScrollLock(() => props.visible)

// Встроенный виджет Яндекс Карт: обычная страница yandex.ru/maps
// отдаёт X-Frame-Options: DENY и в iframe не открывается.
const mapUrl = computed(() => {
  const { lat, lng } = props.coordinates
  return `https://yandex.ru/map-widget/v1/?pt=${lng},${lat}&z=15&l=map`
})

function onKey(e) {
  if (e.key === 'Escape' && props.visible) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-container {
  position: relative;
  background: var(--color-memorial-card);
  border: 1px solid rgba(201, 168, 76, 0.45);
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

.modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 10, 15, 0.7);
  color: var(--color-memorial-text);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.modal-close:hover {
  border-color: var(--color-memorial-gold);
  color: var(--color-memorial-gold);
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-memorial-text);
  padding: 1.2rem 3.5rem 0.75rem 1.25rem;
  margin: 0;
}

.modal-map {
  width: 100%;
  height: 350px;
  background: var(--color-memorial-dark);
}

.modal-map iframe {
  display: block;
  border: 0;
}

.modal-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 1rem;
  color: var(--color-memorial-gold);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  border-top: 1px solid var(--color-memorial-border);
  transition: background 0.2s ease;
}

.modal-link svg {
  width: 14px;
  height: 14px;
}

.modal-link:hover {
  background: rgba(201, 168, 76, 0.08);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from .modal-container {
  transform: scale(0.92);
}

@media (max-width: 640px) {
  .modal-map {
    height: 250px;
  }

  .modal-title {
    font-size: 1.05rem;
  }
}
</style>
