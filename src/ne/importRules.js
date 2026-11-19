// Regeln der Importgrenze Japanisch ↔ Nepali als reine Funktion (kein node:*, kein window),
// damit imports.test.js sie an kleinen Dateien im Speicher prüfen UND auf den echten
// Quellbaum anwenden kann. Warum die Grenze: keiner der Kurse soll den anderen ins Bundle
// ziehen oder ihn bei einer Änderung still mitverändern.
//
// Statt Regex über den Rohtext läuft ein kleiner Tokenizer: Kommentare fallen weg,
// Zeichenketten bleiben Zeichenketten. So zählt `import { a, // x \n b } from …` mit,
// während Importtext in einem String (Testfälle!) nicht als Import gilt.
// Bekannte Grenze: JSX-Text mit Apostroph (`Geht's`) liest sich wie ein String bis
// Zeilenende – ein Import auf derselben Zeile wäre dann unsichtbar.

// Sprachneutraler Kern, den src/ne/** benutzen darf (Pfade relativ zu src/).
export const ALLOWED = new Set([
  'theme.js', 'useProgress.js', 'state/ProgressContext.js', 'AuthGate.jsx', 'LangGate.jsx',
  'components/ui.jsx', 'components/ueben.jsx', 'screens/adminUsers.jsx',
  'lib/xp.js', 'lib/progress.js', 'lib/apiKey.js', 'lib/lang.js',
])
// lib/claude.js enthält auch japanischen Prompt-Kram; nur diese Namen sind neutral.
export const CLAUDE_OK = new Set(['chatTurn', 'parseJson', 'hasApiKey', 'pingApiKey'])
// Pakete: React überall; Testwerkzeuge nur in Testdateien.
const BARE_OK = new Set(['react'])
// Die einzige japanische Datei, die nach ne/ greifen darf (lazy NepaliApp).
const GATE = 'LangGate.jsx'

const isTest = p => /\.test\.jsx?$/.test(p)
const inNe = p => p === 'ne' || p.startsWith('ne/')

// ── Tokenizer ────────────────────────────────────────────────────────────
// Liefert { type: 'ident'|'string'|'template'|'punct'|'num'|'regex', value }.
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await'])

function tokenize(src) {
  const toks = []
  const stack = [] // 'brace' | 'tpl' – damit `}` am Ende von `${…}` zurück ins Template führt
  const n = src.length
  let i = 0
  const push = (type, value) => toks.push({ type, value })

  // i steht hinter ` bzw. hinter der } von ${…}; liest bis ` oder bis zum nächsten ${.
  const readTemplate = () => {
    let s = ''
    while (i < n) {
      const c = src[i]
      if (c === '\\') { s += src[i + 1] ?? ''; i += 2; continue }
      if (c === '`') { i++; push('template', s); return }
      if (c === '$' && src[i + 1] === '{') { i += 2; stack.push('tpl'); push('template', s); return }
      s += c; i++
    }
    push('template', s)
  }
  const regexAllowed = () => {
    const p = toks[toks.length - 1]
    if (!p) return true
    if (p.type === 'punct') return ![')', ']', '}'].includes(p.value)
    return p.type === 'ident' && REGEX_AFTER_WORD.has(p.value)
  }

  while (i < n) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue }
    if (c === '"' || c === "'") {
      let s = ''
      i++
      while (i < n && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2 } else s += src[i++]
      }
      i++
      push('string', s)
      continue
    }
    if (c === '`') { i++; readTemplate(); continue }
    if (/[A-Za-z_$]/.test(c)) {
      let s = ''
      while (i < n && /[\w$]/.test(src[i])) s += src[i++]
      push('ident', s)
      continue
    }
    if (/[0-9]/.test(c)) {
      while (i < n && /[\w.]/.test(src[i])) i++
      push('num', '')
      continue
    }
    if (c === '/' && regexAllowed()) {
      i++
      let inClass = false
      while (i < n && src[i] !== '\n') {
        const ch = src[i]
        if (ch === '\\') { i += 2; continue }
        if (ch === '[') inClass = true
        else if (ch === ']') inClass = false
        else if (ch === '/' && !inClass) { i++; break }
        i++
      }
      while (i < n && /\w/.test(src[i])) i++
      push('regex', '')
      continue
    }
    if (c === '{') { stack.push('brace'); push('punct', c); i++; continue }
    if (c === '}') {
      i++
      if (stack.pop() === 'tpl') { readTemplate(); continue }
      push('punct', c)
      continue
    }
    push('punct', c)
    i++
  }
  return toks
}

// ── Importe lesen ────────────────────────────────────────────────────────
// Liefert { specifier, names } je Import. names = Namen bei `import { a, b } from` /
// `export { a } from`, sonst null (Default, Namespace, Seiteneffekt, dynamisch).
// specifier = null heißt: Ziel nicht statisch bestimmbar (import(variable),
// import(`…`), import.meta.glob) – dann steht der Grund in `unknown`.
export function importsOf(source) {
  const t = tokenize(source)
  const out = []
  const is = (k, type, value) => t[k] && t[k].type === type && (value === undefined || t[k].value === value)

  // Liest `{ a, b as c }` ab Position k (auf `{`); gibt [names, Index nach `}`].
  const readBraces = k => {
    const names = []
    let expectName = true
    k++
    while (t[k] && !(t[k].type === 'punct' && t[k].value === '}')) {
      if (t[k].type === 'punct' && t[k].value === ',') expectName = true
      else if (expectName && (t[k].type === 'ident' || t[k].type === 'string')) { names.push(t[k].value); expectName = false }
      k++
    }
    return [names, k + 1]
  }

  for (let k = 0; k < t.length; k++) {
    if (t[k].type !== 'ident') continue
    if (is(k - 1, 'punct', '.')) continue // obj.import ist kein Import
    if (t[k].value === 'import') {
      if (is(k + 1, 'punct', '(')) {
        if (is(k + 2, 'string') && (is(k + 3, 'punct', ')') || is(k + 3, 'punct', ','))) out.push({ specifier: t[k + 2].value, names: null })
        else out.push({ specifier: null, names: null, unknown: 'dynamischer Import ohne festen Pfad' })
      } else if (is(k + 1, 'punct', '.')) {
        if (is(k + 2, 'ident', 'meta') && is(k + 3, 'punct', '.') && is(k + 4, 'ident') && t[k + 4].value.startsWith('glob')) {
          out.push({ specifier: null, names: null, unknown: 'import.meta.glob' })
        }
      } else if (is(k + 1, 'string')) {
        out.push({ specifier: t[k + 1].value, names: null })
      } else {
        // import a, { b } from '…' · import * as ns from '…' · import { b } from '…'
        let j = k + 1
        let names = []
        let whole = false
        while (t[j] && !is(j, 'ident', 'from') && !is(j, 'punct', ';')) {
          if (is(j, 'punct', '{')) { const [nm, next] = readBraces(j); names = names.concat(nm); j = next; continue }
          if (is(j, 'punct', '*') || is(j, 'ident')) whole = true
          j++
        }
        if (is(j, 'ident', 'from') && is(j + 1, 'string')) out.push({ specifier: t[j + 1].value, names: whole ? null : names })
      }
    } else if (t[k].value === 'export') {
      let j = k + 1
      let names = null
      if (is(j, 'punct', '{')) { const [nm, next] = readBraces(j); names = nm; j = next }
      else if (is(j, 'punct', '*')) { j++; if (is(j, 'ident', 'as')) j += 2 }
      else continue
      if (is(j, 'ident', 'from') && is(j + 1, 'string')) out.push({ specifier: t[j + 1].value, names })
    }
  }
  return out
}

// ── Pfade ────────────────────────────────────────────────────────────────
// Relativer Spezifizierer → Pfad relativ zu src/ (posix, ohne node:path, damit die Datei
// rein bleibt). Ein Pfad, der src/ verlässt, beginnt mit '../'.
export function resolve(from, specifier) {
  if (!specifier.startsWith('.')) return specifier
  const parts = from.split('/').slice(0, -1)
  for (const seg of specifier.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') { if (parts.length && parts[parts.length - 1] !== '..') parts.pop(); else parts.push('..') }
    else parts.push(seg)
  }
  return parts.join('/')
}

// ── Regeln ───────────────────────────────────────────────────────────────
// files: { path (relativ zu src/, mit /), source }[] → { path, specifier, reason }[]
export function violations(files) {
  const bad = []
  for (const { path, source } of files) {
    const ne = inNe(path)
    for (const { specifier, names, unknown } of importsOf(source)) {
      const flag = reason => bad.push({ path, specifier, reason })
      // Nicht statisch prüfbar → überall verboten; der Bestand braucht so etwas nicht.
      if (unknown) { flag(unknown); continue }
      const target = resolve(path, specifier)
      const relative = specifier.startsWith('.')
      if (!ne) {
        const reaches = relative ? inNe(target) : /(^|\/)ne(\/|$)/.test(specifier)
        if (reaches && path !== GATE) flag('japanische Datei importiert aus ne/')
        continue
      }
      if (!relative) {
        const ok = BARE_OK.has(specifier) || (isTest(path) && (specifier === 'vitest' || specifier.startsWith('node:')))
        if (!ok) flag('Paket in ne/ nicht erlaubt')
      } else if (target === 'lib/claude.js') {
        if (!names) flag('aus lib/claude.js nur benannte Importe')
        else if (names.some(nm => !CLAUDE_OK.has(nm))) flag(`aus lib/claude.js nicht erlaubt: ${names.filter(nm => !CLAUDE_OK.has(nm)).join(', ')}`)
      } else if (!inNe(target) && !ALLOWED.has(target)) {
        flag('ne/ importiert außerhalb des erlaubten Kerns')
      }
    }
  }
  return bad
}
