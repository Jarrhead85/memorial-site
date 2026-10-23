// Третий проход: точечные запросы по одному отличительному слову названия.
// Лечит два слепых пятна предыдущих проходов:
//  1) поиск Commons соединяет слова через AND («Хомлин Дед Карл» не находит
//     файл «Медовый мост (дедушка Карл - хомлин)»: «дед» != «дедушка»);
//  2) файлы с латинскими названиями («Khomlin Grandma Martha.jpg») не
//     находятся кириллическими запросами вовсе.
// Сопоставление — с транслитерацией кириллица->латиница обеих сторон.
// Результат: scripts/photo-found-series.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 8000
const BACKOFFS = [30000, 60000, 120000, 300000]

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const CP_FILE = 'scripts/photo-series-checkpoint.json'
let checkpoint = { done: {} }
if (fs.existsSync(CP_FILE)) {
  try { checkpoint = JSON.parse(fs.readFileSync(CP_FILE, 'utf8')) } catch {}
}

const STOP = new Set([
  'памятник', 'памятники', 'памятника', 'памятнику', 'монумент', 'монумента',
  'скульптура', 'скульптуры', 'статуя', 'стела', 'бюст', 'мемориал', 'города',
  'город', 'имени', 'великий', 'великая', 'старый', 'старая'
])

function tokens(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'(),.!?§\[\]:;]/g, ' ')
    .split(/[\s\-–—]+/)
    .filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

// кириллица -> латиница для сравнения названий
const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
function toLatin(s) {
  return String(s).toLowerCase().replace(/[а-яё]/g, (c) => CYR[c] ?? c)
}

function stemMatch(a, b) {
  if (a === b) return true
  const min = Math.min(5, a.length, b.length)
  if (min < 5) return a === b
  return a.slice(0, min) === b.slice(0, min)
}

function scoreText(text, monument) {
  const words = toLatin(text).split(/[\s_\-–—,.:;()|]+/)
  const tt = tokens(monument.title).map(toLatin)
  let overlap = 0
  for (const t of tt) if (words.some((w) => stemMatch(w, t))) overlap++
  return overlap * 10
}

let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

async function searchFiles(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.searchParams.set('action', 'query')
  u.searchParams.set('format', 'json')
  u.searchParams.set('generator', 'search')
  u.searchParams.set('gsrsearch', q)
  u.searchParams.set('gsrnamespace', '6')
  u.searchParams.set('gsrlimit', '20')
  u.searchParams.set('prop', 'imageinfo')
  u.searchParams.set('iiprop', 'url|size|mime')
  u.searchParams.set('iiurlwidth', '1400')
  let lastErr
  for (let attempt = 0; attempt < BACKOFFS.length; attempt++) {
    await pace()
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA } })
      if (res.status === 429 || res.status === 503) {
        const pause = BACKOFFS[attempt]
        console.log(`    ${res.status}, пауза ${pause / 1000}с`)
        await sleep(pause)
        lastErr = new Error('rate limited ' + res.status)
        continue
      }
      if (!res.ok) throw new Error('http ' + res.status)
      const data = await res.json()
      if (!data || typeof data !== 'object') {
        lastErr = new Error('bad payload')
        continue
      }
      return data
    } catch (e) {
      lastErr = e
      await sleep(3000)
    }
  }
  throw lastErr || new Error('api failed')
}

async function verifyImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return false
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 12000
  } catch {
    return false
  }
}

const targets = monuments.filter(
  (m) => !(m.images && m.images.length) && !(m.id in checkpoint.done)
)

// один запрос на отличительное слово (самый длинный токен названия)
const queryByKey = new Map()
for (const m of targets) {
  const tt = tokens(m.title)
  if (!tt.length) continue
  const key = tt.slice().sort((a, b) => b.length - a.length)[0]
  if (!queryByKey.has(key)) queryByKey.set(key, m.id)
}
console.log(`Targets: ${targets.length}, уникальных запросов: ${queryByKey.size}`)

const found = []
function save() {
  fs.writeFileSync(CP_FILE, JSON.stringify(checkpoint, null, 2), 'utf8')
  fs.writeFileSync('scripts/photo-found-series.json', JSON.stringify(found, null, 2), 'utf8')
}

for (const [key, anchorId] of queryByKey) {
  let data = null
  try {
    data = await searchFiles(key)
  } catch (e) {
    console.log(`    error («${key}»): ${e.message}`)
  }
  const pages = data && data.query ? Object.values(data.query.pages || {}) : []
  const files = pages
    .filter((p) => p.imageinfo && p.imageinfo[0])
    .filter((p) => /image\/(jpeg|png|webp)/.test(p.imageinfo[0].mime))
    .filter((p) => p.imageinfo[0].width >= 500)
  if (files.length) {
    // каждому файлу — лучший памятник из отсутствующих
    for (const p of files) {
      let best = null
      for (const m of targets) {
        const score = scoreText(p.title, m)
        if (score >= 10 && (!best || score > best.score)) best = { m, score }
      }
      if (!best || checkpoint.done[best.m.id] === 'found') continue
      const ii = p.imageinfo[0]
      if (!(ii.width >= ii.height * 0.5 && ii.width <= ii.height * 3.2)) continue
      const url = ii.thumburl || ii.url
      if (!(await verifyImage(url))) continue
      found.push({
        id: best.m.id,
        title: best.m.title,
        city: best.m.city,
        url,
        source: 'commons.wikimedia.org',
        sourceUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')),
        via: 'commons-series:' + p.title
      })
      checkpoint.done[best.m.id] = 'found'
      console.log(`FOUND  #${best.m.id} ${best.m.title} — ${p.title} (score ${best.score})`)
      save()
    }
  }
  checkpoint.done[anchorId] = checkpoint.done[anchorId] || 'miss'
  save()
  console.log(`запрос «${key}»: файлов ${files.length}`)
}
console.log(`Done. Series found: ${found.length}`)
