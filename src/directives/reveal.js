// v-reveal — плавное появление элемента, когда он попадает в экран.
// Использование: v-reveal или v-reveal="{ delay: 120 }" (мс, для каскада).
// Один общий IntersectionObserver на всю страницу; после показа элемент
// перестаёт наблюдаться (анимация однократная).
const supported = typeof window !== 'undefined' && 'IntersectionObserver' in window
const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let observer = null
function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target
          el.classList.add('revealed')
          observer.unobserve(el)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
  }
  return observer
}

export const reveal = {
  mounted(el, binding) {
    if (!supported || prefersReduced) return // без анимации контент просто виден
    const opts = binding.value || {}
    // задержка каскада через CSS-переменную, а не transition-delay:
    // transition-delay «прилипла» бы к элементу и тормозила будущие hover-переходы
    if (opts.delay) el.style.setProperty('--reveal-delay', `${opts.delay}ms`)
    el.classList.add('reveal')
    getObserver().observe(el)
    // Страховка: если вкладка была в фоне, IntersectionObserver может
    // не сработать сколь угодно долго — показываем контент принудительно.
    el.__revealWatchdog = setTimeout(() => {
      if (!el.classList.contains('revealed')) {
        el.classList.add('revealed')
        if (observer) observer.unobserve(el)
      }
    }, 1500)
  },
  unmounted(el) {
    clearTimeout(el.__revealWatchdog)
    if (observer) observer.unobserve(el)
  }
}
