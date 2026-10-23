// Точечные правки координат по итогам аудита coord-audit.json.
// Источники правок:
//  #63  Памятник луку — село Мячково, Коломенский г.о. (Nominatim: 55.2158, 38.6725);
//       заодно чиним опечатку города «Мячиково» -> «Мячково»
//  #188 Рубеж обороны Москвы — мемориал в Лобне, ул. Ленина (Nominatim POI: 56.0089, 37.4505)
//  #196 Памятник «Катюша» — на самом деле деревня Корнево, Всеволожский район
//       Ленинградской области («Зелёный пояс Славы», у ж/д ст. Рахья), не СПб
//  #197 Памятник летчикам-истребителям — фантомная запись: города «Какетск» не
//       существует, объект не подтверждается ни Nominatim (в т.ч. bounded-поиск
//       вокруг точки), ни справочниками. Удаляем.
//  #200 Защитникам Заполярья («Алёша») — точные координаты мемориала: 68.9583, 33.0827
import fs from 'node:fs'

const p = 'src/data/monuments.js'
const src = fs.readFileSync(p, 'utf8')
const data = JSON.parse(src.replace(/^export const monuments = /, '').replace(/;\s*$/, ''))

const FIXES = {
  63: { city: 'с. Мячково', coordinates: { lat: 55.2158, lng: 38.6725 } },
  188: { coordinates: { lat: 56.0089, lng: 37.4505 } },
  196: { city: 'дер. Корнево', region: 'Ленинградская область', coordinates: { lat: 60.0549, lng: 30.7446 } },
  200: { coordinates: { lat: 68.9583, lng: 33.0827 } }
}

let removed = null
const out = []
for (const m of data) {
  if (m.id === 197) { removed = m.title; continue }
  const fix = FIXES[m.id]
  if (fix) {
    Object.assign(m, fix)
    if (fix.coordinates) {
      m.facts = (m.facts || []).map((f) =>
        f.replace(/Координаты:.*$/, `Координаты: ${fix.coordinates.lat}, ${fix.coordinates.lng}`)
      )
    }
    console.log(`FIX #${m.id} ${m.title}`)
  }
  out.push(m)
}
// сортировка по id могла быть с пропусками — ничего не меняем, порядок прежний
fs.writeFileSync(p, `export const monuments = ${JSON.stringify(out, null, 2)}\n`, 'utf8')
console.log(`удалено: #197 ${removed}; итого записей: ${out.length}`)
