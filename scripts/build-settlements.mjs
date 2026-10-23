// Этап A проекта «вся страна»: список городов России с населением > 10 000.
// Источник: вики-таблица «Список городов России» (raw wikitext, 1 запрос).
// Результат: scripts/settlements.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'

const raw = await (await fetch(
  'https://ru.wikipedia.org/w/index.php?title=%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%BE%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8&action=raw',
  { headers: { 'User-Agent': UA } }
)).text()

const MIN_POP = 10000
const clean = (s) =>
  String(s)
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')      // сноски (Крым и пр.)
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/''+/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[Статья|текст]] -> текст
    .replace(/\[\[([^\]]+)\]\]/g, '$1')            // [[Статья]] -> Статья
    .replace(/\s+/g, ' ')
    .trim()

const settlements = []
let skipped = 0

// Строка: | |файл| | [[Город (уточнение)|Город]] | [[Регион]] | Округ | 12 272| год| год| ...
for (const line of raw.split('\n')) {
  if (!/^\|%?\s*\|/.test(line)) continue
  const m = line.match(
    /^\|%?\s*\|(?:.*)?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*(?:<sup>.*?<\/sup>)?\s*\|\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*\|?\s*([^|]*)\|\s*([\d\s\u00A0]{4,})\|/
  )
  if (!m) continue
  const name = clean(m[1]).replace(/\s*\((?:город|городской округ)\)\s*$/i, '')
  const region = clean(m[2]).replace(/^(Республика|Край|Область|Автономный округ|Автономная область)$/i, (w) => w) // оставляем как есть
  const pop = parseInt(m[4].replace(/[\s\u00A0]/g, ''), 10)
  if (!name || !Number.isFinite(pop)) { skipped++; continue }
  if (pop < MIN_POP) { skipped++; continue }
  settlements.push({ name, region, population: pop })
}

// уникальность по паре имя+регион
const seen = new Set()
const unique = settlements.filter((s) => {
  const key = s.name + '|' + s.region
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

fs.writeFileSync('scripts/settlements.json', JSON.stringify(unique, null, 2), 'utf8')
console.log(`Населённых пунктов > ${MIN_POP}: ${unique.length} (пропущено строк: ${skipped})`)
const byRegion = {}
for (const s of unique) byRegion[s.region] = (byRegion[s.region] || 0) + 1
console.log('Регионов:', Object.keys(byRegion).length)
console.log('Примеры:', unique.slice(0, 3).map((s) => `${s.name} (${s.region}, ${s.population})`).join('; '))
