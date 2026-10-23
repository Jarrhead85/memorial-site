// Добор координат из Викиданных для статей без локальных координат:
// 1) батчами вытаскиваем интро-выжимки всех статей из списка,
// 2) для статей без координат берём P625 через wbgetentities (по ситессылке).
// Дополняет scripts/wiki-monuments-raw.json (чекпоинт).
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 5000
let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}
async function api(host, params) {
  const u = new URL(`https://${host}/w/api.php`)
  const body = new URLSearchParams({ format: 'json', ...params })
  for (let t = 0; t < 3; t++) {
    await pace()
    try {
      const res = await fetch(u, { method: 'POST', body, headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' } })
      if (res.status === 429 || res.status === 503) { await sleep(30000); continue }
      if (!res.ok) throw new Error('http ' + res.status)
      return await res.json()
    } catch (e) {
      if (t === 2) throw e
      await sleep(5000)
    }
  }
  throw new Error('unreachable')
}

const titles = JSON.parse(fs.readFileSync('scripts/wiki-monument-titles.json', 'utf8'))
const CP = 'scripts/wiki-monuments-raw.json'
const raw = JSON.parse(fs.readFileSync(CP, 'utf8'))
const byTitle = new Map(raw.map((r) => [r.title, r]))

const SKIP_TITLE = /^Список|памятник природы|природный|заказник|заповедник|могильник|археолог|курган/i
const todo = titles.filter((t) => !SKIP_TITLE.test(t) && !byTitle.has(t))
console.log('статей без данных:', todo.length)

// 1) выжимки + локальные координаты
let batchNo = 0
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50)
  try {
    const d = await api('ru.wikipedia.org', {
      action: 'query', titles: batch.join('|'), redirects: 1,
      prop: 'coordinates|extracts', coprimary: 'primary',
      exintro: 1, explaintext: 1, exlimit: 'max'
    })
    for (const p of Object.values(d.query.pages || {})) {
      if (p.missing || !p.title || byTitle.has(p.title)) continue
      const extract = (p.extract || '').replace(/\s+/g, ' ').trim()
      if (extract.length < 150) continue
      const c = p.coordinates && p.coordinates[0]
      byTitle.set(p.title, { title: p.title, lat: c ? c.lat : null, lng: c ? c.lon : null, extract: extract.slice(0, 1500) })
    }
  } catch (e) {
    console.log(`  батч ${Math.floor(i / 50) + 1}: ${e.message}`)
  }
  batchNo++
  if (batchNo % 5 === 0) console.log(`  выжимки: ${batchNo}/${Math.ceil(todo.length / 50)}`)
}
fs.writeFileSync(CP, JSON.stringify([...byTitle.values()], null, 1), 'utf8')

// 2) координаты из Викиданных для lat=null
const coordless = [...byTitle.values()].filter((r) => r.lat === null)
console.log('без координат, пробуем Викиданные:', coordless.length)
const titleToQid = new Map()
for (let i = 0; i < coordless.length; i += 50) {
  const batch = coordless.slice(i, i + 50).map((r) => r.title)
  try {
    const d = await api('www.wikidata.org', {
      action: 'wbgetentities', sites: 'ruwiki', titles: batch.join('|'),
      props: 'claims|sitelinks', languages: 'ru'
    })
    for (const [qid, ent] of Object.entries(d.entities || {})) {
      const ruTitle = ent.sitelinks && ent.sitelinks.ruwiki && ent.sitelinks.ruwiki.title
      if (!ruTitle) continue
      const cl = ent.claims && ent.claims.P625 && ent.claims.P625[0]
      if (cl && cl.mainsnak && cl.mainsnak.datavalue) {
        const c = cl.mainsnak.datavalue.value
        titleToQid.set(ruTitle, { lat: c.latitude, lng: c.longitude })
      }
    }
  } catch (e) {
    console.log(`  wd батч ${Math.floor(i / 50) + 1}: ${e.message}`)
  }
  if ((i / 50) % 5 === 0) console.log(`  wikidata: ${i}/${coordless.length}`)
}
let filled = 0
for (const r of coordless) {
  const c = titleToQid.get(r.title)
  if (c) { r.lat = c.lat; r.lng = c.lng; filled++ }
}
fs.writeFileSync(CP, JSON.stringify([...byTitle.values()], null, 1), 'utf8')
const withCoords = [...byTitle.values()].filter((r) => r.lat !== null).length
console.log(`итого статей: ${byTitle.size}, с координатами: ${withCoords} (из Викиданных: +${filled})`)
