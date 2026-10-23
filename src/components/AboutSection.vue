<template>
  <section id="about" class="about-section" ref="sectionRef">
    <div class="about-container">
      <span class="about-eyebrow" :class="{ visible: visible }">О проекте</span>
      <h2 class="about-title" :class="{ visible: visible }">Память, которую стоит найти</h2>
      <p class="about-desc" :class="{ visible: visible }">
        Мы собираем и рассказываем истории малоизвестных памятников по всей России — тех, что стоят в тени
        великих монументов, но хранят в себе не менее важные страницы нашей истории. Каждый памятник — это
        живая связь прошлого с настоящим.
      </p>
      <div class="features-grid">
        <div class="feature-card" :class="{ visible: visible }">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h3 class="feature-title">Истории</h3>
          <p class="feature-text">Глубокое погружение в историю каждого памятника и его окружения</p>
        </div>
        <div class="feature-card" :class="{ visible: visible }">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <h3 class="feature-title">Карты</h3>
          <p class="feature-text">Интерактивная карта страны: найдите памятники рядом с вашим маршрутом</p>
        </div>
        <div class="feature-card" :class="{ visible: visible }">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <h3 class="feature-title">Открытия</h3>
          <p class="feature-text">Голосуйте за любимые памятники и присылайте собственные фотографии</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const sectionRef = ref(null)
const visible = ref(false)
let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.15 }
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.about-section {
  padding: 5rem 1.5rem 5.5rem;
}

.about-container {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.about-eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-memorial-gold);
  margin-bottom: 1rem;
  opacity: 0;
  transform: translateY(15px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.about-title {
  font-family: var(--font-heading);
  font-size: 2.25rem;
  color: var(--color-memorial-text);
  margin: 0 0 1.25rem 0;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s;
}

.about-desc {
  font-size: 1.02rem;
  color: var(--color-memorial-muted);
  line-height: 1.75;
  margin: 0 auto 3rem;
  max-width: 680px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease 0.16s, transform 0.6s ease 0.16s;
}

.about-eyebrow.visible,
.about-title.visible,
.about-desc.visible {
  opacity: 1;
  transform: translateY(0);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  text-align: left;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  background: linear-gradient(180deg, var(--color-memorial-card-2) 0%, var(--color-memorial-card) 100%);
  border: 1px solid var(--color-memorial-border);
  border-radius: 16px;
  padding: 1.9rem 1.6rem;
  opacity: 0;
  transform: translateY(25px);
  transition: opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.feature-card.visible {
  opacity: 1;
  transform: translateY(0);
}

.feature-card:nth-child(2).visible {
  transition-delay: 0.12s;
}

.feature-card:nth-child(3).visible {
  transition-delay: 0.24s;
}

.feature-card:hover {
  border-color: rgba(201, 168, 76, 0.45);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.35);
}

.feature-icon {
  width: 46px;
  height: 46px;
  margin: 0 0 1.1rem 0;
  color: var(--color-memorial-gold);
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon svg {
  width: 22px;
  height: 22px;
}

.feature-title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-memorial-text);
  margin: 0 0 0.6rem 0;
}

.feature-text {
  font-size: 0.9rem;
  color: var(--color-memorial-muted);
  line-height: 1.55;
  margin: 0;
}
</style>
