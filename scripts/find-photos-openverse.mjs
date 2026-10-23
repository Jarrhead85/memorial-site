// Добор фото через Openverse (агрегатор свободных фото: Flickr и др.).
// Только свободные лицензии (CC BY / BY-SA / CC0 / Public Domain Mark),
// у каждой находки есть страница источника для атрибуции.
// Анонимные лимиты API: 20 запросов/мин, 200/день — идём с паузой 3.5с,
// один запрос на памятник. Результат: scripts/photo-found-ov.json
// (отдельный файл: геопоиск параллельно пишет в photo-found.json).
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 3500

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const CP_FILE = 'scripts/photo-ov-checkpoint.json'
let checkpoint = { done: {} }
if (fs.existsSync(CP_FILE)) {
  try { checkpoint = JSON.parse(fs.readFileSync(CP_FILE, 'utf8')) } catch {}
}

let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

const FREE_LICENSES = new Set(['by', 'by-sa', 'cc0', 'pdm'])

async function ovSearch(q) {
  const u = new URL('https://api.openverse.org/v1/images/')
  u.searchParams.set('q', q)
  u.searchParams.set('page_size', '8')
  await pace()
  const res = await fetch(u, { headers: { 'User-Agent': UA } })
  if (res.status === 429 || res.status === 503) throw new Error('rate limited ' + res.status)
  if (!res.ok) throw new Error('http ' + res.status)
  return res.json()
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

function scoreItem(title, monument) {
  const words = String(title).toLowerCase().replace(/ё/g, 'е').split(/[\s_\-–—,.:;()]+/)
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

async function findPhotoOv(m) {
  const data = await ovSearch(m.title)
  const results = data.results || []
  const candidates = results
    .filter((x) => FREE_LICENSES.has(String(x.license || '').toLowerCase()))
    .map((x) => ({ x, score: scoreItem(x.title || '', m) }))
    .filter((c) => c.score >= 10)
    .filter((c) => !c.x.width || (c.x.width >= 500 && c.x.width >= c.x.height * 0.5 && c.x.width <= c.x.height * 3.2))
    .sort((a, b) => b.score - a.score)
  for (const c of candidates.slice(0, 2)) {
    const x = c.x
    if (await verifyImage(x.url)) {
      return {
        url: x.url,
        source: 'openverse.org (CC ' + String(x.license).toUpperCase() + (x.creator ? ', автор: ' + x.creator : '') + ')',
        sourceUrl: x.foreign_landing_url || null,
        via: 'openverse:' + (x.title || x.id)
      }
    }
  }
  return null
}

const targets = monuments.filter(
  (m) => !(m.images && m.images.length) && !(m.id in checkpoint.done)
)
console.log(`Openverse targets: ${targets.length}`)

const found = []
let i = 0
for (const m of targets) {
  i++
  let r = null
  try {
    r = await findPhotoOv(m)
  } catch (e) {
    if (/rate limited/.test(e.message)) {
      console.log('    лимит Openverse, пауза 60с')
      await sleep(60000)
      i--
      continue // повторим этот же памятник
    }
    console.log(`    error: ${e.message}`)
  }
  if (r) {
    found.push({ id: m.id, title: m.title, city: m.city, ...r })
    checkpoint.done[m.id] = 'found'
    console.log(`[${i}/${targets.length}] FOUND  #${m.id} ${m.title} — ${r.via}`)
  } else {
    checkpoint.done[m.id] = 'miss'
    console.log(`[${i}/${targets.length}] miss   #${m.id} ${m.title}`)
  }
  fs.writeFileSync(CP_FILE, JSON.stringify(checkpoint, null, 2), 'utf8')
  fs.writeFileSync('scripts/photo-found-ov.json', JSON.stringify(found, null, 2), 'utf8')
}
console.log(`Done. Openverse found: ${found.length}`)
