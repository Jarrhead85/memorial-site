<template><canvas ref="canvasEl" class="constellation" aria-hidden="true"></canvas></template>

<script setup>
// Фоновая «карта памяти»: тусклое созвездие золотых точек, которые медленно
// мерцают и соединяются тонкими линиями, как метки на звёздной карте.
// Намеренно малозаметно (прозрачность 5–12%), уважает prefers-reduced-motion,
// останавливается, когда вкладка или секция не видны.
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref(null)
let ctx = null
let raf = null
let points = []
let w = 0
let h = 0
let running = false
let dpr = 1

const LINK_DIST = 150

function resize() {
  const el = canvasEl.value
  if (!el || !el.parentElement) return
  const rect = el.parentElement.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = Math.max(1, Math.round(rect.width))
  h = Math.max(1, Math.round(rect.height))
  el.width = w * dpr
  el.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
  drawFrame(performance.now())
}

function seed() {
  const count = Math.round((w * h) / 14000) // плотность не зависит от размера
  points = Array.from({ length: Math.min(count, 140) }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.8 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    speed: 0.25 + Math.random() * 0.5 // колебания у каждой точки свои
  }))
}

function drawFrame(now) {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  const t = now / 1000

  // линии между близкими точками — «связи» на карте памяти
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > LINK_DIST * LINK_DIST) continue
      const d = Math.sqrt(d2)
      const strength = (1 - d / LINK_DIST) * 0.055
      const twinkle =
        0.6 + 0.4 * Math.sin(t * 0.4 + a.phase + b.phase)
      ctx.strokeStyle = `rgba(201, 168, 76, ${strength * twinkle})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  // сами точки — медленное «дыхание»
  for (const p of points) {
    const glow = 0.1 + 0.09 * (0.5 + 0.5 * Math.sin(t * p.speed + p.phase))
    ctx.fillStyle = `rgba(222, 197, 122, ${glow})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function loop(now) {
  drawFrame(now)
  raf = requestAnimationFrame(loop)
}

function start() {
  if (running) return
  running = true
  raf = requestAnimationFrame(loop)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = null
}

let io = null

onMounted(() => {
  const el = canvasEl.value
  if (!el) return
  ctx = el.getContext('2d')
  resize()

  const reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // одна статичная рамка вместо анимации
    window.addEventListener('resize', resize)
    return
  }

  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVis)
  io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !document.hidden) start()
      else stop()
    },
    { threshold: 0.05 }
  )
  io.observe(el)
  start()
})

function onVis() {
  if (document.hidden) stop()
  else start()
}

onUnmounted(() => {
  stop()
  if (io) io.disconnect()
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.constellation {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
