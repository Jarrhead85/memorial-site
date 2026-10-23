const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (const q of ['скульптура Тюмень', 'памятник скульптура Тверь', 'памятник Вологда']) {
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '4')
  u.searchParams.set('accept-language', 'ru')
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  const list = await r.json()
  console.log('== ' + q)
  for (const x of list) console.log(`   ${x.display_name.slice(0, 95)} | ${Number(x.lat).toFixed(5)}, ${Number(x.lon).toFixed(5)} | ${x.type || ''}`)
  await sleep(1500)
}
