// Пост-фильтр находок series-прохода: одиночное совпадение токена (score 10)
// ловит мусор («Robin williams» для «Робин Бобина», «Путин в Останкино» для
// памятника телебашне), поэтому оставляем только score >= 20 —
// минимум два совпавших смысловых слова, с учётом транслитерации.
import fs from 'node:fs'

const src = fs.readFileSync('src/data/monuments.js', 'utf8')
const monuments = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const STOP = new Set([
  'памятник', 'памятники', 'памятника', 'памятнику', 'монумент', 'монумента',
  'скульптура', 'скульптуры', 'статуя', 'стела', 'бюст', 'мемориал', 'города',
  'город', 'имени', 'великий', 'великая', 'старый', 'старая'
])

const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
function toLatin(s) {
  return String(s).toLowerCase().replace(/[а-яё]/g, (c) => CYR[c] ?? c)
}

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

function scoreText(text, monument) {
  const words = toLatin(text).split(/[\s_\-–—,.:;()|]+/)
  const tt = tokens(monument.title).map(toLatin)
  let overlap = 0
  for (const t of tt) if (words.some((w) => stemMatch(w, t))) overlap++
  return overlap * 10
}

const found = JSON.parse(fs.readFileSync('scripts/photo-found-series.json', 'utf8'))
const kept = []
for (const f of found) {
  const m = monuments.find((x) => x.id === f.id)
  const fileTitle = f.via.replace(/^commons-series:/, '')
  const score = scoreText(fileTitle, m)
  if (score >= 20) {
    kept.push(f)
    console.log(`KEEP  #${f.id} ${f.title} — ${fileTitle} (score ${score})`)
  } else {
    console.log(`DROP  #${f.id} ${f.title} — ${fileTitle} (score ${score})`)
  }
}
fs.writeFileSync('scripts/photo-found-series.json', JSON.stringify(kept, null, 2), 'utf8')
console.log(`kept ${kept.length} of ${found.length}`)
