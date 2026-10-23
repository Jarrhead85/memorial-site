// Поиск реальных фотографий памятников в открытых источниках (Wikimedia Commons).
// Минимум запросов: 1-2 поиска на памятник, пауза 8с, чекпоинт для перезапуска.
// Результат: scripts/photo-found.json + scripts/photo-report.txt
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 8000
const BACKOFFS = [30000, 60000, 120000, 300000]

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const CP_FILE = 'scripts/photo-checkpoint.json'
let checkpoint = { done: {}, found: [] }
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

async function commonsSearch(query) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.searchParams.set('format', 'json')
  u.searchParams.set('action', 'query')
  u.searchParams.set('generator', 'search')
  u.searchParams.set('gsrsearch', query)
  u.searchParams.set('gsrnamespace', '6')
  u.searchParams.set('gsrlimit', '8')
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
  const ft = String(fileTitle).toLowerCase().replace(/ё/g, 'е')
  const tt = tokens(monument.title)
  if (!tt.length) return 0
  let overlap = 0
  for (const t of tt) {
    if (ft.split(/[\s_\-–—,.:;()]+/).some((w) => stemMatch(w, t))) overlap++
  }
  if (!overlap) return 0
  let score = overlap * 10
  const city = String(monument.city).toLowerCase().replace(/ё/g, 'е')
  if (ft.includes(city)) score += 8
  return score
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

async function findPhoto(m) {
  const cityInTitle = m.title.toLowerCase().includes(m.city.toLowerCase().slice(0, 5))
  const queries = cityInTitle ? [m.title] : [`${m.title} ${m.city}`, m.title]
  for (const q of queries) {
    const data = await commonsSearch(q)
    const pages = data.query ? Object.values(data.query.pages || {}) : []
    const candidates = pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .map((p) => ({ title: p.title, ii: p.imageinfo[0], score: scoreFile(p.title, m) }))
      .filter((c) => c.score >= 10)
      .filter((c) => /image\/(jpeg|png|webp)/.test(c.ii.mime))
      .filter((c) => c.ii.width >= 600 && c.ii.width >= c.ii.height * 0.5 && c.ii.width <= c.ii.height * 3.2)
      .sort((a, b) => b.score - a.score)
    for (const c of candidates.slice(0, 2)) {
      const url = c.ii.thumburl || c.ii.url
      if (await verifyImage(url)) {
        return {
          url,
          source: 'commons.wikimedia.org',
          sourceUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(c.title.replace(/ /g, '_')),
          via: 'commons:' + c.title
        }
      }
    }
  }
  return null
}

const targets = monuments.filter(
  (m) => !(m.images && m.images.length) && !(m.id in checkpoint.done)
)
console.log(`Target monuments: ${targets.length} (done before: ${Object.keys(checkpoint.done).length})`)

let i = 0
let limitWaits = 0
for (const m of targets) {
  i++
  let r = null
  try {
    r = await findPhoto(m)
  } catch (e) {
    if (/rate limited/.test(e.message)) limitWaits++
    console.log(`    error: ${e.message}`)
  }
  if (r) {
    checkpoint.found.push({ id: m.id, title: m.title, city: m.city, ...r })
    console.log(`[${i}/${targets.length}] FOUND  #${m.id} ${m.title} — ${r.via}`)
  } else {
    console.log(`[${i}/${targets.length}] miss   #${m.id} ${m.title}`)
  }
  checkpoint.done[m.id] = r ? 'found' : 'miss'
  fs.writeFileSync(CP_FILE, JSON.stringify(checkpoint, null, 2), 'utf8')
  fs.writeFileSync('scripts/photo-found.json', JSON.stringify(checkpoint.found, null, 2), 'utf8')
}
console.log(`Rate-limit waits: ${limitWaits}`)

const stillMissing = monuments
  .filter((m) => !(m.images && m.images.length) && checkpoint.done[m.id] === 'miss')
fs.writeFileSync(
  'scripts/photo-report.txt',
  `Found total: ${checkpoint.found.length}\nChecked without result: ${stillMissing.length}\n\n` +
    stillMissing.map((x) => `#${x.id} ${x.title} (${x.city})`).join('\n'),
  'utf8'
)
console.log(`\nDone. Found total: ${checkpoint.found.length}, misses: ${stillMissing.length}`)
