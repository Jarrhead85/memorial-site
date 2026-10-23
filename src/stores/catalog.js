// Каталог памятников. Данные больше не бандлятся в JS: основной источник —
// /api/catalog (чтобы одобрение заявки в админке появлялось на сайте без
// пересборки). Если API недоступен (офлайн, dev без сервера) — подгружается
// запасной чанк с локальной копией данных.
import { ref } from 'vue'

export const monuments = ref([])
export const catalogReady = ref(false)

export async function loadCatalog() {
  try {
    const res = await fetch('/api/catalog')
    if (!res.ok) throw new Error('bad status')
    const data = await res.json()
    if (!Array.isArray(data.monuments) || !data.monuments.length) throw new Error('empty catalog')
    monuments.value = data.monuments
  } catch {
    try {
      const seed = await import('../data/monuments.js')
      monuments.value = seed.monuments
    } catch { /* каталог пуст — интерфейсы покажут пустые состояния */ }
  } finally {
    catalogReady.value = true
  }
}
