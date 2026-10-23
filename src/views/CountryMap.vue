<template>
  <main class="map-page">
    <div class="map-head" v-reveal>
      <span class="map-eyebrow">Карта</span>
      <h1 class="map-title">Памятники на карте России</h1>
      <p class="map-subtitle">
        {{ monuments.length }} памятников от Калининграда до Камчатки. Нажмите на метку, чтобы увидеть фото и перейти к памятнику.
      </p>
    </div>

    <div class="map-wrap" v-reveal="{ delay: 120 }">
      <div ref="mapEl" class="map-canvas" role="application" aria-label="Интерактивная карта памятников"></div>

      <div class="map-legend" aria-label="Условные обозначения">
        <span class="legend-item">
          <i class="legend-dot dot-gold"></i> С фотографией ({{ photoCount }})
        </span>
        <span class="legend-item">
          <i class="legend-dot dot-gray"></i> Ждут фото ({{ noPhotoCount }})
        </span>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { monuments } from '../stores/catalog'

const router = useRouter()
const mapEl = ref(null)
let map = null
let markersLayer = null

const photoCount = computed(() => monuments.value.filter((m) => m.images && m.images.length).length)
const noPhotoCount = computed(() => monuments.value.length - photoCount.value)

function pinIcon(hasPhoto) {
  const color = hasPhoto ? '#c9a84c' : '#62627a'
  const html = `
    <svg width="26" height="36" viewBox="0 0 26 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.1 13 23 13 23s13-13.9 13-23C26 5.8 20.2 0 13 0z"
        fill="${color}" stroke="#0a0a0f" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#0a0a0f"/>
    </svg>`
  return L.divIcon({
    html,
    className: 'memorial-pin',
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -34]
  })
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPopup(m) {
  const title = esc(m.title)
  const city = esc(m.city)
  const region = esc(m.region)
  const thumb = m.images && m.images.length ? m.images[0].url : ''
  const imgHtml = thumb
    ? `<img class="popup-img" src="${esc(thumb)}" alt="${title}" onerror="this.style.display='none'">`
    : `<div class="popup-noimg" title="Фото ещё нет">?</div>`
  return `
    <div class="memorial-popup">
      <div class="popup-media">${imgHtml}</div>
      <div class="popup-body">
        <div class="popup-title">${title}</div>
        <div class="popup-meta">${city} &middot; ${region}</div>
        <a class="popup-link" href="/monument/${esc(m.slug)}" data-slug="${esc(m.slug)}">Открыть памятник</a>
      </div>
    </div>`
}

onMounted(() => {
  map = L.map(mapEl.value, {
    center: [58, 87],
    zoom: 3,
    minZoom: 2,
    maxZoom: 17,
    worldCopyJump: true,
    attributionControl: true,
    zoomControl: true
  })

  // Подложка OpenStreetMap — растровые тайлы, работают везде без ключей
  // и WebGL, читаемы, для территории России названия русские.
  // Лёгкое снижение насыщенности, чтобы карта дружила с тёмной темой.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    className: 'osm-soft',
    attribution:
      '&copy; участники <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map)
  map.attributionControl.setPrefix(false)

  markersLayer = L.layerGroup().addTo(map)
  const bounds = L.latLngBounds([])

  for (const m of monuments.value) {
    const hasPhoto = m.images && m.images.length
    L.marker([m.coordinates.lat, m.coordinates.lng], {
      icon: pinIcon(hasPhoto),
      title: m.title,
      alt: m.title
    })
      .addTo(markersLayer)
      .bindPopup(buildPopup(m), { maxWidth: 320, closeButton: true })
    bounds.extend([m.coordinates.lat, m.coordinates.lng])
  }

  // Ссылки в попапах работают как SPA-переходы, без перезагрузки страницы
  map.on('popupopen', (e) => {
    const link = e.popup.getElement().querySelector('.popup-link')
    if (!link) return
    link.addEventListener(
      'click',
      (ev) => {
        ev.preventDefault()
        router.push(`/monument/${link.dataset.slug}`)
      },
      { once: true }
    )
  })

  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 })
  setTimeout(() => map.invalidateSize(), 200)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-page {
  padding: 7.5rem 1.5rem 4rem;
  max-width: 1240px;
  margin: 0 auto;
}

.map-head {
  text-align: center;
  margin-bottom: 2rem;
}

.map-eyebrow {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-memorial-gold);
  margin-bottom: 0.7rem;
}

.map-title {
  font-family: var(--font-heading);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  color: var(--color-memorial-text);
  margin: 0 0 0.75rem 0;
}

.map-subtitle {
  color: var(--color-memorial-muted);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
}

.map-wrap {
  position: relative;
  border: 1px solid var(--color-memorial-border);
  border-radius: 16px;
  overflow: hidden;
  background: #0a0a0f;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.4);
}

.map-canvas {
  width: 100%;
  height: 560px;
}

/* OSM чуть спокойнее по цвету — ближе к палитре сайта, подписи не трогаем */
.map-canvas :deep(.osm-soft) {
  filter: saturate(0.78) brightness(1.02);
}

.map-legend {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 500;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-memorial-border);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-memorial-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.dot-gold { background: var(--color-memorial-gold); }
.dot-gray { background: #62627a; }

@media (max-width: 640px) {
  .map-canvas { height: 420px; }
}
</style>

<style>
.memorial-pin {
  background: transparent;
  border: none;
}

.leaflet-popup-content-wrapper .leaflet-popup-content {
  margin: 0;
  width: 280px !important;
}

.memorial-popup {
  display: flex;
  flex-direction: column;
}

.popup-media {
  width: 100%;
  height: 130px;
  background: #0a0a0f;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.popup-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.popup-noimg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2a2a3a;
  font-family: var(--font-heading);
  font-size: 3rem;
}

.popup-body {
  padding: 0.75rem 0.85rem 0.85rem;
}

.popup-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  color: var(--color-memorial-text);
  line-height: 1.3;
  margin-bottom: 0.25rem;
}

.popup-meta {
  font-size: 0.75rem;
  color: var(--color-memorial-muted);
  margin-bottom: 0.6rem;
}

.popup-link {
  display: inline-block;
  background: linear-gradient(115deg, var(--color-memorial-gold), var(--color-memorial-gold-light));
  color: #14100a;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 7px;
  padding: 0.42rem 0.9rem;
}

.leaflet-popup-tip {
  background: #16161f;
  border: 1px solid #2a2a3a;
}

.leaflet-container {
  font-family: var(--font-body);
  background: #0a0a0f;
}

.leaflet-control-attribution {
  background: rgba(10, 10, 15, 0.75) !important;
  color: var(--color-memorial-muted) !important;
  font-size: 10px;
}

.leaflet-control-attribution a {
  color: var(--color-memorial-gold) !important;
}

.leaflet-bar a {
  background: #16161f !important;
  color: #e8e6e3 !important;
  border-color: #2a2a3a !important;
}

.leaflet-bar a:hover {
  background: #2a2a3a !important;
}
</style>
