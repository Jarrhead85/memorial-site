// Сопоставление статей-памятников (wiki-monuments-raw.json) с поселениями
// 1000+ (settlements-1k.json): ближайшее поселение в 12 км, при этом название
// поселения обязано встретиться в заголовке или выжимке статьи (защита от
// подмен, как с «Ершовым» и «Чайковским»). Дедуп против каталога.
// Результат: scripts/village-candidates.json
import fs from 'node:fs'

const raw = JSON.parse(fs.readFileSync('scripts/wiki-monuments-raw.json', 'utf8'))
const settlements = JSON.parse(fs.readFileSync('scripts/settlements-1k.json', 'utf8'))
const { monuments } = await import('../src/data/monuments.js')

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()

const km = (a, b) => {
  const dLat = (a.lat - b.lat) * 111.32
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

function mentions(text, name) {
  const n = norm(name)
  if (!n) return false
  if (text.includes(n)) return true
  // словоформы: «Мячково/Мячкова», «Разумное/Разумного» — ствол 5+ символов
  if (n.length >= 5) {
    const stem = n.slice(0, Math.max(5, n.length - 2))
    if (stem.length >= 5 && text.includes(stem)) return true
  }
  return false
}

// дедуп-ключи каталога
const existingTitles = new Set(monuments.map((m) => norm(m.title)))
const existingPoints = monuments.map((m) => ({ lat: m.coordinates.lat, lng: m.coordinates.lng, title: m.title }))

const SKIP_TITLE = /^Список|памятник природы|природный|заказник|заповедник|могильник|археолог|курган/i
const BORING = /ленин(а|у|ский)?\b|ульянов/i

const UNUSUAL = /кото?|кош|собак|пёс|волк|медвед|заяц|лось|олень|тюлен|кит|дельфин|рыб|треск|селёд|гриб|яблон|вишн|арбуз|огур|лук|чеснок|сыр|хлеб|пряник|пельмен|вареник|блин|мороженое|шоколад|самовар|чай|клизм|утюг|ботинок|сапог|клавиатур|рубл|копейк|шпрот|комар|муравей|пчел|ёж|ежик|свин|корова|лошад|верблюд|обезьян|слон|жираф|фонтан|дворник|сантехник|курьер|студент|пуговиц|скрипк|гитар|телефон|почтальон|трубочист|кочегар|электрик|геолог|шахтер|шахтёр|такси|трамвай|троллейбус|автобус|поезд|пароход|самолёт|самолет|вертолёт|танк|трактор|комбайн|учител|врач|доктор|медсестр|бабк|дед|ребён|ребен|мать|матери|беремен|колодец|ключ|родник|сватб|любов|поцелу|счасть|мечт|детств/

const candidates = []
let rejectedDup = 0
let rejectedDist = 0
let rejectedMention = 0

for (const r of raw) {
  if (SKIP_TITLE.test(r.title)) continue
  const titleN = norm(r.title)

  // ближайшее поселение 1000+
  let best = null
  for (const s of settlements) {
    const d = km(r, s)
    if (d <= 12 && (!best || d < best.d)) best = { s, d }
  }
  if (!best) { rejectedDist++; continue }

  const text = titleN + ' ' + norm(r.extract)
  if (!mentions(text, best.s.name)) { rejectedMention++; continue }

  // дедуп: тот же заголовок или точка в 350 м от существующего памятника
  if (existingTitles.has(titleN)) { rejectedDup++; continue }
  if (existingPoints.some((p) => km(r, p) < 0.35)) { rejectedDup++; continue }

  const unusual = UNUSUAL.test(r.title + ' ' + r.extract.slice(0, 300))
  const boring = BORING.test(r.title)
  candidates.push({
    title: r.title,
    settlement: best.s.name,
    pop: best.s.pop,
    distKm: Math.round(best.d * 10) / 10,
    lat: r.lat,
    lng: r.lng,
    extract: r.extract,
    unusual,
    boring,
    score: (unusual ? 2 : 0) + (boring ? -2 : 0) + (best.s.pop >= 10000 ? 1 : 0)
  })
}

// сортировка: необычные первыми, внутри — по убыванию населения
candidates.sort((a, b) => b.score - a.score || b.pop - a.pop)
fs.writeFileSync('scripts/village-candidates.json', JSON.stringify(candidates, null, 1), 'utf8')

console.log(`кандидатов: ${candidates.length} (дубли: ${rejectedDup}, мимо поселений: ${rejectedDist}, без упоминания: ${rejectedMention})`)
const byPop = { '10k+': 0, '1-10k': 0 }
for (const c of candidates) byPop[c.pop >= 10000 ? '10k+' : '1-10k']++
console.log('по размеру поселения:', JSON.stringify(byPop), '| необычных:', candidates.filter((c) => c.unusual).length)
console.log('\nТоп-30:')
for (const c of candidates.slice(0, 30)) {
  console.log(`  ${c.unusual ? '★' : ' '} ${c.title.slice(0, 55)} — ${c.settlement} (${c.pop}) [${c.distKm}км]`)
}
