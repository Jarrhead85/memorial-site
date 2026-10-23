import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const read = (p) => existsSync(resolve(__dirname, p)) ? JSON.parse(readFileSync(resolve(__dirname, p), 'utf8')) : null

const { monuments } = await import('../src/data/monuments.js')
const found = read('photo-found.json')
const checkpoint = read('photo-checkpoint.json')
const harvest = read('photo-results.json')

console.log('=== monuments.js ===')
const withIm = monuments.filter((m) => m.images && m.images.length)
console.log(`total=${monuments.length} withImages=${withIm.length} without=${monuments.length - withIm.length}`)
const domains = {}
for (const m of monuments) for (const i of (m.images || [])) {
  const d = String(i.url).split('/')[2] || '?'
  domains[d] = (domains[d] || 0) + 1
}
console.log('domains:', JSON.stringify(domains))
const noIm = monuments.filter((m) => !(m.images && m.images.length))
console.log('missing ids:', noIm.map((m) => m.id).join(','))

console.log('\n=== photo-found.json ===')
if (found) {
  const arr = Array.isArray(found) ? found : found.found || found.results || []
  console.log(`entries=${arr.length}`)
  for (const f of arr) console.log(` id=${f.id} via=${f.via || (f.images && f.images[0] && f.images[0].url) || '?'}`)
} else console.log('absent')

console.log('\n=== photo-checkpoint.json ===')
if (checkpoint) {
  const keys = Object.keys(checkpoint)
  console.log(`processed=${keys.length}`)
  const vals = {}
  for (const k of keys) { const v = checkpoint[k]; const s = typeof v === 'string' ? v : (v && v.status) || '?'; vals[s] = (vals[s] || 0) + 1 }
  console.log('byStatus:', JSON.stringify(vals))
} else console.log('absent')

console.log('\n=== photo-results.json (harvest) ===')
if (harvest) {
  const arr = Array.isArray(harvest) ? harvest : harvest.results || []
  const withImages = arr.filter((r) => r.images && r.images.length)
  console.log(`records=${arr.length} withImages=${withImages.length}`)
  const idsInHarvest = new Set(arr.map((r) => r.id))
  const missingInHarvest = monuments.filter((m) => !idsInHarvest.has(m.id)).map((m) => m.id)
  console.log('not in harvest:', missingInHarvest.join(','))
} else console.log('absent')
