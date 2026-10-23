import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Rebuild images from the raw harvest (photo-results.json) applying the
// same quality filters as merge-photos.mjs (idempotent).
const __dirname = dirname(fileURLToPath(import.meta.url))

const results = JSON.parse(readFileSync(resolve(__dirname, 'photo-results.json'), 'utf8'))
const { monuments } = await import('../src/data/monuments.js')

const WRONG = new Set([21, 27, 28, 38, 39, 40, 43, 55, 59, 63, 64, 65, 82, 84, 106, 107])

const KNOWN_VALS = new Set([
  'Тысячелетие России', 'Медный всадник', 'Памятник Минину и Пожарскому',
  'Памятник Юрию Долгорукому', 'Царь-плотник', 'Памятник Николаю I',
  'Памятник Екатерине II', 'Памятник Петру I (Архангельск)', 'Памятник Петру I (Воронеж)',
  'Памятник Петру I (Таганрог)', 'Памятник Ивану Грозному (Орёл)',
  'Памятник Александру Невскому (Псков)', 'Памятник Дмитрию Донскому (Коломна)',
  'Памятник Александру Пушкину', 'Памятник Лермонтову (Пятигорск)',
  'Памятник Чехову (Москва, Камергерский переулок)', 'Памятник Гоголю (Москва, Гоголевский бульвар)',
  'Памятник Есенину (Рязань)', 'Памятник Высоцкому (Москва)',
  'Памятник Булгакову (Москва, Патриаршие пруды)', 'Памятник Достоевскому (Санкт-Петербург)',
  'Царь-колокол', 'Царь-пушка', 'Памятник М. В. Ломоносову (Архангельск)',
  'Памятник И. П. Павлову (Санкт-Петербург)', 'Александровская колонна', 'Ростральные колонны',
  'Мамаев курган', 'Памятник затопленным кораблям', 'Малая земля (мемориал)',
  'Разорванное кольцо', 'Цветок жизни (мемориал)', 'Памятник князю Владимиру (Москва)',
  'Памятник Кириллу и Мефодию (Москва)', 'Памятник князю Владимиру (Севастополь)',
  'Памятник Сергию Радонежскому', 'Памятник Петру и Февронии (Муром)',
  'Соловецкий камень (Москва)', 'Памятник тульскому прянику', 'Памятник огурцу (Луховицы)',
  'Чижик-Пыжик (памятник)', 'Памятник котёнку с улицы Лизюкова', 'Памятник клавиатуре',
  'Мытищинский водопровод', 'Скульптура «Алёшенька»'
])

function normalize(u) {
  const noQ = u.split('?')[0]
  const m = noQ.match(/\/thumb\/(?:[^/]+\/){2}([^/]+)\/\d+px-[^/]+$/i)
  if (m) return m[1]
  const parts = noQ.split('/')
  return decodeURIComponent(parts[parts.length - 1])
}

function urlSource(url) {
  const u = url.toLowerCase()
  if (u.includes('commons.wikimedia.org') || u.includes('/wikipedia/commons/') || u.includes('commons.wikipedia.org') || u.includes('wiki/special:filepath')) {
    return { source: 'commons.wikimedia.org', sourceUrl: null }
  }
  if (u.includes('ru.wikipedia.org') || u.includes('/wikipedia/ru/')) {
    return { source: 'ru.wikipedia.org', sourceUrl: null }
  }
  return null
}

// Clean, filter and dedupe one record
function cleanRec(rec) {
  if (WRONG.has(rec.id)) return []
  let list = rec.images || []
  if (!(list.length)) return []
  if (!KNOWN_VALS.has(rec.pickedPage)) list = [list[0]]
  const seen = new Set()
  const out = []
  for (const u of list) {
    if (!u) continue
    const key = normalize(u).toLowerCase()
    const s = urlSource(u)
    if (!s) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ url: u, ...s })
  }
  return out.slice(0, 5)
}

const LOCAL = {
  133: { url: '/photos/133.jpg', source: 'ru.wikipedia.org', sourceUrl: 'https://ru.wikipedia.org/wiki/%D0%91%D0%BE%D1%80%D0%BE%D0%B4%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%D1%8F_%D0%BF%D0%B0%D0%BD%D0%BE%D1%80%D0%B0%D0%BC%D0%B0' },
  152: { url: '/photos/152.jpg', source: 'ru.wikipedia.org', sourceUrl: 'https://ru.wikipedia.org/wiki/%D0%A1%D0%BA%D0%B2%D0%B5%D1%80_%D1%81%D0%B8%D0%B1%D0%B8%D1%80%D1%81%D0%BA%D0%B8%D1%85_%D0%BA%D0%BE%D1%88%D0%B5%D0%BA' },
  181: { url: '/photos/181.jpg', source: 'ru.wikipedia.org', sourceUrl: 'https://ru.wikipedia.org/wiki/%D0%9C%D0%B5%D0%BC%D0%BE%D1%80%D0%B8%D0%B0%D0%BB_%D1%8D%D0%BA%D0%B8%D0%BF%D0%B0%D0%B6%D1%83_%D0%90%D0%9F%D0%9A_%C2%AB%D0%9A%D1%83%D1%80%D1%81%D0%BA%C2%BB' },
}

const byId = new Map(results.map((r) => [r.id, r]))
let withPhotos = 0
let multi = 0
const enriched = monuments.map((m) => {
  const rec = byId.get(m.id)
  let images = rec ? cleanRec(rec) : []
  const local = LOCAL[m.id]
  if (local) images = [...images.filter((i) => i.url !== local.url), local]
  images = images.slice(0, 5)
  if (images.length) {
    withPhotos++
    if (images.length > 1) multi++
  }
  return { ...m, images, image: images.length ? images[0].url : m.image }
})

writeFileSync(resolve(__dirname, '../src/data/monuments.js'), `export const monuments = ${JSON.stringify(enriched, null, 2)}\n`, 'utf8')
console.log(`200 monuments: ${withPhotos} with photos, ${multi} multi`)
console.log('No photos:', enriched.filter((m) => !m.images.length).length)