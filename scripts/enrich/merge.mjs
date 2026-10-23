// Слив результатов агентов-исследователей в каталог:
//  - out-N.json: верификация существующих записей (real/fake/uncertain)
//  - out-new-N.json: новые памятники
// Правила:
//  - real: обновляем историю/факты/источник/координаты, фото добавляем к существующим
//  - fake: удаляем запись (политика проекта — только проверяемые факты)
//  - uncertain: оставляем как есть, отмечаем в отчёте
//  - новые: добавляем в конец, id продолжаются, slug дедуплицируется
//  - поле image удаляется у всех (единственный источник фото — images)
import fs from 'node:fs'

const DIR = 'scripts/enrich'
const FILE = 'src/data/monuments.js'
const { monuments } = await import('../../src/data/monuments.js')

const report = { real: 0, updated: 0, removedFake: [], uncertain: [], photosAdded: 0, newAdded: [], skippedFiles: [] }

function loadJson(name) {
  const p = `${DIR}/${name}`
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    report.skippedFiles.push(`${name}: ${e.message}`)
    return null
  }
}

// --- 1. Верификация существующих ---
const byId = new Map(monuments.map((m) => [m.id, m]))
for (let i = 1; i <= 8; i++) {
  const out = loadJson(`out-${i}.json`)
  if (!out) continue
  for (const r of out) {
    const m = byId.get(r.id)
    if (!m) continue
    if (r.verdict === 'fake') {
      report.removedFake.push({ id: m.id, title: m.title, city: m.city, note: (r.notes || '').slice(0, 300) })
      continue
    }
    if (r.verdict === 'uncertain') {
      report.uncertain.push({ id: m.id, title: r.title || m.title, note: (r.notes || '').slice(0, 300) })
      continue
    }
    if (r.verdict !== 'real') continue
    report.real++
    const fresh = r.fullHistory && r.fullHistory.length > 200 && !/(Самые любопытные и неожиданные|Такие памятники удивляют)/.test(r.fullHistory)
    if (fresh) {
      m.fullHistory = r.fullHistory.trim()
      report.updated++
    }
    if (r.shortDescription && r.shortDescription.length > 30) m.shortDescription = r.shortDescription.trim().slice(0, 220)
    if (r.title && r.title.length > 2) m.title = r.title
    if (r.city) m.city = r.city
    if (r.region) m.region = r.region
    if (Number.isFinite(r.year) && r.year > 1500 && r.year < 2100) m.year = r.year
    if (Array.isArray(r.facts) && r.facts.length >= 2) m.facts = r.facts.slice(0, 6)
    if (r.factsSource && r.factsSource.url && /^https?:\/\//.test(r.factsSource.url)) {
      m.factsSource = { label: r.factsSource.label || 'Источник', url: r.factsSource.url }
    }
    const coords = r.coordinates
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) &&
        coords.lat > 41 && coords.lat < 82 && coords.lng > 19 && coords.lng < 190) {
      m.coordinates = { lat: coords.lat, lng: coords.lng }
    }
    if (Array.isArray(r.photos)) {
      const have = new Set((m.images || []).map((x) => x.url))
      for (const ph of r.photos) {
        if (ph && /^https:\/\/commons\.wikimedia\.org\//.test(ph.url) && !have.has(ph.url)) {
          m.images = m.images || []
          m.images.push({ url: ph.url, source: 'commons.wikimedia.org', sourceUrl: ph.sourceUrl || null })
          report.photosAdded++
        }
      }
    }
  }
}

// --- 2. Новые памятники ---
const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
function slugify(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
    .replace(/[«»"'(),.!?§\[\]:;—–]/g, '')
    .split(/\s+/).slice(0, 5).join('-')
    .split('').map((c) => CYR[c] ?? c).join('')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'monument'
}

const takenSlugs = new Set(monuments.map((m) => m.slug))
const normTitle = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()
const seenTitles = new Set(monuments.map((m) => normTitle(m.title) + '|' + normTitle(m.city)))

for (const name of ['out-new-1.json', 'out-new-2.json']) {
  const out = loadJson(name)
  if (!out) continue
  for (const r of out) {
    if (!r || !r.title || !r.fullHistory || !r.city || !r.region) continue
    if (r.verdict && r.verdict !== 'real') continue
    const key = normTitle(r.title) + '|' + normTitle(r.city)
    if (seenTitles.has(key)) continue // дубли между агентами/каталогом
    seenTitles.add(key)
    const coords = r.coordinates
    if (!(Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng) &&
        coords.lat > 41 && coords.lat < 82 && coords.lng > 19 && coords.lng < 190)) continue
    let slug = slugify(r.slugBase && /^[a-z0-9-]+$/.test(r.slugBase) ? r.slugBase : r.title)
    if (takenSlugs.has(slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    takenSlugs.add(slug)
    const images = (Array.isArray(r.photos) ? r.photos : [])
      .filter((ph) => ph && /^https:\/\/commons\.wikimedia\.org\//.test(ph.url))
      .slice(0, 3)
      .map((ph) => ({ url: ph.url, source: 'commons.wikimedia.org', sourceUrl: ph.sourceUrl || null }))
    monuments.push({
      id: monuments.reduce((mx, m) => Math.max(mx, m.id), 0) + 1,
      slug,
      title: r.title,
      city: r.city,
      region: r.region,
      year: Number.isFinite(r.year) && r.year > 1500 && r.year < 2100 ? r.year : null,
      category: ['Необычные', 'Исторические', 'Гастрономические', 'Архитектурные', 'Мини-скульптуры'].includes(r.category) ? r.category : 'Необычные',
      shortDescription: (r.shortDescription || r.fullHistory.slice(0, 200)).trim().slice(0, 220),
      fullHistory: r.fullHistory.trim(),
      coordinates: { lat: coords.lat, lng: coords.lng },
      facts: (Array.isArray(r.facts) ? r.facts : []).slice(0, 6),
      likes: 0,
      images,
      factsSource: r.factsSource && r.factsSource.url ? { label: r.factsSource.label || 'Источник', url: r.factsSource.url } : null
    })
    report.newAdded.push(`${r.title} (${r.city})${images.length ? ' +фото' : ''}`)
  }
}

// --- 3. Поле image уходит у всех; фейковые записи удаляются ---
const fakeIds = new Set(report.removedFake.map((x) => x.id))
const imageMismatches = []
const final = monuments
  .filter((m) => !fakeIds.has(m.id))
  .map((m) => {
    const { image, ...rest } = m
    if (image && image !== (m.images && m.images[0] && m.images[0].url)) {
      imageMismatches.push(m.title)
    }
    return rest
  })
if (imageMismatches.length) {
  console.log('ВНИМАНИЕ: image отличался от images[0] у:', imageMismatches.join('; '))
}

// sanity: слаги уникальны; все фото живут в images (image больше нет)
const slugs = new Set()
for (const m of final) {
  if (slugs.has(m.slug)) throw new Error('duplicate slug: ' + m.slug)
  slugs.add(m.slug)
}

fs.writeFileSync(FILE, `export const monuments = ${JSON.stringify(final, null, 2)}\n`, 'utf8')
fs.writeFileSync(`${DIR}/merge-report.json`, JSON.stringify(report, null, 2), 'utf8')

const withPhoto = final.filter((m) => m.images && m.images.length).length
console.log(`Итог: ${final.length} памятников (было ${monuments.length - report.newAdded.length}), с фото: ${withPhoto}`)
console.log(`real: ${report.real}, истории обновлены: ${report.updated}, фейков удалено: ${report.removedFake.length}, uncertain: ${report.uncertain.length}, новых: ${report.newAdded.length}, фото добавлено: ${report.photosAdded}`)
if (report.skippedFiles.length) console.log('пропущены:', report.skippedFiles.join('; '))
