import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { importsOf, violations } from './importRules.js'

// Wächter der Zweig-Grenze (Regeln in importRules.js). Erst werden die Regeln an kleinen
// Dateien im Speicher geprüft – jeder bekannte Umgehungsweg muss auffallen –, dann
// läuft dieselbe Funktion über den echten Quellbaum.

const SRC = fileURLToPath(new URL('..', import.meta.url))

function listFiles(dir, rel = '') {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap(e => {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) return listFiles(dir, r)
    return /\.jsx?$/.test(e.name) ? [r] : []
  })
}

const flagged = (path, source) => violations([{ path, source }])

describe('importsOf', () => {
  it('liest benannte Importe samt Umbenennung', () => {
    expect(importsOf("import { chatTurn as t, parseJson } from '../lib/claude.js'"))
      .toEqual([{ specifier: '../lib/claude.js', names: ['chatTurn', 'parseJson'] }])
  })
  it('ignoriert Importe in Zeichenketten und Kommentaren', () => {
    expect(importsOf("const s = \"import x from '../data/kana.js'\" // import y from 'z'")).toEqual([])
  })
})

describe('Regeln: muss auffallen', () => {
  const NE = 'ne/x.js'
  const cases = {
    'statischer Import': [NE, "import { KANA_DATA } from '../data/kana.js'"],
    'Default-Import': [NE, "import kana from '../data/kana.js'"],
    'export … from': [NE, "export { KANA_DATA } from '../data/kana.js'"],
    'export * from': [NE, "export * from '../data/kana.js'"],
    'Seiteneffekt-Import': [NE, "import '../data/kana.js'"],
    'dynamischer Import': [NE, "const m = import('../data/kana.js')"],
    'Kommentar in der Importliste': [NE, "import { a, // x\n b } from '../data/kana.js'"],
    'Kommentar im dynamischen Import': [NE, "import(/* c */ '../data/kana.js')"],
    'Template-String im dynamischen Import': [NE, 'import(`../data/${name}.js`)'],
    'dynamischer Import mit Variable': [NE, 'import(path)'],
    'import.meta.glob': [NE, "import.meta.glob('../data/*.js')"],
    'verbotener Name aus lib/claude.js': [NE, "import { chatTurn, buildPrompt } from '../lib/claude.js'"],
    'Default aus lib/claude.js': [NE, "import * as claude from '../lib/claude.js'"],
    'fremdes Paket': [NE, "import { getDoc } from 'firebase/firestore'"],
    'Testpaket außerhalb von Tests': [NE, "import { it } from 'vitest'"],
    'Pfad aus src/ hinaus': [NE, "import x from '../../scripts/a.js'"],
    'Japanisch importiert aus ne/': ['screens/a.jsx', "import { aksharas } from '../ne/lib/deva.js'"],
    'Japanisch importiert das Verzeichnis ne': ['screens/a.jsx', "import x from '../ne'"],
    'Japanisch: dynamischer Import nach ne/': ['TabiApp.jsx', "lazy(() => import('./ne/NepaliApp.jsx'))"],
    'Japanisch: Template-Import': ['TabiApp.jsx', 'import(`./ne/${x}.jsx`)'],
    'Japanisch: import.meta.glob': ['TabiApp.jsx', "import.meta.glob('./ne/**/*.jsx')"],
  }
  for (const [name, [path, source]] of Object.entries(cases)) {
    it(name, () => expect(flagged(path, source)).toHaveLength(1))
  }
})

describe('Regeln: erlaubt', () => {
  const cases = {
    'LangGate lädt NepaliApp': ['LangGate.jsx', "const N = lazy(() => import('./ne/NepaliApp.jsx'))"],
    'ne importiert theme.js': ['ne/data/x.js', "import { C, NE } from '../../theme.js'"],
    'ne importiert innerhalb ne/': ['ne/screens/x.jsx', "import { aksharas } from '../lib/deva.js'"],
    'ne importiert erlaubte Namen aus lib/claude.js': ['ne/x.js', "import { chatTurn, parseJson as p } from '../lib/claude.js'"],
    'ne importiert react': ['ne/x.jsx', "import { useState } from 'react'"],
    'ne-Test importiert vitest und node:': ['ne/x.test.js', "import { it } from 'vitest'\nimport { readFileSync } from 'node:fs'"],
    'import.meta.env ist kein Import': ['ne/x.js', "const b = import.meta.env.BASE_URL + 'audio-ne/'"],
    'Japanisch importiert Japanisch': ['TabiApp.jsx', "import x from './screens/reise.jsx'\nconst y = import('./screens/lernen.jsx')"],
    'Importtext in Zeichenkette': ['ne/x.test.js', "const s = \"import k from '../data/kana.js'\""],
  }
  for (const [name, [path, source]] of Object.entries(cases)) {
    it(name, () => expect(flagged(path, source)).toEqual([]))
  }
})

describe('echter Quellbaum', () => {
  const files = listFiles(SRC).map(path => ({ path, source: readFileSync(join(SRC, path), 'utf8') }))

  it('der Leser findet Importe überhaupt (sonst wäre die Prüfung leer)', () => {
    const gate = files.find(f => f.path === 'LangGate.jsx')
    expect(importsOf(gate.source).map(i => i.specifier)).toContain('./ne/NepaliApp.jsx')
    expect(importsOf(files.find(f => f.path === 'ne/NepaliApp.jsx').source).length).toBeGreaterThan(0)
  })

  it('keine Verletzung der Importgrenze Japanisch ↔ Nepali', () => {
    expect(violations(files)).toEqual([])
  })
})
