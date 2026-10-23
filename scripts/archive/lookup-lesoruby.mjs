// Уточнение двух постов волны: «девушкам-лесорубам» и памятник в Мирном.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const decode = (b) => new TextDecoder('windows-1251').decode(b)
const strip = (s) => s.replace(/<img[^>]*>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

for (const q of ['девушкам лесорубам памятник', 'Мирный памятник суровый']) {
  const u = new URL('https://pikabu.ru/search')
  u.searchParams.set('q', q)
  u.searchParams.set('story', 'posts')
  const res = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' } })
  const html = decode(Buffer.from(await res.arrayBuffer()))
  const links = [...html.matchAll(/href="(?:https?:\/\/pikabu\.ru)?(\/story\/[a-z0-9_-]+_\d+)"/g)].map((m) => m[1]).slice(0, 3)
  console.log('== ' + q + ' -> ' + links.join(' | '))
  for (const link of links) {
    const r2 = await fetch('https://pikabu.ru' + link, { headers: { 'User-Agent': UA } })
    const h2 = decode(Buffer.from(await r2.arrayBuffer()))
    const title = strip((h2.match(/<title>([^<]*)<\/title>/) || [])[1] || '')
    const bodyM = h2.match(/story__content[\s\S]*?<div class="story__footer/)
    const body = bodyM ? strip(bodyM[0]).slice(0, 400) : ''
    const tags = [...h2.matchAll(/\/tag\/([^/"?]+)/g)].map((m) => decodeURIComponent(m[1])).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8)
    console.log('  ' + title.slice(0, 80))
    console.log('  tags: ' + tags.join(', '))
    console.log('  ' + body)
    await sleep(1600)
  }
  await sleep(1600)
}
