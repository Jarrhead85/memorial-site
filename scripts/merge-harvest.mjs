// Слив результатов харвеста «вся страна» (harvest-found.json) в каталог.
// Берём записи с координатами (для карты); без координат — откладываем
// в harvest-pending.json до геокодирования.
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const src = fs.readFileSync(p, 'utf8')
const data = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const found = JSON.parse(fs.readFileSync('scripts/harvest-found.json', 'utf8'))

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()
const existingSlugs = new Set(data.map((m) => m.slug))
const existingTitles = new Set(data.map((m) => norm(m.title) + '|' + norm(m.city)))

let id = Math.max(...data.map((m) => m.id))
const usedSlugs = new Set(existingSlugs)
const added = []
const pending = []

for (const f of found) {
  const tKey = norm(f.title) + '|' + norm(f.city)
  if (existingTitles.has(tKey)) continue
  if (!f.coords || !f.extract) { pending.push(f); continue }
  // выжимка, усечённая до первых предложений, нужна для ручной сверки города
  const extractSnippet = f.extract.replace(/\s+/g, ' ').slice(0, 200)
  const coordinates = { lat: f.coords.lat, lng: f.coords.lng }
  let slug = f.slug || 'monument'
  if (usedSlugs.has(slug)) slug = slug + '-' + norm(f.city).replace(/[^a-zа-я0-9]/g, '')
  if (usedSlugs.has(slug)) continue
  id += 1
  usedSlugs.add(slug)
  added.push({
    id,
    slug,
    title: f.title,
    city: f.city,
    region: f.region,
    year: null,
    category: f.category || 'Исторические',
    image: '',
    shortDescription: f.short || f.extract.slice(0, 220),
    fullHistory: f.extract,
    coordinates,
    facts: [
      `${f.city}, ${f.region}`,
      `Население города: ${f.population.toLocaleString('ru-RU')} чел.`
    ],
    likes: 0,
    images: [],
    factsSource: { label: 'ru.wikipedia.org', url: f.wikiUrl },
    extractSnippet
  })
}

fs.writeFileSync(p, `export const monuments = ${JSON.stringify([...data, ...added], null, 2)}\n`, 'utf8')
if (pending.length) fs.writeFileSync('scripts/harvest-pending.json', JSON.stringify(pending, null, 2), 'utf8')
console.log(`добавлено: ${added.length}; отложено без координат: ${pending.length}; всего в каталоге: ${data.length + added.length}`)
console.log(added.map((m) => `#${m.id} ${m.title} — ${m.city}`).join('\n'))
