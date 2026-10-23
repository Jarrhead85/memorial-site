// Откат add-pending.mjs: 12 отложенных статей оказались списочными
// («Памятники Белорецка», «Список памятников города Энгельс»...) —
// это не отдельные памятники. Оставляем только Барбашова (Владикавказ).
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^export const monuments = /, '').replace(/;\s*$/, ''))
const kept = data.filter((m) => m.slug !== 'pamyatnik-petru-barbashovu-vladikavkaz')
fs.writeFileSync(p, `export const monuments = ${JSON.stringify(kept, null, 2)}\n`, 'utf8')
console.log(`осталось: ${kept.length} (удалено: ${data.length - kept.length})`)
