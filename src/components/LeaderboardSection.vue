<template>
  <section class="leaderboard">
    <div class="leaderboard-head">
      <h2 class="leaderboard-heading">Народный рейтинг</h2>
      <p class="leaderboard-sub">Самые любимые памятники каталога — базовые голоса плюс ваши лайки</p>
    </div>

    <div class="leaderboard-tabs" role="tablist" aria-label="Размер рейтинга">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-btn"
        :class="{ active: activeTab === tab.value }"
        role="tab"
        :aria-selected="activeTab === tab.value"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="leaderboard-list">
      <router-link
        v-for="(item, index) in visibleItems"
        :key="item.id"
        :to="`/monument/${item.slug}`"
        class="leaderboard-row"
        :class="{ 'top-3': item.rank <= 3 }"
        :style="{ animationDelay: `${Math.min(index, 20) * 40}ms` }"
      >
        <span class="row-rank" :class="medalClass(item.rank)">{{ item.rank }}</span>
        <div class="row-thumb-wrap" aria-hidden="true">
          <img
            v-if="item.images && item.images.length"
            :src="item.images[0].url"
            :alt="''"
            class="row-thumb"
            loading="lazy"
          />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="row-thumb-empty">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div class="row-info">
          <span class="row-title">{{ item.title }}</span>
          <span class="row-city">{{ item.city }}</span>
        </div>
        <span class="row-likes" aria-label="Количество лайков">
          <svg
            class="row-heart"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
          {{ item.likes }}
        </span>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { monuments } from '../stores/catalog'
import { useVoting } from '../composables/useVoting'

const { getCount } = useVoting()

const tabs = [
  { label: 'Топ-10', value: 10 },
  { label: 'Топ-50', value: 50 },
  { label: 'Топ-100', value: 100 }
]

const activeTab = ref(10)

// Рейтинг = базовые лайки каталога + личные лайки посетителя.
// Раньше учитывались только личные лайки, и у нового посетителя
// весь рейтинг состоял из нулей.
const sortedMonuments = computed(() => {
  return monuments.value
    .map((m) => ({
      ...m,
      likes: getCount(m.id, m.likes || 0)
    }))
    .sort((a, b) => b.likes - a.likes || a.title.localeCompare(b.title, 'ru'))
    .map((m, i) => ({ ...m, rank: i + 1 }))
})

const visibleItems = computed(() => {
  return sortedMonuments.value.slice(0, activeTab.value)
})

function medalClass(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}
</script>

<style scoped>
.leaderboard {
  background: linear-gradient(180deg, var(--color-memorial-card-2) 0%, var(--color-memorial-card) 100%);
  border: 1px solid var(--color-memorial-border);
  border-radius: 20px;
  padding: 2.25rem 1.75rem;
}

.leaderboard-head {
  text-align: center;
  margin-bottom: 1.5rem;
}

.leaderboard-heading {
  font-family: var(--font-heading);
  font-size: 1.7rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.4rem 0;
}

.leaderboard-sub {
  color: var(--color-memorial-muted);
  font-size: 0.88rem;
}

.leaderboard-tabs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab-btn {
  padding: 0.42rem 1.15rem;
  border-radius: 999px;
  border: 1px solid var(--color-memorial-border);
  background: transparent;
  color: var(--color-memorial-muted);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--color-memorial-gold);
  color: var(--color-memorial-gold);
}

.tab-btn.active {
  background: linear-gradient(115deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
  border-color: transparent;
  color: #14100a;
  font-weight: 600;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.leaderboard-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
  animation: rowReveal 0.4s ease both;
}

.leaderboard-row:hover {
  background: rgba(201, 168, 76, 0.07);
  border-color: rgba(201, 168, 76, 0.25);
}

.leaderboard-row.top-3 {
  background: linear-gradient(
    135deg,
    rgba(201, 168, 76, 0.13) 0%,
    rgba(201, 168, 76, 0.04) 100%
  );
  border-color: rgba(201, 168, 76, 0.2);
}

@keyframes rowReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.row-rank {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-memorial-muted);
  min-width: 2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.row-rank.gold { color: var(--color-memorial-gold-light); }
.row-rank.silver { color: #c8ccd8; }
.row-rank.bronze { color: #d0925f; }

.row-thumb-wrap {
  width: 52px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-memorial-deeper);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3d3d52;
}

.row-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-thumb-empty {
  width: 18px;
  height: 18px;
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.row-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-memorial-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-city {
  font-size: 0.74rem;
  color: var(--color-memorial-muted);
}

.row-likes {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #f87171;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.row-heart {
  width: 15px;
  height: 15px;
}

@media (max-width: 640px) {
  .leaderboard { padding: 1.75rem 1rem; }
  .row-thumb-wrap { display: none; }
}
</style>
