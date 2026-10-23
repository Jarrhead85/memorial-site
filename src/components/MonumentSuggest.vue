<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="ms-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Предложить памятник"
        @click.self="$emit('close')"
      >
        <div class="ms-modal">
          <button class="ms-close" aria-label="Закрыть" @click="$emit('close')">&times;</button>
          <h3 class="ms-title">Предложить памятник</h3>
          <p class="ms-note">
            Знаете памятник, которого нет в каталоге? Заполните форму — после проверки модератором он появится на сайте.
          </p>

          <form v-if="!sent" class="ms-form" @submit.prevent="submit">
            <label class="ms-label">
              Название памятника *
              <input v-model="f.title" class="ms-input" type="text" maxlength="120" required placeholder="Например: Памятник фонарщику" />
            </label>

            <div class="ms-row">
              <label class="ms-label">
                Город / село *
                <input v-model="f.city" class="ms-input" type="text" maxlength="80" required placeholder="Тверь" />
              </label>
              <label class="ms-label">
                Регион
                <input v-model="f.region" class="ms-input" type="text" maxlength="80" list="ms-regions" placeholder="Тверская область" />
                <datalist id="ms-regions">
                  <option v-for="r in regions" :key="r" :value="r" />
                </datalist>
              </label>
            </div>

            <div class="ms-row">
              <label class="ms-label">
                Год установки
                <input v-model.number="f.year" class="ms-input" type="number" min="1500" max="2100" placeholder="1995" />
              </label>
              <label class="ms-label">
                Категория
                <select v-model="f.category" class="ms-input">
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
            </div>

            <label class="ms-label">
              Описание *
              <textarea
                v-model="f.description"
                class="ms-textarea"
                rows="4"
                maxlength="2000"
                required
                placeholder="История памятника: кому и почему поставлен, чем известен… (от 50 символов)"
              ></textarea>
              <span class="ms-counter" :class="{ over: f.description.length > 1900 }">{{ f.description.length }}/2000</span>
            </label>

            <label class="ms-label">
              Ссылка на фотографию *
              <input v-model="f.photoUrl" class="ms-input" type="url" maxlength="2048" required placeholder="https://…" />
              <span class="ms-hint">Прямая ссылка на фото (правой кнопкой на картинке → «Копировать адрес картинки»)</span>
            </label>

            <label class="ms-label">
              Ссылка на источник
              <input v-model="f.sourceUrl" class="ms-input" type="url" maxlength="2048" placeholder="https://… (новостная статья, блог)" />
            </label>

            <div class="ms-coords">
              <label class="ms-label ms-coord">
                Широта *
                <input v-model.number="f.lat" class="ms-input" type="number" step="0.0001" required placeholder="56.8587" />
              </label>
              <label class="ms-label ms-coord">
                Долгота *
                <input v-model.number="f.lng" class="ms-input" type="number" step="0.0001" required placeholder="35.9176" />
              </label>
              <button class="ms-geo" type="button" @click="locate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {{ geoBusy ? 'Определяем…' : 'Я на месте' }}
              </button>
            </div>
            <span class="ms-hint">Координаты: щёлкните правой кнопкой по нужной точке в Яндекс/Google Картах — они скопируются (первое число — широта)</span>

            <label class="ms-label">
              Ваше имя
              <input v-model="f.authorName" class="ms-input" type="text" maxlength="60" placeholder="Необязательно" />
            </label>

            <div v-if="dupWarn" class="ms-dup" role="alert">
              <p>
                <b>Похоже, это уже есть в каталоге:</b>
                «{{ dupWarn.title }}» ({{ dupWarn.city }}).
              </p>
              <div class="ms-dup-actions">
                <router-link :to="`/monument/${dupWarn.slug}`" class="ms-dup-link" @click="$emit('close')">Открыть существующий →</router-link>
                <button class="ms-dup-anyway" type="button" @click="submit(true)">Всё равно отправить</button>
              </div>
            </div>
            <div v-if="error && !dupWarn" class="ms-error" role="alert">{{ error }}</div>

            <div class="ms-actions">
              <span class="ms-note-small">Публикуется после проверки модератором</span>
              <button class="ms-submit" type="submit" :disabled="busy">
                {{ busy ? 'Отправляем…' : 'Отправить на модерацию' }}
              </button>
            </div>
          </form>

          <div v-else class="ms-sent" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Спасибо! Памятник отправлен на модерацию — после проверки он появится в каталоге.
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { monuments } from '../stores/catalog'
import { useModalScrollLock } from '../composables/useModalScrollLock'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

useModalScrollLock(() => props.open)

const regions = computed(() => [...new Set(monuments.value.map((m) => m.region))].sort((a, b) => a.localeCompare(b, 'ru')))
const categories = ['Необычные', 'Исторические', 'Гастрономические', 'Архитектурные', 'Мини-скульптуры']

const f = reactive({
  title: '', city: '', region: '', year: null, category: 'Необычные',
  description: '', photoUrl: '', sourceUrl: '', lat: null, lng: null, authorName: ''
})
const busy = ref(false)
const sent = ref(false)
const error = ref('')
const dupWarn = ref(null)
const geoBusy = ref(false)

watch(() => props.open, (v) => {
  if (v) { sent.value = false; dupWarn.value = null; error.value = '' }
})

function onKey(e) { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

function locate() {
  if (!navigator.geolocation) return
  geoBusy.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      f.lat = Number(pos.coords.latitude.toFixed(6))
      f.lng = Number(pos.coords.longitude.toFixed(6))
      geoBusy.value = false
    },
    () => { geoBusy.value = false },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

async function submit(force = false) {
  error.value = ''
  dupWarn.value = null
  busy.value = true
  try {
    const res = await fetch('/api/monuments/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, force: force === true })
    })
    const d = await res.json().catch(() => ({}))
    if (res.status === 409 && d.duplicateOf) {
      dupWarn.value = d.duplicateOf
      return
    }
    if (!res.ok) throw new Error(d.error || 'Не получилось отправить')
    sent.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.ms-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(5, 5, 8, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow-y: auto;
}

.ms-modal {
  position: relative;
  width: 100%;
  max-width: 620px;
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  background: #12121b;
  border: 1px solid var(--color-memorial-border);
  border-radius: 16px;
  padding: 1.6rem 1.7rem 1.5rem;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

.ms-close {
  position: absolute;
  top: 0.9rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--color-memorial-border);
  background: none;
  color: var(--color-memorial-muted);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}

.ms-close:hover { color: var(--color-memorial-text); border-color: var(--color-memorial-gold); }

.ms-title {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.4rem;
}

.ms-note {
  color: var(--color-memorial-muted);
  font-size: 0.86rem;
  line-height: 1.5;
  margin: 0 0 1.1rem;
}

.ms-form { display: flex; flex-direction: column; gap: 0.75rem; }

.ms-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.ms-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--color-memorial-muted);
  font-size: 0.8rem;
}

.ms-input, .ms-textarea {
  background: rgba(10, 10, 15, 0.7);
  border: 1px solid var(--color-memorial-border);
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  color: var(--color-memorial-text);
  font-family: var(--font-body);
  font-size: 0.9rem;
}

.ms-textarea { resize: vertical; line-height: 1.5; }

.ms-input:focus-visible, .ms-textarea:focus-visible {
  outline: 2px solid var(--color-memorial-gold);
  outline-offset: 1px;
}

.ms-counter { font-size: 0.72rem; text-align: right; color: var(--color-memorial-muted); }
.ms-counter.over { color: #f87171; }

.ms-hint { font-size: 0.74rem; color: var(--color-memorial-muted); opacity: 0.8; }

.ms-coords { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: end; }

.ms-geo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(201, 168, 76, 0.4);
  background: rgba(201, 168, 76, 0.06);
  color: var(--color-memorial-gold-light);
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.ms-geo svg { width: 15px; height: 15px; }
.ms-geo:hover { background: rgba(201, 168, 76, 0.14); }

.ms-dup {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  font-size: 0.85rem;
  color: var(--color-memorial-muted);
}

.ms-dup p { margin: 0 0 0.5rem; }

.ms-dup-actions { display: flex; gap: 0.9rem; flex-wrap: wrap; align-items: center; }

.ms-dup-link { color: var(--color-memorial-gold-light); text-decoration: none; border-bottom: 1px dashed rgba(201, 168, 76, 0.4); }

.ms-dup-anyway {
  background: none;
  border: 1px solid var(--color-memorial-border);
  border-radius: 999px;
  color: var(--color-memorial-muted);
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.ms-dup-anyway:hover { color: var(--color-memorial-text); }

.ms-error { color: #f87171; font-size: 0.85rem; }

.ms-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 0.4rem; flex-wrap: wrap; }

.ms-note-small { color: var(--color-memorial-muted); font-size: 0.75rem; }

.ms-submit {
  padding: 0.6rem 1.5rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(115deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
  color: #14100a;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.ms-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201, 168, 76, 0.3); }
.ms-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.ms-sent {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-memorial-gold-light);
  font-size: 0.95rem;
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 12px;
  padding: 1rem 1.1rem;
}

.ms-sent svg { width: 22px; height: 22px; flex-shrink: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .ms-row, .ms-coords { grid-template-columns: 1fr; }
}
</style>
