// Слияние отобранных кандидатов из village-candidates.json в каталог.
// Отбор выполнен вручную (список названий ниже); регион уточняется
// обратным геокодированием Nominatim (30 запросов, 1.4с пауза).
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PICKED = new Set([
  'Памятник Муравьёву-Амурскому (Владивосток)',
  'Памятник Татищеву (Тольятти)',
  'Памятник борцам за Советскую власть в Дагестане',
  'Памятник адмиралу Колчаку (Иркутск)',
  'Памятник Мандельштаму (Владивосток)',
  'Памятник Тарасу Шевченко (Орск)',
  'Памятник Павлу I (Витали)',
  'Памятник воинам-землякам (Пеледуй)'
])

const cands = JSON.parse(fs.readFileSync('scripts/village-candidates.json', 'utf8'))
const picked = cands.filter((c) => PICKED.has(c.title))
console.log('отобрано:', picked.length)

async function reverseRegion(lat, lng) {
  const u = new URL('https://nominatim.openstreetmap.org/reverse')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('lat', String(lat))
  u.searchParams.set('lon', String(lng))
  u.searchParams.set('zoom', '5')
  u.searchParams.set('accept-language', 'ru')
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!r.ok) return null
  const d = await r.json()
  return (d.address && (d.address.state || d.address.region)) || null
}

const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
function slugify(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
    .replace(/[«»"'(),.!?§\[\]:;—–]/g, '')
    .split(/\s+/).slice(0, 5).join('-')
    .split('').map((c) => CYR[c] ?? c).join('')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const usedSlugs = new Set(data.map((m) => m.slug))
let id = Math.max(...data.map((m) => m.id))

const UNUSUAL = /бабр|фонтан|комсомол|победили|гимназист|ворот|столб|транспорт|верстов/

const added = []
for (const c of picked) {
  let region = await reverseRegion(c.lat, c.lng)
  await sleep(1400)
  if (!region) region = '—'
  let slug = slugify(c.title)
  if (usedSlugs.has(slug)) slug += '-2'
  id += 1
  usedSlugs.add(slug)
  added.push({
    id, slug,
    title: c.title,
    city: c.settlement,
    region,
    year: null,
    category: c.unusual || UNUSUAL.test(c.title) ? 'Необычные' : 'Исторические',
    image: '',
    shortDescription: c.extract.slice(0, 220),
    fullHistory: c.extract,
    coordinates: { lat: c.lat, lng: c.lng },
    facts: [
      `${c.settlement}${c.pop ? `, население ~${c.pop.toLocaleString('ru-RU')} чел.` : ''}`,
      region !== '—' ? region : null
    ].filter(Boolean),
    likes: 0, images: [],
    factsSource: {
      label: 'ru.wikipedia.org',
      url: 'https://ru.wikipedia.org/wiki/' + encodeURIComponent(c.title.replace(/ /g, '_'))
    }
  })
  console.log(`+#${id} ${c.title} — ${c.settlement} (${region})`)
}

fs.writeFileSync(p, `export const monuments = ${JSON.stringify([...data, ...added], null, 2)}\n`, 'utf8')
console.log(`добавлено: ${added.length}, всего: ${data.length + added.length}`)
