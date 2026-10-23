// v4: добор упавших батчей v1 (Q486972 в 10k-100k и 1-3k) с дроблением и ретраями.
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const q = (cls, band) => `
SELECT ?itemLabel ?pop ?lat ?lon WHERE {
  ?item wdt:P17 wd:Q159 . ?item wdt:P31 wd:${cls} . ?item wdt:P1082 ?pop .
  FILTER(${band})
  ?item p:P625 ?coordStmt . ?coordStmt psv:P625 ?coordNode .
  ?coordNode wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
} LIMIT 25000`

async function run(cls, band, tries = 4) {
  for (let t = 0; t < tries; t++) {
    const u = new URL('https://query.wikidata.org/sparql')
    u.searchParams.set('query', q(cls, band))
    u.searchParams.set('format', 'json')
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
      if (!res.ok) {
        console.log(`  ${cls}/${band}: HTTP ${res.status}, повтор ${t + 1}`)
        await sleep(15000)
        continue
      }
      return await res.json()
    } catch (e) {
      console.log(`  ${cls}/${band}: ${e.message}`)
      await sleep(10000)
    }
  }
  return null
}

const JOBS = [
  ['Q486972', '10000-100k', '?pop >= 10000 && ?pop < 100000'],
  ['Q486972', '1-2k', '?pop >= 1000 && ?pop < 2000'],
  ['Q486972', '2-3k', '?pop >= 2000 && ?pop < 3000'],
  ['Q5084', '3000-10000 повтор', '?pop >= 3000 && ?pop < 10000'],
  ['Q5084', '10000-100000', '?pop >= 10000 && ?pop < 100000'],
  ['Q515', '1000-10000 повтор', '?pop >= 1000 && ?pop < 10000']
]

const out = JSON.parse(fs.readFileSync('scripts/settlements-1k.json', 'utf8'))
const seen = new Set(out.map((s) => s.name + '|' + s.lat.toFixed(3) + '|' + s.lng.toFixed(3)))

for (const [cls, label, band] of JOBS) {
  const data = await run(cls, band)
  let added = 0
  for (const b of (data?.results?.bindings) || []) {
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
  console.log(`${cls} ${label}: +${added}`)
  await sleep(4000)
}

fs.writeFileSync('scripts/settlements-1k.json', JSON.stringify(out, null, 1), 'utf8')
const hist = { '10k+': 0, '5-10k': 0, '2-5k': 0, '1-2k': 0 }
for (const s of out) hist[s.pop >= 10000 ? '10k+' : s.pop >= 5000 ? '5-10k' : s.pop >= 2000 ? '2-5k' : '1-2k']++
console.log('итого:', out.length, JSON.stringify(hist))
