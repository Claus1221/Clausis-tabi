import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

// Wächter der Zweig-Grenze: Japanisch und Nepali sollen sich nie gegenseitig
// mitziehen (Bundle-Größe, und eine Änderung am einen Kurs darf den anderen nicht
// still verändern). Wir lesen den Quelltext statt den Modulgraphen zu bauen –
// das ist ohne Bundler möglich und fängt auch Importe in nie geladenen Dateien.

const SRC = fileURLToPath(new URL('..', import.meta.url))

// Sprachneutraler Kern, den src/ne/** benutzen darf (Pfade relativ zu src/).
const ALLOWED = new Set([
  'theme.js', 'useProgress.js', 'state/ProgressContext.js', 'AuthGate.jsx', 'LangGate.jsx',
  'components/ui.jsx', 'components/ueben.jsx', 'screens/adminUsers.jsx',
  'lib/xp.js', 'lib/progress.js', 'lib/apiKey.js', 'lib/lang.js',
])
// lib/claude.js enthält auch japanischen Prompt-Kram; nur diese Namen sind neutral.
const CLAUDE_OK = new Set(['chatTurn', 'parseJson', 'hasApiKey', 'pingApiKey'])
// Pakete: React überall; Testwerkzeuge nur in Testdateien.
const BARE_OK = new Set(['react'])
const isTest = f => /\.test\.jsx?$/.test(f)

function listFiles(dir, rel = '') {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap(e => {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) return listFiles(dir, r)
    return /\.jsx?$/.test(e.name) ? [r] : []
  })
}

// Liefert { spec, names } je Import. names = importierte Namen bei `import { a, b } from`,
// sonst null (Default-, Namespace-, Seiteneffekt- oder dynamischer Import).
function importsOf(code) {
  const out = []
  const re = /\b(?:import|export)\s*([\w*{}\s,$]*?)\s*from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const m of code.matchAll(re)) {
    if (m[2]) {
      const clause = m[1].trim()
      const named = /^\{[^}]*\}$/.test(clause)
      out.push({
        spec: m[2],
        names: named ? clause.slice(1, -1).split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : null,
      })
    } else out.push({ spec: m[3] || m[4], names: null })
  }
  return out
}

// Relativer Spezifizierer → Pfad relativ zu src/ (posix); Pakete bleiben wie sie sind.
const resolve = (file, spec) => (spec.startsWith('.') ? posix.join(posix.dirname(file), spec) : spec)

const FILES = listFiles(SRC).map(f => ({ file: f, imports: importsOf(readFileSync(join(SRC, f), 'utf8')) }))

describe('Importgrenze Japanisch ↔ Nepali', () => {
  it('der Leser findet Importe überhaupt (sonst wären die Prüfungen leer)', () => {
    const gate = FILES.find(f => f.file === 'LangGate.jsx')
    expect(gate.imports.map(i => resolve('LangGate.jsx', i.spec))).toContain('ne/NepaliApp.jsx')
    expect(FILES.find(f => f.file === 'ne/NepaliApp.jsx').imports.length).toBeGreaterThan(0)
    expect(importsOf("import { chatTurn as t, parseJson } from '../lib/claude.js'"))
      .toEqual([{ spec: '../lib/claude.js', names: ['chatTurn', 'parseJson'] }])
  })

  it('keine Datei außerhalb src/ne/ importiert aus ne/ (außer LangGate.jsx)', () => {
    const bad = FILES
      .filter(f => !f.file.startsWith('ne/') && f.file !== 'LangGate.jsx')
      .flatMap(f => f.imports
        .filter(i => resolve(f.file, i.spec).startsWith('ne/') || i.spec.includes('/ne/'))
        .map(i => `${f.file} → ${i.spec}`))
    expect(bad).toEqual([])
  })

  it('src/ne/ importiert nur aus ne/ und dem erlaubten Kern', () => {
    const bad = []
    for (const { file, imports } of FILES.filter(f => f.file.startsWith('ne/'))) {
      for (const { spec, names } of imports) {
        const path = resolve(file, spec)
        if (!spec.startsWith('.')) {
          const ok = BARE_OK.has(spec) || (isTest(file) && (spec === 'vitest' || spec.startsWith('node:')))
          if (!ok) bad.push(`${file} → ${spec}`)
        } else if (path === 'lib/claude.js') {
          if (!names || names.some(n => !CLAUDE_OK.has(n))) bad.push(`${file} → ${spec} { ${names ?? '*'} }`)
        } else if (!path.startsWith('ne/') && !ALLOWED.has(path)) bad.push(`${file} → ${spec}`)
      }
    }
    expect(bad).toEqual([])
  })
})
