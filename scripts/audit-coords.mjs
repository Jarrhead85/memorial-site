// Аудит координат: для каждого памятника — обратное геокодирование
// (Nominatim) и сверка найденного населённого пункта с городом памятника.
// Пейсинг 1.2с (лимит Nominatim 1 req/s), UA с контактом.
// Результат: scripts/coord-audit.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const paceMs = 1200
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const { monuments } = await import('../src/data/monuments.js')
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/^(г|с|пгт|пос)\.\s*/, '').trim()

const audit = []
function save() {
  fs.writeFileSync('scripts/coord-audit.json', JSON.stringify(audit, null, 2), 'utf8')
}

function stemMatch(a, b) {
  const x = norm(a), y = norm(b)
  if (!x || !y) return false
  if (x === y) return true
  const min = Math.min(5, x.length, y.length)
  return min >= 4 && x.slice(0, min) === y.slice(0, min)
}

let i = 0
for (const m of monuments) {
  i++
  const { lat, lng } = m.coordinates
  let locality = '', state = '', ok = false
  try {
    const u = new URL('https://nominatim.openstreetmap.org/reverse')
    u.searchParams.set('format', 'jsonv2')
    u.searchParams.set('lat', String(lat))
    u.searchParams.set('lon', String(lng))
    u.searchParams.set('zoom', '10') // уровень города/района
    u.searchParams.set('accept-language', 'ru')
    const res = await fetch(u, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const d = await res.json()
      const a = d.address || {}
      locality = a.city || a.town || a.village || a.municipality || a.county || ''
      state = a.state || ''
      ok = stemMatch(locality, m.city) || stemMatch(a.suburb, m.city)
    } else {
      locality = 'HTTP ' + res.status
    }
  } catch (e) {
    locality = 'ERR ' + e.message
  }
  const inRussia = lat >= 41 && lat <= 82 && lng >= 19 && lng <= 190
  audit.push({
    id: m.id, title: m.title, city: m.city, region: m.region,
    lat, lng, locality, state, ok, inRussia
  })
  const flag = ok ? 'ok   ' : (inRussia ? 'CHECK' : 'BAD!!')
  console.log(`[${i}/${monuments.length}] ${flag} #${m.id} ${m.city} -> ${locality}${state ? ' (' + state + ')' : ''}`)
  save()
  await sleep(paceMs)
}
const bad = audit.filter((a) => !a.ok)
console.log(`\nИтог: ok ${audit.length - bad.length}, проблемных ${bad.length}`)
