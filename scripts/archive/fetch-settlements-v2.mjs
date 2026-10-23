// Попытка v2: полный охват поселений 1000+ через подзапрос (материализация
// до тяжёлого P279*-пути). Если упадёт — остаёмся на батчах v1.
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'

const query = `
SELECT ?item ?itemLabel ?pop ?lat ?lon WHERE {
  { SELECT ?item ?pop WHERE { ?item wdt:P17 wd:Q159. ?item wdt:P1082 ?pop. FILTER(?pop >= 1000) } LIMIT 40000 }
  ?item wdt:P31/wdt:P279?/wdt:P279?/wdt:P279? wd:Q486972 .
  ?item p:P625 ?coordStmt .
  ?coordStmt psv:P625 ?coordNode .
  ?coordNode wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
} LIMIT 40000`

const u = new URL('https://query.wikidata.org/sparql')
u.searchParams.set('query', query)
u.searchParams.set('format', 'json')
const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
console.log('HTTP', res.status)
if (!res.ok) {
  console.log((await res.text()).slice(0, 300))
  throw new Error('sparql failed')
}
const data = await res.json()

const seen = new Set()
const out = []
for (const b of data.results.bindings) {
  const name = b.itemLabel?.value || ''
  const pop = parseInt(b.pop?.value || '0', 10)
  const lat = parseFloat(b.lat?.value)
  const lng = parseFloat(b.lon?.value)
  if (!name || !pop || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
  const key = name + '|' + lat.toFixed(3) + '|' + lng.toFixed(3)
  if (seen.has(key)) continue
  seen.add(key)
  out.push({ name, pop, lat, lng })
}

// слияние с v1 (914 городов из вики-таблицы не имеют координат — они и не нужны:
// крупные города уже покрыты каталогом; база для сопоставления — только эта)
fs.writeFileSync('scripts/settlements-1k-v2.json', JSON.stringify(out, null, 1), 'utf8')
const hist = { '10k+': 0, '5-10k': 0, '2-5k': 0, '1-2k': 0 }
for (const s of out) hist[s.pop >= 10000 ? '10k+' : s.pop >= 5000 ? '5-10k' : s.pop >= 2000 ? '2-5k' : '1-2k']++
console.log('итого v2:', out.length, JSON.stringify(hist))
