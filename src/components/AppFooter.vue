<template>
  <footer class="footer">
    <div class="footer-gold-line"></div>
    <div class="footer-content">
      <div class="footer-brand">
        <svg class="footer-logo" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 22.5V11.8c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v10.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M8.5 22.5h15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M16 9.5v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span class="footer-title">Бессмертная память</span>
      </div>
      <nav class="footer-nav" aria-label="Навигация в подвале">
        <router-link to="/" class="footer-link">Главная</router-link>
        <router-link to="/map" class="footer-link">Карта</router-link>
        <router-link to="/regions" class="footer-link">Регионы</router-link>
        <router-link to="/#catalog" class="footer-link">Каталог</router-link>
      </nav>
      <p class="footer-tagline">Создано с любовью к истории России &middot; {{ year }}</p>
      <p class="footer-photos">
        Фотографии — <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a>
        и посетители проекта
      </p>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  background: #08080c;
  padding: 0 0 2.25rem 0;
  text-align: center;
}

.footer-gold-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.6), transparent);
}

.footer-content {
  padding: 2.25rem 1.5rem 0;
  max-width: 800px;
  margin: 0 auto;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  margin-bottom: 1.1rem;
  color: var(--color-memorial-gold);
}

.footer-title {
  font-family: var(--font-heading);
  color: var(--color-memorial-gold);
  font-size: 1.2rem;
  font-weight: 700;
}

.footer-nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.6rem;
  margin-bottom: 1.2rem;
}

.footer-link {
  color: var(--color-memorial-muted);
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.25s ease;
}

.footer-link:hover {
  color: var(--color-memorial-gold);
}

.footer-tagline {
  color: var(--color-memorial-muted);
  font-size: 0.85rem;
  margin: 0 0 0.4rem 0;
}

.footer-photos {
  color: #55556a;
  font-size: 0.78rem;
  margin: 0;
}

.footer-photos a {
  color: var(--color-memorial-gold-dim);
  text-decoration: none;
}

.footer-photos a:hover {
  color: var(--color-memorial-gold);
  text-decoration: underline;
}
</style>
