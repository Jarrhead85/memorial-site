// v3: тот же подзапрос, но по 5 полосам долготы — каждая заметно легче.
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BANDS = [[19, 45], [45, 70], [70, 95], [95, 125], [125, 190]]

const q = (lo, hi) => `
SELECT ?item ?itemLabel ?pop ?lat ?lon WHERE {
  { SELECT ?item ?pop ?lo WHERE {
      ?item wdt:P17 wd:Q159. ?item wdt:P1082 ?pop. FILTER(?pop >= 1000)
      ?item p:P625 ?cs2. ?cs2 psv:P625 ?cn2.
      ?cn2 wikibase:geoLongitude ?lo. FILTER(?lo >= ${lo} && ?lo < ${hi})
    } LIMIT 30000 }
  ?item wdt:P31/wdt:P279?/wdt:P279?/wdt:P279? wd:Q486972 .
  ?item p:P625 ?coordStmt .
  ?coordStmt psv:P625 ?coordNode .
  ?coordNode wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
} LIMIT 30000`

const seen = new Set()
const out = []
for (const [lo, hi] of BANDS) {
  const u = new URL('https://query.wikidata.org/sparql')
  u.searchParams.set('query', q(lo, hi))
  u.searchParams.set('format', 'json')
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
    if (!res.ok) {
      console.log(`полоса ${lo}-${hi}: HTTP ${res.status}`)
      continue
    }
    const data = await res.json()
    let added = 0
    for (const b of data.results.bindings || []) {
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
    console.log(`полоса ${lo}-${hi}: +${added}`)
  } catch (e) {
    console.log(`полоса ${lo}-${hi}: ${e.message}`)
  }
  await sleep(3000)
}

if (out.length) {
  fs.writeFileSync('scripts/settlements-1k-v3.json', JSON.stringify(out, null, 1), 'utf8')
  const hist = { '10k+': 0, '5-10k': 0, '2-5k': 0, '1-2k': 0 }
  for (const s of out) hist[s.pop >= 10000 ? '10k+' : s.pop >= 5000 ? '5-10k' : s.pop >= 2000 ? '2-5k' : '1-2k']++
  console.log('итого v3:', out.length, JSON.stringify(hist))
}
