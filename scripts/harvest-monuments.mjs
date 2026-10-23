// Этап B: по каждому городу (>10k) найти ОДИН примечательный памятник.
// Приоритет — необычным (животные, еда, предметы, профессии), классика
// (Ленины, военные мемориалы) не запрещена, но ранжируется ниже.
// На город: 1-2 поисковых запроса; для лучшего кандидата — 1 запрос за
// выжимкой, координатами и страницей. Пауза 8с, чекпоинт, докатка.
// Результат: scripts/harvest-found.json
import fs from 'node:fs'

const UA = 'MemorialSiteCatalogBot/2.0 (local catalog; contact: dev)'
const MIN_INTERVAL = 8000
const BACKOFFS = [30000, 60000, 120000, 300000]

const settlements = JSON.parse(fs.readFileSync('scripts/settlements.json', 'utf8'))

// города, уже покрытые существующим каталогом (id 1–200)
const { monuments } = await import('../src/data/monuments.js')
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()
const coveredCities = new Set(monuments.map((m) => norm(m.city)))

const CP_FILE = 'scripts/harvest-checkpoint.json'
const cp = fs.existsSync(CP_FILE)
  ? JSON.parse(fs.readFileSync(CP_FILE, 'utf8'))
  : { done: {}, found: [] }

let lastCall = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function pace() {
  const wait = lastCall + MIN_INTERVAL - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

async function api(params) {
  const u = new URL('https://ru.wikipedia.org/w/api.php')
  u.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
  let lastErr
  for (let attempt = 0; attempt < BACKOFFS.length; attempt++) {
    await pace()
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA } })
      if (res.status === 429 || res.status === 503) {
        const pause = BACKOFFS[attempt]
        console.log(`    ${res.status}, пауза ${pause / 1000}с`)
        await sleep(pause)
        lastErr = new Error('rate limited')
        continue
      }
      if (!res.ok) throw new Error('http ' + res.status)
      const data = await res.json()
      if (!data || typeof data !== 'object') {
        lastErr = new Error('bad payload')
        continue
      }
      return data
    } catch (e) {
      lastErr = e
      await sleep(3000)
    }
  }
  throw lastErr || new Error('api failed')
}

const MONUMENT_RE = /памятник|монумент|скульптур|стела|стеле|бюст|композиция/
const STOP_TITLE = /список|категория|шаблон/
// классическая статуарика и военные обобщённые — не «необычные и малоизвестные»
const BORING_RE = /ленин|ульянов|пушкин|революц|воинам|воинск|погибш|великой отечеств|красноармеец|полководц|маршал|дважды герой|суворов|кутузов|жуков|некрасов-? герой|неизвестн(ый|ому) солдат|вечный огонь|братск/
const UNUSUAL_RE = /кото?|кош|собак|пёс|псин|волк|медвед|заяц|заиц|лось|олень|тюлен|кит|дельфин|рыб|треск|селёд|кораб|гриб|яблон|вишн|апельсин|арбуз|огур|лук|чеснок|сыр|хлеб|пряник|пельмен|вареник|блин|мороженое|шоколад|самовар|чай|клизм|утюг|ботинок|сапог|клавиатур|рубл|копейк|денег|деньг|шпрот|селедк|комар|муравей|пчел|паук|ёж|ежик|свин|корова|лошад|кон[яюеь]|верблюд|обезьян|слон|жираф|фонтан|дворник|сантехник|милиционер|постовой|курьер|студент|ванн|пуговиц|скрипк|гитар|флейт|телефон|смартфон|фотограф|писар|почтальон|трубочист|кочегар|электрик|нефтян|геолог|шахтер|шахтёр|строител|кран|такси|автомобил|трамвай|троллейбус|автобус|поезд|пароход|самолёт|самолет|вертолёт|необычн|шутк|чебурек|экипаж|письмо|гараж|дворник/

function cityInTitle(title, city) {
  const c = norm(city)
  const t = norm(title)
  // «Аксай (Ростовская область)» и «Аксай» совпадают по стволу от 5 символов
  if (t.includes(c)) return true
  const stem = c.slice(0, Math.max(5, Math.min(c.length, 7)))
  return c.length >= 5 && t.includes(stem)
}

function scoreTitle(title, city) {
  const t = norm(title)
  let s = 0
  if (MONUMENT_RE.test(t)) s += 10
  if (!s) return 0
  if (!cityInTitle(title, city)) return 0 // чужой город — сразу мимо
  s += 6
  if (UNUSUAL_RE.test(t)) s += 7
  if (BORING_RE.test(t)) s -= 20 // классику отбраковываем целиком
  return s
}

function trimSentences(text, maxLen) {
  const clean = text.replace(/\s+/g, ' ').trim()
  const parts = clean.split(/(?<=[.!?])\s+/)
  let out = ''
  for (const p of parts) {
    if ((out + ' ' + p).length > maxLen) break
    out = (out + ' ' + p).trim()
  }
  if (!out && clean) out = clean.slice(0, maxLen)
  return out
}

const CATEGORY_RULES = [
  [/сыр|хлеб|пряник|пельмен|вареник|огур|арбуз|вишн|яблон|лук|чеснок|треск|селёд|селедк|шпрот|борщ|блин|мороженое|шоколад|самовар|каравай|бублик|сгущёнк|макарон|пельмен/, 'Гастрономические'],
  [/миниатюр|мини-|самый маленьк/, 'Мини-скульптуры'],
  [/кото?|кош|собак|пёс|волк|медвед|лось|тюлен|рыб|комар|ёж|ежик|свин|обезьян|слон|заяц|гриб|инопланет|призрак|клизм|утюг|клавиатур|рубл|денег|дворник|сантехник|курьер|необычн/, 'Необычные']
]
function pickCategory(text) {
  const t = norm(text)
  for (const [re, cat] of CATEGORY_RULES) if (re.test(t)) return cat
  return 'Исторические'
}

function slugify(title) {
  const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
  return String(title).toLowerCase().replace(/ё/g, 'е')
    .replace(/[«»"'(),.!?§\[\]:;«»]/g, '')
    .split(/\s+/).slice(0, 6).join('-')
    .split('').map((c) => CYR[c] ?? c).join('')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'monument'
}

function save() {
  fs.writeFileSync(CP_FILE, JSON.stringify(cp, null, 2), 'utf8')
  fs.writeFileSync('scripts/harvest-found.json', JSON.stringify(cp.found, null, 2), 'utf8')
}

const targets = settlements.filter(
  (s) => !(norm(s.name) in {} ) && !coveredCities.has(norm(s.name)) && !cp.done[norm(s.name) + '|' + norm(s.region)]
)
console.log(`Городов к обработке: ${targets.length} (уже в каталоге: ${coveredCities.size}, готово: ${Object.keys(cp.done).length})`)

let i = 0
for (const s of targets) {
  i++
  const key = norm(s.name) + '|' + norm(s.region)
  let status = 'miss'
  try {
    // 1) поиск
    const q1 = `памятник "${s.name}"`
    const q2 = `скульптура OR монумент OR стела "${s.name}"`
    let best = null
    for (const q of [q1, q2]) {
      const data = await api({ action: 'query', list: 'search', srsearch: q, srnamespace: 0, srlimit: 10 })
      const hits = (data.query && data.query.search) || []
      for (const h of hits) {
        if (STOP_TITLE.test(h.title)) continue
        const score = scoreTitle(h.title, s.name)
        if (!best || score > best.score) best = { title: h.title, score }
      }
      if (best && best.score >= 23) break // необычный + город — уверенный кандидат
    }
    if (best && best.score >= 16) {
      // 2) выжимка + координаты + страница одним запросом
      const pd = await api({
        action: 'query', prop: 'extracts|coordinates|info', titles: best.title,
        exintro: 1, explaintext: 1, redirects: 1, inprop: 'url', coprimary: 'primary'
      })
      const page = Object.values(pd.query.pages || {})[0]
      if (page && !page.missing && page.extract && !/может означать|список значений/i.test(page.extract.slice(0, 200))) {
        const coords = page.coordinates && page.coordinates[0]
        cp.found.push({
          city: s.name,
          region: s.region,
          population: s.population,
          title: page.title,
          wikiUrl: page.fullurl,
          extract: trimSentences(page.extract, 700),
          short: trimSentences(page.extract, 220),
          category: pickCategory(page.title + ' ' + page.extract.slice(0, 300)),
          coords: coords ? { lat: coords.lat, lng: coords.lon } : null,
          slug: slugify(page.title.replace(/^Памятник\s+/, '')),
          score: best.score
        })
        status = 'found'
        console.log(`[${i}/${targets.length}] FOUND #${s.name} — ${page.title} (score ${best.score})`)
        save()
      }
    }
  } catch (e) {
    console.log(`    error (${s.name}): ${e.message}`)
  }
  if (status !== 'found') {
    cp.done[key] = 'miss'
    save()
    console.log(`[${i}/${targets.length}] miss   #${s.name}`)
  } else {
    cp.done[key] = 'found'
    save()
  }
}
const foundTotal = Object.values(cp.done).filter((v) => v === 'found').length
console.log(`Done. found: ${foundTotal}/${Object.keys(cp.done).length}`)
