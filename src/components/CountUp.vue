<template><span ref="el">{{ display }}</span></template>

<script setup>
// Счётчик, «докручивающийся» до значения, когда элемент появляется на экране.
// Во время прокрутки числа в статистике оживают вместо статичного текста.
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  to: { type: Number, required: true },
  duration: { type: Number, default: 1300 }
})

const display = ref('0')
const el = ref(null)
let observer = null
let started = false

function start() {
  if (started) return
  started = true
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || props.duration <= 0) {
    display.value = String(props.to)
    return
  }
  const t0 = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    display.value = String(Math.round(props.to * eased))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    display.value = String(props.to)
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        start()
        observer.disconnect()
      }
    },
    { threshold: 0.3 }
  )
  observer.observe(el.value)
})

onUnmounted(() => observer && observer.disconnect())
</script>
