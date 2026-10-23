// Геокодирование новых памятников из пикабу-волны (Nominatim POI, запасной
// вариант — центр поселения).
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
  ['apakidze', 'Апакидзе памятник Североморск'],
  ['alenka-novovoronezh', 'Алёнка памятник Нововоронеж'],
  ['alenka-gubkin', 'Алёнка скульптура Губкин'],
  ['vezhlivye-belogorsk', 'Вежливым людям памятник Белогорск Амурская'],
  ['meteorite-chebarkul', 'Челябинский метеорит памятник Чебаркуль'],
  ['letchiki-svetlogorsk', 'памятник лётчикам Светлогорск Калининградская'],
  ['burkov-perm', 'улица Революции 48 Пермь'],
  ['vdova-bobrovy', 'Бобровы Дворы Губкинский район'],
  ['repressii-rostov', 'парк строителей Ростов-на-Дону'],
  ['dmitlag-krest', 'Деденёво канал имени Москвы'],
  ['dobrovoltsy-lugansk', 'парк Молодой гвардии Луганск'],
  ['lesoruby-vsevolzhsk', 'Всеволожск']
]

const out = {}
for (const [key, q] of QUERIES) {
  const r = await search(q)
  if (r.length) {
    out[key] = { lat: Number(r[0].lat), lng: Number(r[0].lon), display: r[0].display_name.slice(0, 110) }
    console.log(`${key}: ${Number(r[0].lat).toFixed(4)}, ${Number(r[0].lon).toFixed(4)} | ${r[0].display_name.slice(0, 90)}`)
  } else {
    console.log(`${key}: НЕ НАЙДЕНО`)
  }
  await sleep(1400)
}
fs.writeFileSync('scripts/pikabu-geo.json', JSON.stringify(out, null, 2), 'utf8')
console.log('сохранено scripts/pikabu-geo.json')
