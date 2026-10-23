<template>
  <section class="wall" aria-label="Стена памяти">
    <div class="wall-head">
      <h2 class="wall-title">Стена памяти</h2>
      <p class="wall-sub">
        Видели этот памятник? Есть история о нём или о человеке, которого он напоминает? Оставьте пару строк — после модерации они появятся здесь.
      </p>
    </div>

    <div v-if="entries.length" class="wall-list">
      <article v-for="e in entries" :key="e.id" class="wall-card">
        <div class="wall-avatar" aria-hidden="true">{{ initials(e.name) }}</div>
        <div class="wall-body">
          <div class="wall-meta">
            <span class="wall-name">{{ e.name }}</span>
            <span class="wall-date">{{ formatDate(e.createdAt) }}</span>
          </div>
          <p class="wall-text">{{ e.text }}</p>
        </div>
      </article>
    </div>
    <p v-else class="wall-empty">Здесь пока тихо. Ваша история может стать первой.</p>

    <form v-if="!sent" class="wall-form" @submit.prevent="submit">
      <div class="wall-form-row">
        <input
          v-model="name"
          class="wall-input"
          type="text"
          maxlength="60"
          placeholder="Имя (необязательно)"
          aria-label="Ваше имя"
        />
        <span class="wall-counter" :class="{ over: text.length > 500 }">{{ text.length }}/500</span>
      </div>
      <textarea
        v-model="text"
        class="wall-textarea"
        rows="3"
        maxlength="500"
        required
        placeholder="Ваша история или воспоминание…"
        aria-label="Текст истории"
      ></textarea>
      <div v-if="error" class="wall-error" role="alert">{{ error }}</div>
      <div class="wall-form-actions">
        <span class="wall-note">Публикуется после проверки модератором</span>
        <button class="wall-submit" type="submit" :disabled="sending || text.trim().length < 10">
          {{ sending ? 'Отправляем…' : 'Отправить' }}
        </button>
      </div>
    </form>
    <div v-else class="wall-sent" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Спасибо! История отправлена на модерацию.
      <button class="wall-again" type="button" @click="sent = false">Написать ещё</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  monumentId: { type: Number, required: true }
})

const entries = ref([])
const name = ref('')
const text = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')

function initials(n) {
  return String(n || 'Г')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

onMounted(async () => {
  try {
    const res = await fetch(`/api/wall?monumentId=${props.monumentId}`)
    if (res.ok) {
      const d = await res.json()
      entries.value = d.entries || []
    }
  } catch { /* оффлайн — просто покажем пустую стену */ }
})

async function submit() {
  error.value = ''
  sending.value = true
  try {
    const res = await fetch('/api/wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monumentId: props.monumentId,
        name: name.value.trim(),
        text: text.value.trim()
      })
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.error || 'Не получилось отправить')
    sent.value = true
    text.value = ''
    name.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.wall {
  margin-top: 3.5rem;
  border-top: 1px solid var(--color-memorial-border);
  padding-top: 2.25rem;
}

.wall-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.4rem;
}

.wall-sub {
  color: var(--color-memorial-muted);
  font-size: 0.92rem;
  line-height: 1.55;
  max-width: 640px;
  margin: 0 0 1.5rem;
}

.wall-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-bottom: 1.75rem;
}

.wall-card {
  display: flex;
  gap: 0.85rem;
  background: rgba(22, 22, 31, 0.6);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
}

.wall-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-size: 0.9rem;
  font-weight: 700;
  color: #14100a;
  background: linear-gradient(135deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
}

.wall-body { flex: 1; min-width: 0; }

.wall-meta {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.3rem;
}

.wall-name {
  font-weight: 600;
  color: var(--color-memorial-text);
  font-size: 0.95rem;
}

.wall-date {
  color: var(--color-memorial-muted);
  font-size: 0.78rem;
}

.wall-text {
  margin: 0;
  color: var(--color-memorial-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.wall-empty {
  color: var(--color-memorial-muted);
  font-size: 0.9rem;
  font-style: italic;
  margin-bottom: 1.75rem;
}

.wall-form {
  background: rgba(22, 22, 31, 0.5);
  border: 1px solid var(--color-memorial-border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
}

.wall-form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.wall-input {
  flex: 1;
  background: rgba(10, 10, 15, 0.7);
  border: 1px solid var(--color-memorial-border);
  border-radius: 8px;
  padding: 0.55rem 0.8rem;
  color: var(--color-memorial-text);
  font-family: var(--font-body);
  font-size: 0.9rem;
}

.wall-counter {
  font-size: 0.75rem;
  color: var(--color-memorial-muted);
  font-variant-numeric: tabular-nums;
}

.wall-counter.over { color: #f87171; }

.wall-textarea {
  width: 100%;
  background: rgba(10, 10, 15, 0.7);
  border: 1px solid var(--color-memorial-border);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  color: var(--color-memorial-text);
  font-family: var(--font-body);
  font-size: 0.92rem;
  line-height: 1.5;
  resize: vertical;
}

.wall-input:focus-visible,
.wall-textarea:focus-visible {
  outline: 2px solid var(--color-memorial-gold);
  outline-offset: 1px;
}

.wall-error {
  color: #f87171;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.wall-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.wall-note {
  color: var(--color-memorial-muted);
  font-size: 0.78rem;
}

.wall-submit {
  padding: 0.55rem 1.4rem;
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

.wall-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(201, 168, 76, 0.3);
}

.wall-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wall-sent {
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

.wall-sent svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.wall-again {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-radius: 999px;
  color: var(--color-memorial-gold-light);
  padding: 0.35rem 0.9rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.wall-again:hover { background: rgba(201, 168, 76, 0.12); }
</style>
