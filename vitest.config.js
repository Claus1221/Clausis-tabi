import { defineConfig } from 'vitest/config'

// Eigene, schlanke Test-Konfiguration getrennt von vite.config.js (PWA-Plugin,
// Git-Hash-Ermittlung u. ä. sind für reine Logik-Tests irrelevant und sollen den
// Testlauf nicht beeinflussen können). Reine Funktionslogik → kein DOM nötig.
export default defineConfig({
  test: {
    environment: 'node',
  },
})
