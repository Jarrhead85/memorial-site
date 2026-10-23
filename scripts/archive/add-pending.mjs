// Добавление 12 геокодированных отложенных находок (координата — центр
// города/поселения, у статей не было своих координат).
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const pending = JSON.parse(fs.readFileSync('scripts/harvest-pending-geocoded.json', 'utf8'))

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()
const existingTitles = new Set(data.map((m) => norm(m.title) + '|' + norm(m.city)))
const usedSlugs = new Set(data.map((m) => m.slug))
let id = Math.max(...data.map((m) => m.id))

const added = []
for (const f of pending) {
  const key = norm(f.title) + '|' + norm(f.city)
  if (existingTitles.has(key)) continue
  if (usedSlugs.has(f.slug)) continue
  id += 1
  usedSlugs.add(f.slug)
  added.push({
    id,
    slug: f.slug,
    title: f.title,
    city: f.city,
    region: f.region,
    year: null,
    category: f.category || 'Исторические',
    image: '',
    shortDescription: f.short || f.extract.slice(0, 220),
    fullHistory: f.extract,
    coordinates: f.coords,
    facts: [
      `${f.city}, ${f.region}`,
      `Население города: ${f.population.toLocaleString('ru-RU')} чел.`
    ],
    likes: 0,
    images: [],
    factsSource: { label: 'ru.wikipedia.org', url: f.wikiUrl }
  })
  console.log(`+#${id} ${f.title} — ${f.city}`)
}

fs.writeFileSync(p, `export const monuments = ${JSON.stringify([...data, ...added], null, 2)}\n`, 'utf8')
console.log(`добавлено: ${added.length}, всего в каталоге: ${data.length + added.length}`)
