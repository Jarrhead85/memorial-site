// Откат всех записей харвеста (id >= 208 с wikipedia-источником) —
// чтобы слить заново с аккуратной проверкой города.
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const kept = data.filter((m) => !(m.id >= 208 && m.factsSource && /wikipedia/.test(m.factsSource.label || '')))
fs.writeFileSync(p, `export const monuments = ${JSON.stringify(kept, null, 2)}\n`, 'utf8')
console.log(`осталось: ${kept.length} (удалено харвест-записей: ${data.length - kept.length})`)
