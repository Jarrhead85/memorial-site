// Ручная сверка харвест-записей (проверены все 58 по выжимкам статей).
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const FIXES = {
  213: { city: 'Бородино', region: 'Московская область' },
  216: { city: 'Москва', region: 'Москва' },
  226: { city: 'Тобольск', region: 'Тюменская область' },
  227: { city: 'Москва', region: 'Москва' },
  235: { city: 'Санкт-Петербург', region: 'Санкт-Петербург' },
  240: { city: 'Усть-Лабинск' },
  241: { city: 'Грозный', region: 'Чечня' },
  263: { city: 'Саранск', region: 'Мордовия' }
}
const REMOVE = [231, 239, 265] // 231 — уничтожен в 2005; 239/265 — природные объекты

let fixed = 0
const removed = []
const kept = data.filter((m) => {
  if (REMOVE.includes(m.id)) {
    removed.push(`#${m.id} ${m.title}`)
    return false
  }
  const fix = FIXES[m.id]
  if (fix) {
    Object.assign(m, fix)
    if (m.facts && m.facts.length) m.facts[0] = `${m.city}, ${m.region}`
    fixed++
    console.log(`FIX #${m.id} ${m.title} -> ${m.city}, ${m.region}`)
  }
  return true
})

fs.writeFileSync(p, `export const monuments = ${JSON.stringify(kept, null, 2)}\n`, 'utf8')
console.log(`\nисправлено: ${fixed}, удалено: ${removed.length}, всего: ${kept.length}`)
