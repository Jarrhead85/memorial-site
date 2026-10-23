// Дочистка волны «Просто памятник...» на Пикабу: страницы поиска 2-6,
// из каждого поста — заголовок, теги (там города) и текст (windows-1251).
// Результат: scripts/pikabu-wave2.json
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const decode1251 = (buf) => new TextDecoder('windows-1251').decode(buf)
const stripTags = (s) => s
  .replace(/<img[^>]*>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/\s+/g, ' ').trim()

// собираем ссылки со страниц поиска
const links = new Set()
for (let page = 1; page <= 6; page++) {
  const u = `https://pikabu.ru/search?q=%22%D0%9F%D1%80%D0%BE%D1%81%D1%82%D0%BE%20%D0%BF%D0%B0%D0%BC%D1%8F%D1%82%D0%BD%D0%B8%D0%BA%2C%20%D0%BD%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D0%B8%D1%82%D1%8B%D0%B9%22&story=posts&page=${page}`
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' } })
    const html = decode1251(Buffer.from(await res.arrayBuffer()))
    for (const m of html.matchAll(/href="(?:https?:\/\/pikabu\.ru)?(\/story\/[a-z0-9_-]+_\d+)"/g)) links.add('https://pikabu.ru' + m[1])
    console.log(`страница ${page}: ссылок всего ${links.size}`)
  } catch (e) {
    console.log(`страница ${page}: ${e.message}`)
  }
  await sleep(1800)
}

const out = []
let i = 0
for (const u of links) {
  i++
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' } })
    const html = decode1251(Buffer.from(await res.arrayBuffer()))
    const title = stripTags((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '')
    const tags = [...html.matchAll(/\/tag\/([^/"?]+)/g)].map((m) => decodeURIComponent(m[1]))
    const bodyM = html.match(/story__content[\s\S]*?<div class="story__footer/)
    const body = bodyM ? stripTags(bodyM[0]).slice(0, 700) : ''
    out.push({ url: u, title: title.replace(/\s*\|\s*Пикабу$/, ''), tags: [...new Set(tags)].slice(0, 10), body })
  } catch (e) {
    console.log(`${u}: ${e.message}`)
  }
  if (i % 10 === 0) console.log(`обработано ${i}/${links.size}`)
  await sleep(1500)
}
fs.writeFileSync('scripts/pikabu-wave2.json', JSON.stringify(out, null, 2), 'utf8')
console.log(`сохранено постов: ${out.length}`)
