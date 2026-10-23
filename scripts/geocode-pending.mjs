// Геокодирование отложенных находок харвеста (без координат в статье):
// ищем населённый пункт в Nominatim, координату даём на уровне города.
// Результат: scripts/harvest-pending-geocoded.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const pending = JSON.parse(fs.readFileSync('scripts/harvest-pending.json', 'utf8'))
console.log('отложено:', pending.length)

const out = []
for (const f of pending) {
  const q = `${f.city}, ${f.region}`
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '1')
  u.searchParams.set('accept-language', 'ru')
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA } })
    const list = await res.json()
    if (list.length) {
      out.push({ ...f, coords: { lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon) }, approx: true })
      console.log(`OK   ${f.city}: ${Number(list[0].lat).toFixed(4)}, ${Number(list[0].lon).toFixed(4)}`)
    } else {
      console.log(`MISS ${f.city}`)
    }
  } catch (e) {
    console.log(`ERR  ${f.city}: ${e.message}`)
  }
  await sleep(1400)
}
fs.writeFileSync('scripts/harvest-pending-geocoded.json', JSON.stringify(out, null, 2), 'utf8')
console.log(`геокодировано: ${out.length}/${pending.length}`)
