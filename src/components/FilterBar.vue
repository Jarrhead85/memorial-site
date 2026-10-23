<template>
  <div class="filter-bar" role="group" aria-label="Фильтр по категории">
    <button
      class="filter-pill"
      :class="{ active: modelValue === 'Все' }"
      @click="$emit('update:modelValue', 'Все')"
    >
      Все
      <span class="pill-count">{{ total }}</span>
    </button>
    <button
      v-for="cat in categories"
      :key="cat"
      class="filter-pill"
      :class="{ active: modelValue === cat }"
      @click="$emit('update:modelValue', cat)"
    >
      {{ cat }}
      <span class="pill-count">{{ counts[cat] || 0 }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { monuments } from '../stores/catalog'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  }
})

defineEmits(['update:modelValue'])

const total = computed(() => monuments.value.length)

const counts = computed(() => {
  const map = {}
  for (const m of monuments.value) {
    map[m.category] = (map[m.category] || 0) + 1
  }
  return map
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 0.6rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-memorial-border) transparent;
}

.filter-bar::-webkit-scrollbar {
  height: 4px;
}

.filter-bar::-webkit-scrollbar-track {
  background: transparent;
}

.filter-bar::-webkit-scrollbar-thumb {
  background: var(--color-memorial-border);
  border-radius: 4px;
}

.filter-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, transform 0.15s ease;
  background: transparent;
  border: 1px solid var(--color-memorial-border);
  color: var(--color-memorial-muted);
}

.filter-pill:hover {
  border-color: var(--color-memorial-gold);
  color: var(--color-memorial-text);
}

.filter-pill:active {
  transform: scale(0.97);
}

.filter-pill.active {
  background: linear-gradient(115deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
  color: #14100a;
  border-color: transparent;
  font-weight: 600;
}

.pill-count {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.filter-pill.active .pill-count {
  background: rgba(20, 16, 10, 0.18);
  opacity: 1;
}
</style>
