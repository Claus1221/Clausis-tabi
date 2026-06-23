import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BASE = '/Clausis-tabi/'

// Versionsinfos zur Build-Zeit ermitteln (für die Versionsanzeige in der App).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
let commitHash = 'dev'
try { commitHash = execSync('git rev-parse --short HEAD').toString().trim() } catch { /* kein git → 'dev' */ }
const buildTime = new Date().toISOString()

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(commitHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tabi – Japanisch lernen',
        short_name: 'Tabi',
        description: 'Japanisch für Reisende – Hiragana, Katakana & Überlebensphrasen',
        lang: 'de',
        theme_color: '#DA4A38',
        background_color: '#EFEBE0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  build: {
    // Vendor-Code in eigene, langlebig cachebare Chunks (Firebase ist mit Abstand
    // die groesste Abhaengigkeit). Die Screens splittet Vite via React.lazy selbst.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
            if (id.includes('/react') || id.includes('/scheduler')) return 'vendor-react'
          }
        },
      },
    },
  },
})
