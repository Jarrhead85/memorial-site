// Кураторство находок find-photos.mjs.
// Проблема: поиск по Commons находит файлы с совпадающим названием, но не тем
// объектом («Памятник собаке» в СПб вместо Красноярска, Харьков вместо Йошкар-Олы).
// Решение: тянем extmetadata файла (описание + категории) и ищем конфликт городов.
//  - ожидаемый город/регион найден -> ACCEPT
//  - найден ДРУГОЙ известный город/регион -> REJECT
//  - ничего не найдено -> ACCEPT (нет конфликта)
import fs from 'node:fs'
import https from 'node:https'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'memorial-site-photo-curator/1.0 (local dev)' } }, (res) => {
        if (res.statusCode === 429 || res.statusCode === 503) {
          res.resume()
          return reject(new Error('RATELIMIT'))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error('HTTP ' + res.statusCode))
        }
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          try { resolve(JSON.parse(body)) } catch (e) { reject(e) }
        })
      })
      .on('error', reject)
  })
}

async function fetchWithRetry(url) {
  const backoffs = [15000, 45000, 90000]
  for (let i = 0; ; i++) {
    try {
      return await fetchJson(url)
    } catch (e) {
      if (e.message !== 'RATELIMIT' || i >= backoffs.length) throw e
      console.log(`  429, жду ${backoffs[i] / 1000}с...`)
      await sleep(backoffs[i])
    }
  }
}

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')

const { monuments } = await import('../src/data/monuments.js')
const found = JSON.parse(fs.readFileSync('scripts/photo-found.json', 'utf8'))

// Ручные отклонения, подтверждённые визуальной проверкой страниц файлов:
//  20 — файл из Екатеринбурга (в данных Москва), 28 — фото двора, не памятника,
//  38 — собака из СПб (в данных Красноярск), 39 — «монумент во время ледохода»,
//  40 — буква V в Харькове (в данных буква «Й», Йошкар-Ола), 43 — картина, 55 — Соль-Илецк.
const MANUAL_REJECT = { 20: 'файл из Екатеринбурга, памятник в Москве', 26: 'фото обычных ножниц, не скульптуры', 28: 'фото дворника, не памятника', 38: 'памятник в Санкт-Петербурге, в данных Красноярск', 39: '«красный монумент во время ледохода», не «Монумент Время»', 40: 'памятник букве V в Харькове, в данных Йошкар-Ола', 43: 'картина, не скульптура', 55: 'памятник в Соль-Илецке, в данных Минусинск', 74: 'чучело трески в музее PINRO, не памятник', 145: 'панорама «вид с Останкинской телебашни», а не памятник башне' }

// Словарь мест для поиска конфликтов: города и регионы каталога + крупные города.
const EXTRA_PLACES = [
  'Харьков', 'Киев', 'Минск', 'Астана', 'Алматы', 'Бишкек', 'Ташкент', 'Соль-Илецк',
  'Железноводск', 'Ессентуки', 'Кисловодск', 'Пятигорск', 'Тольятти', 'Таганрог',
  'Санкт-Петербург', 'Петроградский', 'Нижний Новгород', 'Екатеринбург', 'Новосибирск',
  'Казань', 'Самара', 'Уфа', 'Челябинск', 'Пермь', 'Волгоград', 'Саратов', 'Тюмень',
  'Иркутск', 'Красноярск', 'Владивосток', 'Хабаровск', 'Якутск', 'Магадан', 'Петропавловск'
]

const places = new Set()
for (const m of monuments) {
  for (const w of String(m.city).split(/[\s,]+/)) if (w.length >= 4) places.add(w)
  for (const w of String(m.region).split(/[\s,]+/)) if (w.length >= 4) places.add(w)
}
for (const p of EXTRA_PLACES) places.add(p)
const placeList = [...places].map((p) => p.toLowerCase().replace(/ё/g, 'е'))

function normalize(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
}

// город в данных может быть «с. Мячиково» при файле «Мячково» — сравниваем по 5-символьному стволу
function placeMatches(textLower, place) {
  const p = normalize(place)
  if (p.length >= 6 && textLower.includes(p.slice(0, 5))) return true
  return textLower.includes(p)
}

const accepted = []
const rejected = []

for (const f of found) {
  if (MANUAL_REJECT[f.id]) {
    rejected.push({ ...f, reason: 'вручную: ' + MANUAL_REJECT[f.id] })
    console.log(`REJECT #${f.id} ${f.title} — ${MANUAL_REJECT[f.id]}`)
    continue
  }
  const m = monuments.find((x) => x.id === f.id)
  const curid = (f.sourceUrl || '').match(/curid=(\d+)/)
  const metaTitle = (() => {
    const t = f.via.replace(/^(commons|commons-geo|openverse):/, '')
    return t.startsWith('File:') ? t : 'File:' + t
  })()
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=extmetadata&' +
    (curid ? 'pageids=' + curid[1] : 'titles=' + encodeURIComponent(metaTitle)) +
    '&iiextmetadatafilter=ImageDescription%7CObjectName%7CCategories'
  let meta = ''
  try {
    const data = await fetchWithRetry(url)
    const pages = data.query ? Object.values(data.query.pages || {}) : []
    const em = pages[0] && pages[0].imageinfo && pages[0].imageinfo[0] && pages[0].imageinfo[0].extmetadata
    meta = normalize([em && em.ImageDescription, em && em.Categories, em && em.ObjectName].map((v) => stripHtml(v && v.value)).join(' '))
  } catch (e) {
    accepted.push({ ...f, note: 'metadata недоступна (' + e.message + '), принят без проверки' })
    console.log(`ACCEPT #${f.id} ${f.title} — metadata недоступна: ${e.message}`)
    await sleep(8000)
    continue
  }
  const expected = [...normalize(String(m.city)).split(/[\s,]+/), ...normalize(String(m.region)).split(/[\s,]+/)].filter((w) => w.length >= 5)
  const hasExpected = expected.some((w) => placeMatches(meta, w))
  if (hasExpected) {
    accepted.push(f)
    console.log(`ACCEPT #${f.id} ${f.title} — город найден в описании/категориях`)
  } else {
    const conflict = placeList.find((p) => p.length >= 6 && meta.includes(p) && !expected.some((w) => w.startsWith(p.slice(0, 5))))
    if (conflict) {
      rejected.push({ ...f, reason: 'файл про другое место: ' + conflict })
      console.log(`REJECT #${f.id} ${f.title} — файл про другое место: ${conflict}`)
    } else {
      accepted.push({ ...f, note: 'город не упомянут, конфликтов нет' })
      console.log(`ACCEPT #${f.id} ${f.title} — конфликтов не найдено`)
    }
  }
  await sleep(8000)
}

fs.writeFileSync('scripts/photo-found-verified.json', JSON.stringify(accepted, null, 2), 'utf8')
fs.writeFileSync('scripts/photo-found-rejected.json', JSON.stringify(rejected, null, 2), 'utf8')
console.log(`\nИтог: принято ${accepted.length}, отклонено ${rejected.length}`)
