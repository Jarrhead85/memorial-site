<template>
  <button
    class="vote-btn"
    :class="{ liked: liked }"
    type="button"
    :aria-label="liked ? 'Убрать лайк' : 'Поставить лайк'"
    :aria-pressed="liked"
    @click.stop.prevent="handleToggle"
  >
    <svg
      class="vote-heart"
      :class="{ bounce: bouncing }"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      :fill="liked ? '#f87171' : 'none'"
      :stroke="liked ? '#f87171' : 'currentColor'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    </svg>
    <span class="vote-count">{{ count }}</span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVoting } from '../composables/useVoting'

const props = defineProps({
  monumentId: { type: Number, required: true },
  initialLikes: { type: Number, default: 0 }
})

const { getCount, toggleLike, isLiked } = useVoting()

const bouncing = ref(false)
let bounceTimer = null

// Счётчик и статус — вычисляемые, поэтому все кнопки на странице
// (карточка, рейтинг, детальная) обновляются синхронно,
// а базовые лайки каталога не сбрасываются при снятии лайка.
const liked = computed(() => isLiked(props.monumentId))
const count = computed(() => getCount(props.monumentId, props.initialLikes))

function handleToggle() {
  toggleLike(props.monumentId)
  bouncing.value = true
  clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => {
    bouncing.value = false
  }, 350)
}
</script>

<style scoped>
.vote-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 76, 0.45);
  background: rgba(10, 10, 15, 0.6);
  backdrop-filter: blur(6px);
  color: var(--color-memorial-gold);
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
}

.vote-btn:hover {
  background: rgba(201, 168, 76, 0.14);
  border-color: var(--color-memorial-gold);
  transform: translateY(-1px);
}

.vote-btn:active {
  transform: translateY(0) scale(0.96);
}

.vote-btn.liked {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.vote-heart {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.vote-heart.bounce {
  animation: heartBounce 0.35s ease;
}

@keyframes heartBounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.35); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

.vote-count {
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
</style>
