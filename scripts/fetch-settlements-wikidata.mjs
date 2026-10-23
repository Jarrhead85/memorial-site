// Список населённых пунктов РФ >= 1000 жит. (Wikidata SPARQL), батчами:
// прямые классы P31 (без тяжёлого P279*) x диапазоны населения.
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CLASSES = ['Q3957', 'Q515', 'Q2272848', 'Q5322166', 'Q10533987', 'Q486972', 'Q5084', 'Q427443', 'Q1013346', 'Q85607635']
const BANDS = [
  ['>=100000', '?pop >= 100000'],
  ['10000-100000', '?pop >= 10000 && ?pop < 100000'],
  ['3000-10000', '?pop >= 3000 && ?pop < 10000'],
  ['1000-3000', '?pop >= 1000 && ?pop < 3000']
]

const q = (cls, band) => `
SELECT ?itemLabel ?pop ?lat ?lon WHERE {
  ?item wdt:P17 wd:Q159 .
  ?item wdt:P31 wd:${cls} .
  ?item wdt:P1082 ?pop .
  FILTER(${band})
  ?item p:P625 ?coordStmt .
  ?coordStmt psv:P625 ?coordNode .
  ?coordNode wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
} LIMIT 25000`

async function run(cls, bandExpr) {
  const u = new URL('https://query.wikidata.org/sparql')
  u.searchParams.set('query', q(cls, bandExpr))
  u.searchParams.set('format', 'json')
  const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
  if (!res.ok) {
    console.log(`  ${cls}: HTTP ${res.status}, пропуск`)
    return []
  }
  const data = await res.json()
  return data.results.bindings || []
}

const seen = new Set()
const out = []
for (const [bandName, bandExpr] of BANDS) {
  console.log('диапазон', bandName)
  for (const cls of CLASSES) {
    const rows = await run(cls, bandExpr)
    let added = 0
    for (const b of rows) {
      const name = b.itemLabel?.value || ''
      const pop = parseInt(b.pop?.value || '0', 10)
      const lat = parseFloat(b.lat?.value)
      const lng = parseFloat(b.lon?.value)
      if (!name || !pop || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const key = name + '|' + lat.toFixed(3) + '|' + lng.toFixed(3)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name, pop, lat, lng })
      added++
    }
    console.log(`  ${cls}: +${added}`)
    await sleep(2000)
  }
}

fs.writeFileSync('scripts/settlements-1k.json', JSON.stringify(out, null, 1), 'utf8')
const hist = { '10k+': 0, '5-10k': 0, '2-5k': 0, '1-2k': 0 }
for (const s of out) hist[s.pop >= 10000 ? '10k+' : s.pop >= 5000 ? '5-10k' : s.pop >= 2000 ? '2-5k' : '1-2k']++
console.log('итого поселений:', out.length, JSON.stringify(hist))
