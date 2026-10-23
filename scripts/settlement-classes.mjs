// Какие классы P31 у населённых пунктов РФ >=1000? Дешёвый GROUP BY
// по выборке, чтобы добрать недостающие классы в v1-стиле (прямой P31 — быстрый).
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'

const query = `
SELECT ?cls ?clsLabel (COUNT(?item) AS ?n) WHERE {
  { SELECT ?item WHERE { ?item wdt:P17 wd:Q159. ?item wdt:P1082 ?pop. FILTER(?pop >= 1000) } LIMIT 6000 }
  ?item wdt:P31 ?cls .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
} GROUP BY ?cls ?clsLabel ORDER BY DESC(?n) LIMIT 40`

const u = new URL('https://query.wikidata.org/sparql')
u.searchParams.set('query', query)
u.searchParams.set('format', 'json')
const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
console.log('HTTP', res.status)
if (!res.ok) throw new Error('failed')
const data = await res.json()
for (const b of data.results.bindings) {
  console.log(`${b.n.value.padStart(5)}  ${b.cls.value.replace('http://www.wikidata.org/entity/', '')}  ${b.clsLabel?.value || ''}`)
}
