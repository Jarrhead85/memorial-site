// Добавление Барбашова (Владикавказ) — единственного валидного из отложенных.
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const pending = JSON.parse(fs.readFileSync('scripts/harvest-pending.json', 'utf8'))
const geo = JSON.parse(fs.readFileSync('scripts/harvest-pending-geocoded.json', 'utf8'))

const f0 = pending.find((f) => /Барбашову/.test(f.title))
const g = geo.find((f) => /Барбашову/.test(f.title))
if (!f0 || !g) throw new Error('Барбашов не найден в отложенных')

if (data.some((m) => m.title === f0.title && m.city === f0.city)) {
  console.log('уже в каталоге')
  process.exit(0)
}

const id = Math.max(...data.map((m) => m.id)) + 1
const entry = {
  id,
  slug: f0.slug,
  title: f0.title,
  city: f0.city,
  region: f0.region,
  year: null,
  category: f0.category || 'Исторические',
  image: '',
  shortDescription: f0.short || f0.extract.slice(0, 220),
  fullHistory: f0.extract,
  coordinates: g.coords,
  facts: [`${f0.city}, ${f0.region}`],
  likes: 0,
  images: [],
  factsSource: { label: 'ru.wikipedia.org', url: f0.wikiUrl }
}
fs.writeFileSync(p, `export const monuments = ${JSON.stringify([...data, entry], null, 2)}\n`, 'utf8')
console.log(`+#${id} ${entry.title} | ${entry.coordinates.lat}, ${entry.coordinates.lng} | всего: ${data.length + 1}`)
