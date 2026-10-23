import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Service worker версионируется отпечатком собранного index.html: каждый
// деплой меняет версию — SW обновляется и вычищает кэши прошлой сборки,
// между деплоями версия стабильна. Шаблон лежит в корне (sw.template.js),
// в dist попадает уже проштампованный /sw.js.
function swVersionPlugin() {
  return {
    name: 'sw-version',
    generateBundle(_, bundle) {
      const htmlAsset = bundle['index.html']
      const html = htmlAsset && htmlAsset.source ? String(htmlAsset.source) : String(Date.now())
      const version = createHash('sha1').update(html).digest('hex').slice(0, 12)
      let src = readFileSync(join(process.cwd(), 'sw.template.js'), 'utf8')
      src = src.replace(/const VERSION = '[^']*'/, `const VERSION = '${version}'`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src })
    }
  }
}

// sitemap.xml + robots.txt из данных каталога. SITE_URL задаётся окружением
// при сборке (например SITE_URL=https://pamyat.ru npm run build); без него —
// адрес по умолчанию, файлы потом можно перегенерировать.
function sitemapPlugin() {
  return {
    name: 'sitemap',
    async generateBundle() {
      const dataUrl = pathToFileURL(join(process.cwd(), 'src', 'data', 'monuments.js')).href
      const { monuments } = await import(dataUrl)
      const base = (process.env.SITE_URL || 'http://localhost:8765').replace(/\/$/, '')
      const urls = [
        `${base}/`,
        `${base}/map`,
        `${base}/regions`,
        ...monuments.map((m) => `${base}/monument/${encodeURIComponent(m.slug)}`)
      ]
      const today = new Date().toISOString().slice(0, 10)
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
        '\n</urlset>\n'
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), swVersionPlugin(), sitemapPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:8765'
    },
    watch: {
      // данные API и служебные папки не входят в модульный граф:
      // их изменение не должно перезагружать страницу (иначе любая
      // модерация/заявка «роняет» открытые модалки в dev-режиме)
      ignored: ['**/server/**', '**/dist/**', '**/scripts/**']
    }
  },
})
