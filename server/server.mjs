import http from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, renameSync } from 'node:fs'
import { resolve, dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'photos.json')
const WALL_FILE = join(DATA_DIR, 'wall.json')
const SUGGEST_FILE = join(DATA_DIR, 'monument-suggestions.json')
const CONFIG_FILE = join(__dirname, 'config.json')
const ADMIN_DIR = join(__dirname, 'admin')
const PORT = Number(process.env.PORT || 8765)

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '[]', 'utf8')
if (!existsSync(WALL_FILE)) writeFileSync(WALL_FILE, '[]', 'utf8')
if (!existsSync(SUGGEST_FILE)) writeFileSync(SUGGEST_FILE, '[]', 'utf8')

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

// Config with admin password. Пароль показывается в консоль ОДИН раз при
// первом запуске и сразу удаляется из config.json — дальше хранится только хэш.
// Если в конфиге нет ни пароля, ни хэша — генерируем случайный (никаких «admin»).
let config = {}
if (existsSync(CONFIG_FILE)) {
  config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  if (!config.adminPasswordHash && !config.adminPassword) {
    const password = randomBytes(4).toString('hex')
    config.adminPassword = password
  }
  if (!config.adminPasswordHash) {
    config.adminPasswordHash = sha256(config.adminPassword || 'admin')
  }
  if (config.adminPassword) {
    console.log('=== ADMIN PANEL ===')
    console.log(`Password: ${config.adminPassword} (сохраните, больше не покажется)`)
    delete config.adminPassword
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
  }
} else {
  const password = randomBytes(4).toString('hex')
  config = { adminPasswordHash: sha256(password) }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
  console.log('=== ADMIN PANEL ===')
  console.log(`Password: ${password} (сохраните, больше не покажется)`)
}
console.log(`Panel: http://localhost:${PORT}/admin — пароль задаётся в server/config.json (sha256)`)

function loadData() {
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function loadWall() {
  try { return JSON.parse(readFileSync(WALL_FILE, 'utf8')) } catch { return [] }
}

function saveWall(data) {
  const tmp = WALL_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, WALL_FILE)
}

function loadSuggestions() {
  try { return JSON.parse(readFileSync(SUGGEST_FILE, 'utf8')) } catch { return [] }
}

function saveSuggestions(data) {
  const tmp = SUGGEST_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, SUGGEST_FILE)
}

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()

function kmBetween(aLat, aLng, bLat, bLng) {
  const dLat = (aLat - bLat) * 111.32
  const dLng = (aLng - bLng) * 111.32 * Math.cos(((aLat + bLat) / 2) * Math.PI / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

const CYR = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' }
function slugifyRu(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
    .replace(/[«»"'(),.!?§\[\]:;—–]/g, '')
    .split(/\s+/).slice(0, 5).join('-')
    .split('').map((c) => CYR[c] ?? c).join('')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'monument'
}

function saveData(data) {
  const tmp = DATA_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, DATA_FILE)
}

// Базовые security-заголовки. Для /admin разрешаем инлайн-скрипт
// (панель — один самодостаточный html), остальному сайту он не нужен.
function secHeaders(extra, isAdmin) {
  const csp = [
    "default-src 'self'",
    `script-src 'self'${isAdmin ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-src https://yandex.ru",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': csp,
    ...extra
  }
}

function send(res, status, obj, req) {
  const body = Buffer.from(JSON.stringify(obj))
  const headers = secHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, p_isAdmin(req))
  writeMaybeGzip(res, status, body, headers, req)
}

function p_isAdmin(req) {
  return typeof req === 'object' && req !== null && String(req.url || '').startsWith('/admin')
}

// Отдаёт буфер, сжимая gzip'ом, если клиент принял и ответ того стоит.
// Результат сжатия для ассетов кэшируется: gzipSync на 700KB-бандле
// на каждый запрос блокировал бы event loop.
const gzipCache = new Map()

function writeMaybeGzip(res, status, body, headers, req, cacheKey) {
  const accept = (req && req.headers['accept-encoding']) || ''
  const h = { ...headers }
  if (accept.includes('gzip') && body.length > 1024) {
    let gz = cacheKey ? gzipCache.get(cacheKey) : undefined
    if (!gz) {
      gz = gzipSync(body)
      if (cacheKey) {
        gzipCache.set(cacheKey, gz)
        // страховка от роста: простая FIFO-очистка
        if (gzipCache.size > 100) {
          gzipCache.delete(gzipCache.keys().next().value)
        }
      }
    }
    delete h['Content-Length']
    h['Content-Encoding'] = 'gzip'
    res.writeHead(status, h)
    res.end(gz)
  } else {
    h['Content-Length'] = body.length
    res.writeHead(status, h)
    res.end(body)
  }
}

// Мини rate-limit: bucket на IP (защита логина и спама заявками)
const buckets = new Map()
function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }
  b.count++
  if (buckets.size > 5000) buckets.clear() // страховка от роста
  return b.count <= limit
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 50 * 1024) { reject(new Error('too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(new Error('bad json')) }
    })
    req.on('error', reject)
  })
}

// Сессии админа: случайные токены с TTL. Токен ≠ хэшу пароля, кража токена
// перестаёт работать через 12 часов и после перезапуска сервера.
const SESSION_TTL = 12 * 60 * 60 * 1000
const sessions = new Map()
function createSession() {
  const token = randomBytes(24).toString('hex')
  sessions.set(token, Date.now() + SESSION_TTL)
  // страховка от роста: выкидываем просроченные
  if (sessions.size > 100) {
    const now = Date.now()
    for (const [t, exp] of sessions) {
      if (exp < now) sessions.delete(t)
    }
  }
  return token
}

function auth(req) {
  const h = req.headers['authorization'] || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token || !/^[a-f0-9]{48}$/.test(token)) return false
  const exp = sessions.get(token)
  if (!exp || exp < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

function hashEq(a, b) {
  // timing-safe сравнение одинаковых по длине hex-строк
  const ba = Buffer.from(String(a), 'utf8')
  const bb = Buffer.from(String(b), 'utf8')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
}

function resolveFile(fileRoot, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null // битый %-escape
  }
  // обратные слэши трактуем как разделители пути (Windows-защита от ..%5C..)
  const safe = decoded.replace(/\\/g, '/')
  if (safe.includes('\0')) return null
  let rel = safe === '/' ? 'index.html' : safe.replace(/^\//, '')
  if (rel.includes('..')) return null // лишняя страховка поверх startsWith
  let file = join(fileRoot, rel)
  const rootPrefix = normalize(fileRoot) + sep
  if (!normalize(file).startsWith(rootPrefix)) return null
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  return file
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const p = url.pathname

  try {
    // ---- API ----
    if (p.startsWith('/api/')) {
      const ip = req.socket.remoteAddress || 'unknown'

      // Полный каталог — основной источник данных клиента (каталог больше
      // не бандлится в JS). Сериализация кэшируется и сбрасывается при
      // одобрении новой записи; браузерный кэш 5 минут.
      if (p === '/api/catalog' && req.method === 'GET') {
        const body = await getCatalogJson()
        return writeMaybeGzip(res, 200, body, secHeaders({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300'
        }), req, `api:catalog:${catalogGen}`)
      }

      // Справочник памятников (для админки: заявки приходят с числовым id)
      if (p === '/api/monuments' && req.method === 'GET') {
        const monuments = await getMonuments()
        return send(res, 200, {
          monuments: monuments.map((m) => ({ id: m.id, title: m.title, city: m.city, region: m.region }))
        }, req)
      }

      if (p === '/api/photos' && req.method === 'GET') {
        const monumentId = Number(url.searchParams.get('monumentId'))
        const all = loadData()
        let list = all.filter((x) => x.status === 'approved')
        if (monumentId) list = list.filter((x) => x.monumentId === monumentId)
        return send(res, 200, {
          photos: list.map(({ url, source, sourceUrl, submittedAt }) => ({ url, source, sourceUrl, submittedAt }))
        })
      }

      if (p === '/api/photos' && req.method === 'POST') {
        if (!rateLimit('photo:' + ip, 6, 60_000)) return send(res, 429, { error: 'Слишком часто, попробуйте через минуту' }, req)
        const body = await readBody(req)
        const monumentId = Number(body.monumentId)
        const urlRaw = (body.url || '').trim()
        const source = (body.source || '').trim()
        const sourceUrl = (body.sourceUrl || '').trim()
        const comment = (body.comment || '').trim()
        if (!Number.isInteger(monumentId) || monumentId < 1) {
          return send(res, 400, { error: 'Некорректный monumentId' }, req)
        }
        {
          const monuments = await getMonuments()
          if (!monuments.some((m) => m.id === monumentId)) {
            return send(res, 400, { error: 'Памятник не найден' }, req)
          }
        }
        if (!/^https?:\/\//i.test(urlRaw) || urlRaw.length > 2048) {
          return send(res, 400, { error: 'Укажите корректный URL изображения (http/https)' })
        }
        if (source.length > 120) return send(res, 400, { error: 'Название источника слишком длинное' })
        if (comment.length > 500) return send(res, 400, { error: 'Комментарий слишком длинный' })
        const data = loadData()
        const id = data.reduce((m, x) => Math.max(m, x.id), 0) + 1
        const rec = {
          id,
          monumentId,
          url: urlRaw,
          source: source || hostOf(urlRaw),
          sourceUrl: sourceUrl || null,
          comment: comment || null,
          status: 'pending',
          submittedAt: new Date().toISOString()
        }
        data.push(rec)
        saveData(data)
        return send(res, 201, { ok: true, id, status: 'pending' })
      }

      // ---- Стена памяти: публичное чтение одобренных, отправка истории ----
      if (p === '/api/wall' && req.method === 'GET') {
        const monumentId = Number(url.searchParams.get('monumentId'))
        let list = loadWall().filter((x) => x.status === 'approved')
        if (monumentId) list = list.filter((x) => x.monumentId === monumentId)
        list.sort((a, b) => b.id - a.id)
        return send(res, 200, {
          entries: list.map(({ id, monumentId, name, text, createdAt }) => ({ id, monumentId, name, text, createdAt }))
        }, req)
      }

      if (p === '/api/wall' && req.method === 'POST') {
        if (!rateLimit('wall:' + ip, 6, 60_000)) return send(res, 429, { error: 'Слишком часто, попробуйте через минуту' }, req)
        const body = await readBody(req)
        const monumentId = Number(body.monumentId)
        const name = String(body.name || '').trim().slice(0, 60)
        const text = String(body.text || '').trim()
        if (!Number.isInteger(monumentId) || monumentId < 1) {
          return send(res, 400, { error: 'Некорректный памятник' }, req)
        }
        if (text.length < 10) return send(res, 400, { error: 'Рассказ слишком короткий (минимум 10 символов)' }, req)
        if (text.length > 500) return send(res, 400, { error: 'Рассказ слишком длинный (максимум 500 символов)' }, req)
        const monuments = await getMonuments()
        if (!monuments.some((m) => m.id === monumentId)) {
          return send(res, 400, { error: 'Памятник не найден' }, req)
        }
        const data = loadWall()
        const id = data.reduce((mx, x) => Math.max(mx, x.id), 0) + 1
        data.push({
          id, monumentId,
          name: name || 'Гость',
          text,
          status: 'pending',
          createdAt: new Date().toISOString()
        })
        saveWall(data)
        return send(res, 201, { ok: true, id, status: 'pending' }, req)
      }

      // ---- Заявки на новые памятники ----
      if (p === '/api/monuments/suggest' && req.method === 'POST') {
        if (!rateLimit('suggest:' + ip, 3, 60_000)) return send(res, 429, { error: 'Слишком часто, попробуйте позже' }, req)
        const body = await readBody(req)
        const title = String(body.title || '').trim()
        const city = String(body.city || '').trim()
        const region = String(body.region || '').trim().slice(0, 80) || '—'
        const description = String(body.description || '').trim()
        const photoUrl = String(body.photoUrl || '').trim()
        const sourceUrl = String(body.sourceUrl || '').trim()
        const authorName = String(body.authorName || '').trim().slice(0, 60)
        const year = Number(body.year)
        const category = String(body.category || '').trim().slice(0, 40) || 'Исторические'
        const lat = Number(body.lat)
        const lng = Number(body.lng)
        const force = body.force === true

        if (title.length < 3 || title.length > 120) return send(res, 400, { error: 'Название: от 3 до 120 символов' }, req)
        if (city.length < 2) return send(res, 400, { error: 'Укажите город или населённый пункт' }, req)
        if (description.length < 50 || description.length > 2000) {
          return send(res, 400, { error: 'Описание: от 50 до 2000 символов' }, req)
        }
        if (!/^https?:\/\//i.test(photoUrl) || photoUrl.length > 2048) {
          return send(res, 400, { error: 'Укажите корректную ссылку на фото (http/https)' }, req)
        }
        if (!/^https?:\/\//i.test(sourceUrl) && sourceUrl) {
          return send(res, 400, { error: 'Ссылка на источник должна начинаться с http(s)://' }, req)
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 41 || lat > 82 || lng < 19 || lng > 190) {
          return send(res, 400, { error: 'Координаты вне территории России — проверьте широту и долготу' }, req)
        }

        const monuments = await getMonuments()
        // проверка на дубли: то же название ИЛИ точка в 250 м от существующего
        let duplicateOf = null
        const tNorm = norm(title)
        for (const m of monuments) {
          if (norm(m.title) === tNorm || kmBetween(lat, lng, m.coordinates.lat, m.coordinates.lng) <= 0.25) {
            duplicateOf = { id: m.id, title: m.title, city: m.city, slug: m.slug }
            break
          }
        }
        if (duplicateOf && !force) {
          return send(res, 409, {
            error: 'Похоже, такой памятник уже есть в каталоге',
            duplicateOf
          }, req)
        }

        const all = loadSuggestions()
        const id = all.reduce((mx, x) => Math.max(mx, x.id), 0) + 1
        all.push({
          id,
          title, city, region,
          year: Number.isInteger(year) && year >= 1500 && year <= 2100 ? year : null,
          category, description, photoUrl,
          sourceUrl: sourceUrl || null,
          authorName: authorName || 'Гость',
          lat, lng,
          duplicateOf: duplicateOf ? duplicateOf.id : null,
          status: 'pending',
          createdAt: new Date().toISOString()
        })
        saveSuggestions(all)
        return send(res, 201, { ok: true, id, status: 'pending', duplicateOf }, req)
      }

      if (p === '/api/admin/login' && req.method === 'POST') {
        if (!rateLimit('login:' + ip, 10, 5 * 60_000)) return send(res, 429, { error: 'Слишком много попыток входа' }, req)
        const body = await readBody(req)
        const hash = sha256((body.password || '').trim())
        if (hashEq(hash, config.adminPasswordHash)) {
          return send(res, 200, { ok: true, token: createSession() })
        }
        return send(res, 401, { error: 'Неверный пароль' })
      }

      if (p.startsWith('/api/admin/')) {
        if (!auth(req)) return send(res, 401, { error: 'Требуется авторизация' })

        if (p === '/api/admin/photos' && req.method === 'GET') {
          const all = loadData().slice().sort((a, b) => b.id - a.id)
          return send(res, 200, { photos: all })
        }

        const m = p.match(/^\/api\/admin\/photos\/(\d+)\/(approve|reject)$/)
        if (m && req.method === 'POST') {
          const id = Number(m[1])
          const status = m[2] === 'approve' ? 'approved' : 'rejected'
          const data = loadData()
          const rec = data.find((x) => x.id === id)
          if (!rec) return send(res, 404, { error: 'Заявка не найдена' })
          rec.status = status
          rec.moderatedAt = new Date().toISOString()
          saveData(data)
          return send(res, 200, { ok: true, id, status })
        }

        // ---- Модерация стены памяти ----
        if (p === '/api/admin/wall' && req.method === 'GET') {
          const all = loadWall().slice().sort((a, b) => b.id - a.id)
          return send(res, 200, { entries: all })
        }

        const w = p.match(/^\/api\/admin\/wall\/(\d+)\/(approve|reject)$/)
        if (w && req.method === 'POST') {
          const id = Number(w[1])
          const status = w[2] === 'approve' ? 'approved' : 'rejected'
          const data = loadWall()
          const rec = data.find((x) => x.id === id)
          if (!rec) return send(res, 404, { error: 'Запись не найдена' })
          rec.status = status
          rec.moderatedAt = new Date().toISOString()
          saveWall(data)
          return send(res, 200, { ok: true, id, status })
        }

        // ---- Модерация заявок на памятники ----
        if (p === '/api/admin/monuments' && req.method === 'GET') {
          const all = loadSuggestions().slice().sort((a, b) => b.id - a.id)
          return send(res, 200, { entries: all })
        }

        const s = p.match(/^\/api\/admin\/monuments\/(\d+)\/(approve|reject)$/)
        if (s && req.method === 'POST') {
          const result = await serializeWrite(async () => {
            const id = Number(s[1])
            const all = loadSuggestions()
            const rec = all.find((x) => x.id === id)
            if (!rec) return { status: 404, body: { error: 'Заявка не найдена' } }
            rec.status = s[2] === 'approve' ? 'approved' : 'rejected'
            rec.moderatedAt = new Date().toISOString()

            if (rec.status === 'approved') {
              const monuments = await getMonuments()
              const nextId = monuments.reduce((mx, m) => Math.max(mx, m.id), 0) + 1
              let slug = slugifyRu(rec.title)
              const taken = new Set(monuments.map((m) => m.slug))
              if (taken.has(slug)) slug = `${slug}-${nextId}`
              const host = (() => { try { return new URL(rec.photoUrl).hostname } catch { return 'посетитель' } })()
              const entry = {
                id: nextId,
                slug,
                title: rec.title,
                city: rec.city,
                region: rec.region,
                year: rec.year,
                category: rec.category,
                shortDescription: rec.description.slice(0, 220),
                fullHistory: rec.description,
                coordinates: { lat: rec.lat, lng: rec.lng },
                facts: [
                  `${rec.city}${rec.region && rec.region !== '—' ? ', ' + rec.region : ''}`,
                  rec.year ? `Год: ${rec.year}` : null,
                  'Добавлено посетителем проекта'
                ].filter(Boolean),
                likes: 0,
                images: [{ url: rec.photoUrl, source: host, sourceUrl: rec.sourceUrl }],
                factsSource: {
                  label: rec.sourceUrl ? 'Предложено посетителем · источник' : 'Предложено посетителем',
                  url: rec.sourceUrl || null
                }
              }
              monuments.push(entry)
              monumentsCache = monuments
              // Клиент читает каталог через /api/catalog: достаточно
              // записать данные и сбросить кэш тела — пересборка не нужна
              // (запасной чанк в бандле — лишь офлайн-копия на случай недоступности API).
              invalidateCatalog()
              writeFileSync(
                join(ROOT, 'src', 'data', 'monuments.js'),
                `export const monuments = ${JSON.stringify(monuments, null, 2)}\n`,
                'utf8'
              )
            }
            saveSuggestions(all)
            return { status: 200, body: { ok: true, id, status: rec.status } }
          })
          return send(res, result.status, result.body, req)
        }

        return send(res, 404, { error: 'Не найден' })
      }

      return send(res, 404, { error: 'Не найден' })
    }

    // ---- Admin panel ----
    if (p === '/admin' || p.startsWith('/admin/')) {
      const rel = p.replace(/^\/admin/, '')
      const file = rel === '' ? join(ADMIN_DIR, 'admin.html') : resolveFile(ADMIN_DIR, rel)
      if (file && existsSync(file) && statSync(file).isFile()) {
        res.writeHead(200, secHeaders({
          'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        }, true))
        return res.end(readFileSync(file))
      }
      res.writeHead(404, secHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }, true))
      return res.end('Not found')
    }

    // ---- Static dist ----
    const file = resolveFile(DIST, p)
    if (file && existsSync(file) && statSync(file).isFile()) {
      const st = statSync(file)
      const ext = extname(file).toLowerCase()
      const headers = secHeaders({ 'Content-Type': MIME[ext] || 'application/octet-stream' })
      // хэшированные ассеты Vite неизменяемы — кэшируем на год;
      // index.html всегда перечитываем
      if (file.includes(join(DIST, 'assets'))) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      } else {
        headers['Cache-Control'] = 'no-cache'
      }
      // ключ gzip-кэша с mtime: пересборка dist при живом сервере
      // не оставит посетителей со старой сжатой копией
      return writeMaybeGzip(res, 200, readFileSync(file), headers, req, `${file}:${st.mtimeMs}`)
    }
    // SPA fallback
    const idx = join(DIST, 'index.html')
    if (existsSync(idx)) {
      res.writeHead(200, secHeaders({ 'Content-Type': 'text/html; charset=utf-8' }))
      return res.end(readFileSync(idx))
    }
    res.writeHead(404, secHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }))
    res.end('Not found')
  } catch (e) {
    console.error(e)
    send(res, 500, { error: 'Server error' })
  }
})

function hostOf(u) {
  try { return new URL(u).hostname } catch { return String(u).slice(0, 60) }
}

let monumentsCache = null
let catalogJsonCache = null
let catalogGen = 0
async function getMonuments() {
  if (!monumentsCache) {
    const mod = await import('../src/data/monuments.js')
    monumentsCache = mod.monuments
  }
  return monumentsCache
}

async function getCatalogJson() {
  if (!catalogJsonCache) {
    const monuments = await getMonuments()
    catalogJsonCache = Buffer.from(JSON.stringify({ monuments }))
  }
  return catalogJsonCache
}

function invalidateCatalog() {
  catalogJsonCache = null
  catalogGen++ // новое поколение = новый ключ gzip-кэша телом каталога
}

// Мутации файлов данных (заявки, стена, модерация) сериализуются:
// read-modify-write с await между шагами мог терять записи при
// одновременных запросах.
let writeQueue = Promise.resolve()
function serializeWrite(fn) {
  const next = writeQueue.then(fn, fn)
  // очередь не должна навсегда застревать из-за отброшенной ошибки
  writeQueue = next.catch(() => {})
  return next
}

server.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`)
  console.log(`Админ-панель: http://localhost:${PORT}/admin`)
})