<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="onOverlay">
        <div class="modal-container">
          <button class="modal-close" @click="close">&times;</button>
          <h2 class="modal-title">Добавить фото</h2>
          <p class="modal-subtitle">
            Фото пройдёт модерацию администратора перед публикацией.
          </p>

          <template v-if="!done">
            <form class="modal-form" @submit.prevent="submit">
              <label class="field">
                <span class="field-label">Ссылка на изображение *</span>
                <input
                  v-model.trim="url"
                  type="url"
                  placeholder="https://…"
                  class="field-input"
                  required
                />
              </label>

              <div class="preview" v-if="previewUrl">
                <img :src="previewUrl" alt="Предпросмотр" class="preview-img" />
              </div>

              <label class="field">
                <span class="field-label">Источник фото (сайт)</span>
                <input
                  v-model.trim="source"
                  type="text"
                  maxlength="120"
                  placeholder="например: mytown.ru"
                  class="field-input"
                />
              </label>

              <label class="field">
                <span class="field-label">Комментарий (необязательно)</span>
                <textarea
                  v-model.trim="comment"
                  maxlength="500"
                  rows="2"
                  class="field-input"
                  placeholder="Что на фото, когда сделано…"
                ></textarea>
              </label>

              <div class="form-err" v-if="error">{{ error }}</div>

              <div class="modal-actions">
                <button type="button" class="btn btn-ghost" @click="close">Отмена</button>
                <button type="submit" class="btn btn-gold" :disabled="sending">
                  {{ sending ? 'Отправка…' : 'Отправить на модерацию' }}
                </button>
              </div>
            </form>
          </template>

          <div v-else class="success">
            <div class="success-icon">&#10003;</div>
            <p>Спасибо! Фото отправлено на модерацию.</p>
            <button class="btn btn-gold" @click="close">Закрыть</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useModalScrollLock } from '../composables/useModalScrollLock'

const props = defineProps({
  visible: { type: Boolean, default: false },
  monumentId: { type: Number, required: true },
  monumentTitle: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submitted'])

useModalScrollLock(() => props.visible)

const url = ref('')
const source = ref('')
const comment = ref('')
const sending = ref(false)
const error = ref('')
const done = ref(false)

const previewUrl = computed(() => /^https?:\/\//i.test(url.value) ? url.value : '')

async function submit() {
  if (!/^https?:\/\//i.test(url.value)) {
    error.value = 'Укажите корректный URL изображения (начинается с http:// или https://)'
    return
  }
  sending.value = true
  error.value = ''
  try {
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monumentId: props.monumentId,
        url: url.value,
        source: source.value,
        comment: comment.value
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ошибка отправки')
    done.value = true
    emit('submitted')
  } catch (e) {
    error.value = e.message || 'Не удалось отправить. Сервер модерации недоступен?'
  } finally {
    sending.value = false
  }
}

function onOverlay() {
  if (!sending.value) close()
}

function close() {
  if (sending.value) return
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape' && props.visible) close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-container {
  position: relative;
  background: #16161f;
  border: 1px solid #c9a84c;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  overflow: hidden;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #2a2a3a;
  background: #0a0a0f;
  color: #e8e6e3;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}

.modal-close:hover {
  border-color: #c9a84c;
  color: #c9a84c;
}

.modal-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  color: #e8e6e3;
  padding: 1.25rem 1.25rem 0;
  margin: 0;
}

.modal-subtitle {
  margin: 0.4rem 1.25rem 1rem;
  color: #8a8a9a;
  font-size: 0.85rem;
}

.modal-form {
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.82rem;
  color: #8a8a9a;
}

.field-input {
  background: #0a0a0f;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  color: #e8e6e3;
  padding: 0.6rem 0.8rem;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.9rem;
}

.field-input:focus {
  outline: none;
  border-color: #c9a84c;
}

.preview {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #2a2a3a;
}

.preview-img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  background: #0a0a0f;
}

.form-err {
  color: #f87171;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.btn-gold {
  background: #c9a84c;
  color: #0a0a0f;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #2a2a3a;
  color: #e8e6e3;
}

.success {
  text-align: center;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #4ade80;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.success p {
  color: #e8e6e3;
  margin: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.92);
}
</style>