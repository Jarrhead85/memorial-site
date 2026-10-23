// Сводит находки двух проходов (текстовый+геопоиск -> photo-found.json,
// Openverse -> photo-found-ov.json) в один photo-found.json.
// Записи Openverse заменяют записи с тем же id: у них полнее атрибуция
// (автор, лицензия CC, страница источника).
import fs from 'node:fs'

function read(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return [] }
}

const base = read('scripts/photo-found.json')
const ov = read('scripts/photo-found-ov.json')
const series = read('scripts/photo-found-series.json')

const byId = new Map(base.map((f) => [f.id, f]))
for (const f of ov) byId.set(f.id, f)
for (const f of series) byId.set(f.id, f)

const merged = [...byId.values()]
fs.writeFileSync('scripts/photo-found.json', JSON.stringify(merged, null, 2), 'utf8')
console.log(`merged: ${merged.length} записей (base ${base.length}, ov ${ov.length}, series ${series.length})`)
