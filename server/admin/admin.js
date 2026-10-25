/* Админ-панель «Бессмертная память».
   Безопасность: DOM строится через createElement/textContent —
   пользовательские строки никогда не попадают в innerHTML;
   внешние ссылки создаются только для http(s)-URL. */
'use strict'

const $ = (id) => document.getElementById(id)
const state = { tab: 'pending', photos: [], wall: [], suggests: [], monuments: new Map() }

// ---------- утилиты ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else node.setAttribute(k, v)
  }
  for (const child of children) {
    if (child == null) continue
    node.append(child)
  }
  return node
}

// href создаётся только для http(s)-URL (сервер уже валидировал, дублируем на клиенте)
function safeLink(url, text) {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text })
  }
  return document.createTextNode(String(url == null ? '' : url))
}

function safeImg(url, alt) {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    const img = el('img', { src: url, alt: alt || '' })
    img.addEventListener('error', () => { img.style.opacity = '0.25' })
    return img
  }
  return el('div', { class: 'url-row', text: 'URL не пройдёт проверку безопасности' })
}

function fmtDate(iso) {
  return String(iso || '').replace('T', ' ').slice(0, 16)
}

// ---------- API ----------
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (opts.body) headers['Content-Type'] = 'application/json'
  const r = await fetch(path, { ...opts, headers, credentials: 'same-origin' })
  if (r.status === 401) {
    showLogin()
    throw new Error('unauthorized')
  }
  return r.json()
}

// ---------- login / logout ----------
function showLogin() {
  $('panel').style.display = 'none'
  $('login').style.display = 'block'
  $('head-right').replaceChildren()
  setTimeout(() => $('pass').focus(), 50)
}

function showPanel() {
  $('login').style.display = 'none'
  $('panel').style.display = 'block'
  const b = el('button', { class: 'secondary', text: 'Выйти' })
  b.addEventListener('click', logout)
  $('head-right').replaceChildren(b)
  load()
}

async function logout() {
  try { await api('/api/admin/logout', { method: 'POST', body: '{}' }) } catch { /* уже разлогинены */ }
  showLogin()
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  $('login-err').textContent = ''
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: $('pass').value })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      showPanel()
    } else {
      $('login-err').textContent = data.error || 'Ошибка входа'
    }
  } catch {
    $('login-err').textContent = 'Сервер недоступен'
  }
})

// ---------- загрузка ----------
async function load() {
  try {
    const res = await api('/api/admin/photos')
    state.photos = res.photos || []
  } catch { state.photos = [] }
  await loadMonuments()
  render()
}

async function loadWall() {
  try {
    const res = await api('/api/admin/wall')
    state.wall = res.entries || []
  } catch { state.wall = [] }
  await loadMonuments()
  renderWall()
}

async function loadMonuments() {
  if (state.monuments.size) return
  try {
    const res = await fetch('/api/monuments')
    const data = await res.json()
    state.monuments = new Map((data.monuments || []).map((m) => [m.id, m]))
  } catch { state.monuments = new Map() }
}

async function loadSuggests() {
  try {
    const res = await api('/api/admin/monuments')
    state.suggests = res.entries || []
  } catch { state.suggests = [] }
  renderSuggests()
}

// ---------- табы ----------
const TABS = ['pending', 'approved', 'rejected', 'wall', 'monuments']
for (const t of TABS) {
  $('tab-' + t).addEventListener('click', () => {
    state.tab = t
    setTab()
    if (t === 'wall') loadWall()
    else if (t === 'monuments') loadSuggests()
    else render()
  })
}

function setTab() {
  for (const t of TABS) $('tab-' + t).classList.toggle('on', state.tab === t)
}

// ---------- модерация ----------
async function moderate(id, action) {
  await api(`/api/admin/photos/${id}/${action}`, { method: 'POST', body: '{}' })
  load()
}

async function moderateWall(id, action) {
  await api(`/api/admin/wall/${id}/${action}`, { method: 'POST', body: '{}' })
  loadWall()
}

async function moderateSuggest(id, action, btn) {
  if (btn) { btn.disabled = true; btn.textContent = action === 'approve' ? 'Добавляем…' : '…' }
  try {
    await api(`/api/admin/monuments/${id}/${action}`, { method: 'POST', body: '{}' })
  } catch (e) {
    if (e.message === 'unauthorized') return
  }
  loadSuggests()
}

// ---------- карточки ----------
function monumentName(id) {
  const m = state.monuments.get(id)
  return m ? m.title : `Памятник #${id}`
}

function statusBadge(status) {
  return el('span', { class: 'badge ' + status, text: status })
}

function render() {
  const list = state.photos.filter((p) => p.status === state.tab)
  const root = $('list')
  if (!list.length) {
    root.replaceChildren(el('div', { class: 'empty', text: 'Нет записей' }))
    return
  }
  const cards = list.map((p) => {
    const m = state.monuments.get(p.monumentId)
    const body = el('div', { class: 'body' })
    body.append(el('h3', { class: 'title', text: monumentName(p.monumentId) }))
    if (m) body.append(el('div', { class: 'url-row', text: `${m.city} · ${m.region}` }))

    const meta = el('div', { class: 'meta' })
    meta.append(el('span', { text: '' }, el('b', { text: 'ID заявки: ' + p.id })))
    meta.append(el('span', { text: 'Статус: ' }, statusBadge(p.status)))
    meta.append(el('span', { text: fmtDate(p.submittedAt) }))
    body.append(meta)

    const urlRow = el('div', { class: 'url-row' })
    urlRow.append(safeLink(p.url, p.url))
    body.append(urlRow)

    if (p.source) {
      const src = el('div', { class: 'url-row', text: 'Источник: ' + p.source + ' ' })
      if (p.sourceUrl) src.append(safeLink(p.sourceUrl, '(ссылка)'))
      body.append(src)
    }
    if (p.comment) body.append(el('div', { class: 'comment', text: 'Комментарий: ' + p.comment }))

    if (p.status === 'pending') {
      const actions = el('div', { class: 'actions' })
      const ok = el('button', { text: 'Принять' })
      ok.addEventListener('click', () => moderate(p.id, 'approve'))
      const no = el('button', { class: 'reject', text: 'Отклонить' })
      no.addEventListener('click', () => moderate(p.id, 'reject'))
      actions.append(ok, no)
      body.append(actions)
    } else {
      body.append(el('div', { class: 'status', text: `ID: ${p.id} · статус: ${p.status}` }))
    }
    return el('div', { class: 'card' }, safeImg(p.url, ''), body)
  })
  root.replaceChildren(...cards)
}

function renderWall() {
  const list = state.wall
  const root = $('list')
  if (!list.length) {
    root.replaceChildren(el('div', { class: 'empty', text: 'На стене памяти пока нет записей' }))
    return
  }
  const cards = list.map((w) => {
    const body = el('div', { class: 'body' })
    body.append(el('h3', { class: 'title', text: monumentName(w.monumentId) }))
    const m = state.monuments.get(w.monumentId)
    if (m) body.append(el('div', { class: 'url-row', text: m.city }))
    const meta = el('div', { class: 'meta' })
    meta.append(el('span', { text: '' }, el('b', { text: w.name }), document.createTextNode(' · ' + fmtDate(w.createdAt))))
    meta.append(statusBadge(w.status))
    body.append(meta)
    body.append(el('div', { class: 'comment', text: '«' + w.text + '»' }))
    if (w.status === 'pending') {
      const actions = el('div', { class: 'actions' })
      const ok = el('button', { text: 'Опубликовать' })
      ok.addEventListener('click', () => moderateWall(w.id, 'approve'))
      const no = el('button', { class: 'reject', text: 'Отклонить' })
      no.addEventListener('click', () => moderateWall(w.id, 'reject'))
      actions.append(ok, no)
      body.append(actions)
    } else {
      body.append(el('div', { class: 'status', text: `ID: ${w.id} · статус: ${w.status}` }))
    }
    return el('div', { class: 'card' }, body)
  })
  root.replaceChildren(...cards)
}

function renderSuggests() {
  const list = state.suggests
  const root = $('list')
  if (!list.length) {
    root.replaceChildren(el('div', { class: 'empty', text: 'Заявок на памятники пока нет' }))
    return
  }
  const cards = list.map((s) => {
    const body = el('div', { class: 'body' })
    body.append(el('h3', { class: 'title', text: s.title }))
    body.append(el('div', {
      class: 'url-row',
      text: `${s.city}${s.region && s.region !== '—' ? ' · ' + s.region : ''}${s.year ? ' · ' + s.year : ''} · ${s.category}`
    }))
    if (s.duplicateOf) {
      body.append(el('div', { class: 'meta warn', text: `⚠ возможно дубль памятника #${s.duplicateOf}` }))
    }
    const meta = el('div', { class: 'meta' })
    meta.append(el('span', { text: '' }, el('b', { text: 'Автор: ' + s.authorName }), document.createTextNode(' · ' + fmtDate(s.createdAt))))
    meta.append(statusBadge(s.status))
    body.append(meta)
    body.append(el('div', { class: 'comment', text: '«' + s.description.slice(0, 400) + (s.description.length > 400 ? '…' : '') + '»' }))

    const coords = el('div', { class: 'url-row', text: `Координаты: ${s.lat}, ${s.lng} · ` })
    const lat = encodeURIComponent(String(s.lat))
    const lon = encodeURIComponent(String(s.lng))
    coords.append(safeLink(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`, 'на карте'))
    coords.append(document.createTextNode(' '))
    if (s.sourceUrl) coords.append(safeLink(s.sourceUrl, 'источник'))
    body.append(coords)

    if (s.status === 'pending') {
      const actions = el('div', { class: 'actions' })
      const ok = el('button', { text: 'Одобрить и добавить' })
      ok.addEventListener('click', () => moderateSuggest(s.id, 'approve', ok))
      const no = el('button', { class: 'reject', text: 'Отклонить' })
      no.addEventListener('click', () => moderateSuggest(s.id, 'reject', no))
      actions.append(ok, no)
      body.append(actions)
    } else {
      body.append(el('div', { class: 'status', text: `ID: ${s.id} · статус: ${s.status}` }))
    }
    return el('div', { class: 'card' }, safeImg(s.photoUrl, ''), body)
  })
  root.replaceChildren(...cards)
}

// ---------- bootstrap ----------
// Cookie HttpOnly не виден JS — статус проверяем реальным запросом:
// 401 покажет логин, 200 — панель.
api('/api/admin/photos')
  .then(() => showPanel())
  .catch(() => showLogin())
