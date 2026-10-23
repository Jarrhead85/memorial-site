import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const p = resolve(__dirname, '../src/data/monuments.js')
const src = readFileSync(p, 'utf8')
const out = src.split('https://commons.wikipedia.org/').join('https://commons.wikimedia.org/')
writeFileSync(p, out, 'utf8')
console.log('replaced:', (src.match(/commons\.wikipedia\.org/g) || []).length)
