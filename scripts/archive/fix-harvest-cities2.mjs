// Сверка новых харвест-записей (id 265-307):
//  - 265-274 — дубликаты уже исправленных/удалённых записей (появились после
//    отката, когда ключи дедупликации поменялись) — удаляем;
//  - 293 «Памятник Чайковскому» — стоит у консерватории в Москве, а не в
//    городе Чайковский Пермского края — исправляем;
//  - остальные (275-307) сверены по выжимкам — верны.
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const REMOVE = [265, 266, 267, 268, 269, 270, 271, 272, 273, 274]
const FIXES = {
  293: { city: 'Москва', region: 'Москва' }
}

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
