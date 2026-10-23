// Пассивный добор фото: геопоиск по Wikimedia Commons.
// У всех памятников есть координаты, а у многих файлов Commons — тоже,
// поэтому ищем файлы в радиусе от памятника и сверяем смысловые слова названия.
// Это ловит фото, которые не находятся текстовым поиском (названия файлов
// вроде «Калининград, скульптура лягушки.jpg» без слов «памятник Хомлин»).
// Пауза 8с + бэкоффы на 429; чекпоинт photo-geo-checkpoint.json;
// находки дописываются в общий scripts/photo-found.json (его ждут
// curate-found.mjs и merge-found-photos.mjs).
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 8000
const BACKOFFS = [30000, 60000, 120000, 300000]

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const CP_FILE = 'scripts/photo-geo-checkpoint.json'
let checkpoint = { done: {} }
if (fs.existsSync(CP_FILE)) {
  try { checkpoint = JSON.parse(fs.readFileSync(CP_FILE, 'utf8')) } catch {}
}

function readFound() {
  try { return JSON.parse(fs.readFileSync('scripts/photo-found.json', 'utf8')) } catch { return [] }
}
function appendFound(rec) {
  const arr = readFound()
  if (!arr.some((f) => f.id === rec.id)) arr.push(rec)
  fs.writeFileSync('scripts/photo-found.json', JSON.stringify(arr, null, 2), 'utf8')
}

let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

async function geoSearch(m, radius) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.searchParams.set('format', 'json')
  u.searchParams.set('action', 'query')
  u.searchParams.set('generator', 'geosearch')
  u.searchParams.set('ggscoord', `${m.coordinates.lat}|${m.coordinates.lng}`)
  u.searchParams.set('ggsradius', String(radius))
  u.searchParams.set('ggsnamespace', '6')
  u.searchParams.set('ggslimit', '30')
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

function stemMatch(a, b) {
  if (a === b) return true
  const min = Math.min(5, a.length, b.length)
  if (min < 5) return a === b
  return a.slice(0, min) === b.slice(0, min)
}

function scoreFile(fileTitle, monument) {
  const words = String(fileTitle).toLowerCase().replace(/ё/g, 'е').split(/[\s_\-–—,.:;()]+/)
  const tt = tokens(monument.title)
  let overlap = 0
  for (const t of tt) if (words.some((w) => stemMatch(w, t))) overlap++
  return overlap * 10
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

async function findPhotoGeo(m) {
  for (const radius of [150, 500]) {
    const data = await geoSearch(m, radius)
    const pages = data.query ? Object.values(data.query.pages || {}) : []
    const candidates = pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .map((p) => ({ title: p.title, ii: p.imageinfo[0], score: scoreFile(p.title, m) }))
      .filter((c) => c.score >= 10)
      .filter((c) => /image\/(jpeg|png|webp)/.test(c.ii.mime))
      .filter((c) => c.ii.width >= 500 && c.ii.width >= c.ii.height * 0.5 && c.ii.width <= c.ii.height * 3.2)
      .sort((a, b) => b.score - a.score)
    for (const c of candidates.slice(0, 2)) {
      const url = c.ii.thumburl || c.ii.url
      if (await verifyImage(url)) {
        return {
          url,
          source: 'commons.wikimedia.org',
          sourceUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(c.title.replace(/ /g, '_')),
          via: 'commons-geo:' + c.title
        }
      }
    }
  }
  return null
}

const targets = monuments.filter(
  (m) => !(m.images && m.images.length) && !(m.id in checkpoint.done)
)
console.log(`Geo targets: ${targets.length} (done before: ${Object.keys(checkpoint.done).length})`)

let i = 0
let limitWaits = 0
for (const m of targets) {
  i++
  let r = null
  try {
    r = await findPhotoGeo(m)
  } catch (e) {
    if (/rate limited/.test(e.message)) limitWaits++
    console.log(`    error: ${e.message}`)
  }
  if (r) {
    appendFound({ id: m.id, title: m.title, city: m.city, ...r })
    console.log(`[${i}/${targets.length}] FOUND  #${m.id} ${m.title} — ${r.via}`)
    checkpoint.done[m.id] = 'found'
  } else {
    console.log(`[${i}/${targets.length}] miss   #${m.id} ${m.title}`)
    checkpoint.done[m.id] = 'miss'
  }
  fs.writeFileSync(CP_FILE, JSON.stringify(checkpoint, null, 2), 'utf8')
}
console.log(`Rate-limit waits: ${limitWaits}`)
const foundGeo = Object.entries(checkpoint.done).filter(([, v]) => v === 'found').length
console.log(`Done. Geo found: ${foundGeo}/${Object.keys(checkpoint.done).length}`)
