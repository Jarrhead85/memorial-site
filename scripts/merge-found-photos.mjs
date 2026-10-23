// Сливает найденные фото (scripts/photo-found.json) в src/data/monuments.js:
//  - найденным памятникам проставляет images[0] и image
//  - остальным убирает вводящие в заблуждение стоковые заглушки (image = '')
import fs from 'node:fs'

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const found = JSON.parse(
  fs.readFileSync(
    fs.existsSync('scripts/photo-found-verified.json')
      ? 'scripts/photo-found-verified.json'
      : 'scripts/photo-found.json',
    'utf8'
  )
)

const byId = new Map(found.map((f) => [f.id, f]))
let applied = 0
let cleared = 0

for (const m of monuments) {
  const f = byId.get(m.id)
  if (f && !(m.images && m.images.length)) {
    m.images = [{ url: f.url, source: f.source, sourceUrl: f.sourceUrl }]
    m.image = f.url
    applied++
  } else if (!f && !(m.images && m.images.length)) {
    // стоковая картинка-заглушка не про тот памятник — убираем,
    // UI покажет плейсхолдер «Фото скоро появится»
    m.image = ''
    cleared++
  }
}

fs.writeFileSync(
  'src/data/monuments.js',
  `export const monuments = ${JSON.stringify(monuments, null, 2)}\n`,
  'utf8'
)
console.log(`Applied photos: ${applied}, cleared placeholders: ${cleared}`)
console.log(
  `Now with photos: ${monuments.filter((m) => m.images && m.images.length).length}/${monuments.length}`
)
