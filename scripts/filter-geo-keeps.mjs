// Отбор из находок геопоиска: оставляем только файлы, чьи названия прямо
// называют искомый памятник (проверено вручную по списку). Город не в счёт —
// точка и так подтверждает место, нужен именно СЮЖЕТ.
import fs from 'node:fs'

const KEEP_GEO_IDS = [213, 216, 218, 220, 230, 256, 259, 261, 279, 281, 293, 295, 300, 307, 323, 327, 334, 335, 336, 340, 342, 344, 345, 350, 352, 357]

const p = 'scripts/photo-found.json'
const all = JSON.parse(fs.readFileSync(p, 'utf8'))

const kept = all.filter((f) => {
  if (!String(f.via || '').startsWith('commons-geo:')) return true // прежние источники
  return KEEP_GEO_IDS.includes(f.id)
})

fs.writeFileSync(p, JSON.stringify(kept, null, 2), 'utf8')
console.log(`в photo-found.json: ${kept.length} записей (гео-находок оставлено ${KEEP_GEO_IDS.length})`)

