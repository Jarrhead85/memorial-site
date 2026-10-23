// Обход категорий ру.Википедии (Памятники/Скульптуры/Мемориалы/Фонтаны России,
// BFS вглубь) -> список статей -> батчевая выгрузка координат + интро-выжимок.
// Чекпоинт на каждом батче: scripts/wiki-monuments-raw.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 6000
const BACKOFFS = [30000, 60000, 120000, 300000]

let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

async function api(params) {
  const u = new URL('https://ru.wikipedia.org/w/api.php')
  // POST: батч из 50 русских названий в GET-URL не влезает (HTTP 414)
  const body = new URLSearchParams({ format: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })
  let lastErr
  for (let attempt = 0; attempt < BACKOFFS.length; attempt++) {
    await pace()
    try {
      const res = await fetch(u, {
        method: 'POST',
        body,
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      if (res.status === 429 || res.status === 503) {
        console.log(`    ${res.status}, пауза ${BACKOFFS[attempt] / 1000}с`)
        await sleep(BACKOFFS[attempt])
        lastErr = new Error('rate limited')
        continue
      }
      if (!res.ok) throw new Error('http ' + res.status)
      return await res.json()
    } catch (e) {
      lastErr = e
      await sleep(3000)
    }
  }
  throw lastErr || new Error('api failed')
}

const ROOTS = [
  'Категория:Памятники России',
  'Категория:Мемориалы России',
  'Категория:Скульптуры России',
  'Категория:Фонтаны России'
]

// --- Этап 1: BFS по подкатегориям (глубина 3, капы); если список статей уже
// собран ранее — пропускаем (перезапуск после сбоя батчей) ---
const TITLES_FILE = 'scripts/wiki-monument-titles.json'
const articleTitles = new Set()
if (fs.existsSync(TITLES_FILE)) {
  for (const t of JSON.parse(fs.readFileSync(TITLES_FILE, 'utf8'))) articleTitles.add(t)
  console.log(`этап 1 пропущен: ${articleTitles.size} статей из прошлого запуска`)
} else {
  const seenCats = new Set()
  let catQueue = ROOTS.map((c) => ({ cat: c, depth: 0 }))
  const MAX_CATS = 2200
  const SKIP_CAT = /персонажи|писателям|поэтам|архитект|культуры России$|природ|заказник|парки|заповедник|некропол|кладбищ/

  console.log('обход категорий...')
  while (catQueue.length && seenCats.size < MAX_CATS) {
    const { cat, depth } = catQueue.shift()
    if (seenCats.has(cat)) continue
    seenCats.add(cat)
    let cont = undefined
    do {
      const params = { action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: 500, cmtype: 'page|subcat' }
      if (cont) params.cmcontinue = cont
      const d = await api(params)
      for (const m of d.query.categorymembers || []) {
        if (m.ns === 0) articleTitles.add(m.title)
        else if (m.ns === 14 && depth < 3 && !SKIP_CAT.test(m.title) && !seenCats.has(m.title)) {
          catQueue.push({ cat: m.title, depth: depth + 1 })
        }
      }
      cont = d.continue && d.continue.cmcontinue
    } while (cont)
    if (seenCats.size % 50 === 0) console.log(`  категорий: ${seenCats.size}, статей: ${articleTitles.size}`)
  }
  console.log(`категорий: ${seenCats.size}, статей-кандидатов: ${articleTitles.size}`)
  fs.writeFileSync(TITLES_FILE, JSON.stringify([...articleTitles], null, 1), 'utf8')
}

// --- Этап 2: батчи по 50: координаты + интро ---
const CP = 'scripts/wiki-monuments-raw.json'
let raw = []
if (fs.existsSync(CP)) {
  try { raw = JSON.parse(fs.readFileSync(CP, 'utf8')) } catch {}
}
const doneTitles = new Set(raw.map((r) => r.title))

const SKIP_TITLE = /^Список|^(Категория|Шаблон|Файл):|культуры$/i
const titles = [...articleTitles].filter((t) => !SKIP_TITLE.test(t) && !doneTitles.has(t))
console.log(`к выгрузке: ${titles.length} статей`)

function saveRaw() {
  fs.writeFileSync(CP, JSON.stringify(raw, null, 1), 'utf8')
}

for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50)
  try {
    const d = await api({
      action: 'query', titles: batch.join('|'), redirects: 1,
      prop: 'coordinates|extracts', coprimary: 'primary',
      exintro: 1, explaintext: 1, exlimit: 'max'
    })
    const pages = d.query ? Object.values(d.query.pages || {}) : []
    let withCoords = 0
    for (const p of pages) {
      if (p.missing || !p.title) continue
      if (doneTitles.has(p.title)) continue
      const c = p.coordinates && p.coordinates[0]
      const extract = (p.extract || '').replace(/\s+/g, ' ').trim()
      if (!c || !extract || extract.length < 150) { doneTitles.add(p.title); continue }
      raw.push({ title: p.title, lat: c.lat, lng: c.lon, extract: extract.slice(0, 1500) })
      withCoords++
      doneTitles.add(p.title)
    }
    saveRaw()
    console.log(`батч ${Math.floor(i / 50) + 1}/${Math.ceil(titles.length / 50)}: +${withCoords} (всего ${raw.length})`)
  } catch (e) {
    console.log(`  батч ${Math.floor(i / 50) + 1}: ${e.message}`)
  }
}
saveRaw()
console.log(`Готово: ${raw.length} статей с координатами и выжимками`)

