// Скрапер Пикабу (windows-1251): достаём заголовок, описание (meta),
// теги (там город!) и автора из серии постов «Просто памятник...».
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const URLS = [
  'https://pikabu.ru/story/prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14341240',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14359057',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14357353',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14357196',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14356665',
  'https://pikabu.ru/story/otvet_begamyres_v_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14356590',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14355759',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14347202',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14347098',
  'https://pikabu.ru/story/otvet_na_post_prosto_pamyatnik_ne_znamenityiy_ne_raskruchennyiy_14345803',
  'https://pikabu.ru/story/pamyatnik_maloizvestnyiy_14349772',
  'https://pikabu.ru/story/pamyatnik_gorbachevu_s_klyuchom_ot_mersedesa_14349477',
  'https://pikabu.ru/story/i_eshchyo_pro_pamyatniki_maloizvestnyie_v_moskve_14346978'
]

const decode1251 = (buf) => new TextDecoder('windows-1251').decode(buf)
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/\s+/g, ' ').trim()

const out = []
for (const u of URLS) {
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' } })
    const buf = Buffer.from(await res.arrayBuffer())
    const html = decode1251(buf)
    const title = stripTags((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '')
    const desc = stripTags((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '')
    const tags = [...html.matchAll(/\/tag\/([^/"?]+)/g)].map((m) => decodeURIComponent(m[1]))
    const author = (html.match(/class="user__nick[^"]*"[^>]*>([^<]+)</) || [])[1] || ''
    // тело поста: всё между первым story__content и футером, без HTML
    const bodyM = html.match(/story__content[\s\S]*?<div class="story__footer/) ||
                  html.match(/story__content[\s\S]*?<div[^>]*class="[^"]*story__tags/)
    let body = ''
    if (bodyM) {
      body = stripTags(
        bodyM[0]
          .replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, ' [фото: $1] ')
          .replace(/<\/p>/g, '\n')
      )
        .replace(/\[фото:[^\]]*\]/g, (m) => (m.length > 60 ? '' : m))
        .replace(/\n{2,}/g, '\n')
        .trim()
        .slice(0, 900)
    }
    out.push({ url: u, title, desc, tags: [...new Set(tags)].slice(0, 12), author, body })
    console.log(`OK  ${u.slice(-14)}  «${title.slice(0, 60)}»  теги: ${[...new Set(tags)].slice(0, 8).join(', ')}`)
  } catch (e) {
    console.log(`ERR ${u}: ${e.message}`)
  }
  await sleep(1500)
}
fs.writeFileSync('scripts/pikabu-posts.json', JSON.stringify(out, null, 2), 'utf8')
console.log(`сохранено: ${out.length} постов -> scripts/pikabu-posts.json`)
