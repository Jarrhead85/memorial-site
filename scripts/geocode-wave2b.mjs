import fs from 'node:fs'
const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function search(q) {
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '2')
  u.searchParams.set('accept-language', 'ru')
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  return r.json()
}
const QUERIES = [
  ['apakidze', 'Североморск улица Сафонова'],
  ['alenka-gubkin', 'Губкин Белгородская область'],
  ['letchiki-svetlogorsk', 'Светлогорск Калининградская область'],
  ['vdova-bobrovy', 'Бобровы Дворы']
]
const out = JSON.parse(fs.readFileSync('scripts/pikabu-geo.json', 'utf8'))
for (const [key, q] of QUERIES) {
  const r = await search(q)
  if (r.length) {
    out[key] = { lat: Number(r[0].lat), lng: Number(r[0].lon), display: r[0].display_name.slice(0, 110), approx: true }
    console.log(`${key}: ${Number(r[0].lat).toFixed(4)}, ${Number(r[0].lon).toFixed(4)} | ${r[0].display_name.slice(0, 90)}`)
  } else {
    console.log(`${key}: НЕ НАЙДЕНО`)
  }
  await sleep(1400)
}
fs.writeFileSync('scripts/pikabu-geo.json', JSON.stringify(out, null, 2), 'utf8')
console.log('обновлено')
