// Подготовка данных для агентов-исследователей:
// 1) записи с шаблонным fullHistory — батчами в batch-N.json
// 2) сводка существующего каталога для поиска НОВЫХ памятников
import fs from 'node:fs'
import { monuments } from '../../src/data/monuments.js'

const TEMPLATE_MARKERS = [
  'Самые любопытные и неожиданные монументы',
  'Такие памятники удивляют, заставляют улыбнуться',
  'Кулинарная география России нашла своё отражение',
  'За каждым монументом стоит судьба людей',
  'Городская среда сама превращается в произведение искусства',
  'Маленькие бронзовые фигурки, которые нужно отыскать глазами',
  'Память о подвиге — священная часть монументального искусства',
  'Духовное наследие России бережно сохраняется в монументах'
]

const isTemplate = (m) => TEMPLATE_MARKERS.some((t) => (m.fullHistory || '').includes(t))
const templ = monuments.filter(isTemplate)
console.log(`Всего: ${monuments.length}, с шаблонным текстом: ${templ.length}, с фото: ${monuments.filter((m) => m.images && m.images.length).length}`)

fs.mkdirSync('scripts/enrich', { recursive: true })

const BATCHES = 8
for (let i = 0; i < BATCHES; i++) {
  const part = templ.filter((_, idx) => idx % BATCHES === i).map((m) => ({
    id: m.id,
    title: m.title,
    city: m.city,
    region: m.region,
    year: m.year,
    category: m.category,
    shortDescription: m.shortDescription,
    coordinates: m.coordinates,
    hasPhoto: !!(m.images && m.images.length)
  }))
  fs.writeFileSync(`scripts/enrich/batch-${i + 1}.json`, JSON.stringify(part, null, 2), 'utf8')
  console.log(`batch-${i + 1}.json: ${part.length}`)
}

// Сводка для охотников за новыми: список существующих названий + покрытие регионов
const byRegion = {}
for (const m of monuments) {
  byRegion[m.region] = (byRegion[m.region] || 0) + 1
}
fs.writeFileSync(
  'scripts/enrich/existing.json',
  JSON.stringify({
    total: monuments.length,
    titles: monuments.map((m) => `${m.title} (${m.city})`),
    regionsWithCounts: Object.entries(byRegion).sort((a, b) => a[1] - b[1])
  }, null, 2),
  'utf8'
)
console.log('existing.json готов')
