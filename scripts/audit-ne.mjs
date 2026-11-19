// ─── Wort-Audit für den Nepali-Kurs ───────────────────────────────────────────
// Gegenstück zu scripts/audit-examples.mjs: geht NE_PATH der Reihe nach durch und meldet
// jedes Wort eines Satzes, das an dieser Stelle noch nicht eingeführt ist. Reine Analyse –
// ändert nichts an den Daten.
//
//   npm run audit:ne                              Funde als „Station · Satz · Wort“, Exit 1 bei Funden
//   npm run audit:ne -- --list-function-words     die Liste der Funktionswörter zeigen
//
// „Eingeführt“ heißt (alles in PFAD-Reihenfolge):
//   • Wortblock: jeder Wort-Eintrag dieses oder eines früheren Blocks (ein Eintrag mit
//     Leerzeichen wie दाल भात führt jeden Teil ein). Gezählt wird das Block-Ende: ein Wort
//     darf im Satz eines früheren Worts DESSELBEN Blocks vorkommen.
//   • Grammatik-Thema: seine GRAMMAR_NEW_WORDS und GRAMMAR_FORMS gelten ab diesem Thema
//     (auch für das Thema selbst).
//   • Funktionswörter (src/ne/lib/functionWords.js) gelten überall.
// Geprüft wird:
//   • Wortblock: jedes antippbare Token (mit de) der Beispielsätze.
//   • Grammatik-Thema: jedes antippbare Token der Beispiele und jedes Wort der GELÖSTEN
//     Lückensätze (die haben keine Tokens; angehängte Wörter wie झोलामा zählen, wenn
//     Stamm und Anhängsel eingeführt sind – isKnownWord).
// Satzzeichen zählen nie. Stationen ohne Daten (Kapitel, Szenen, Ziel – noch) werden
// übersprungen; später ergänzen hier Kapitel-`intro`-Wörter die Einführungen.
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { NE_PATH } from '../src/ne/data/path.js'
import { WORD_BLOCKS } from '../src/ne/data/words.js'
import { GRAMMAR, GRAMMAR_NEW_WORDS, GRAMMAR_FORMS, solved } from '../src/ne/data/grammar.js'
import { nfc } from '../src/ne/lib/deva.js'
import { FUNCTION_WORDS, FUNCTION_WORD_LIMIT, functionWordSet, isKnownWord } from '../src/ne/lib/functionWords.js'

// Weitergereicht, damit Aufrufer (Test, --list-function-words) eine Adresse behalten.
export { FUNCTION_WORDS, FUNCTION_WORD_LIMIT, functionWordSet }

// Wörter eines Satzes ohne Tokens: an Leer- und Satzzeichen trennen.
const wordsOf = sentence => nfc(sentence).split(/[\s,।?!.–—"“”„]+/).filter(w => /[ऀ-ॿ]/.test(w))

// Kern (rein): path in Reihenfolge, blocks = WORD_BLOCKS-Format, known = Set (NFC) der
// immer bekannten Wörter, grammar = { topics, newWords, forms } im Format von
// data/grammar.js (fehlt → Grammatik-Stationen werden übersprungen).
// → [{ block, word, token }] in Pfad- und Satzreihenfolge; bei Grammatik ist `block` die
// Themen-ID und `word` der Satz.
export function auditPath(path, blocks, known, grammar = {}) {
  const byId = new Map(blocks.map(b => [b.id, b]))
  const topics = new Map((grammar.topics || []).map(g => [g.id, g]))
  const introduced = new Set(known)
  const findings = []
  for (const node of path) {
    if (node.type === 'word') {
      const block = byId.get(node.id)
      if (!block) continue // Station ohne Daten (z. B. ein Block, der noch fehlt)
      // Erst alle Wörter des Blocks einführen, dann seine Sätze prüfen (Block-Ende zählt).
      for (const w of block.words) for (const part of nfc(w.dev).split(/\s+/)) if (part) introduced.add(part)
      for (const w of block.words) {
        for (const tok of w.ex?.tokens || []) {
          if (!tok.de) continue
          if (!introduced.has(nfc(tok.t))) findings.push({ block: block.id, word: w.dev, token: tok.t })
        }
      }
    } else if (node.type === 'grammar') {
      const g = topics.get(node.id)
      if (!g) continue
      for (const f of grammar.forms?.[g.id] || []) introduced.add(nfc(f))
      for (const w of grammar.newWords?.[g.id] || []) for (const part of nfc(w.dev).split(/\s+/)) if (part) introduced.add(part)
      for (const x of g.examples || []) {
        for (const tok of x.tokens || []) {
          if (tok.de && !introduced.has(nfc(tok.t))) findings.push({ block: g.id, word: x.dev, token: tok.t })
        }
      }
      for (const e of g.exercises || []) {
        const s = solved(e)
        for (const w of wordsOf(s)) if (!isKnownWord(w, introduced)) findings.push({ block: g.id, word: s, token: w })
      }
    }
  }
  return findings
}

function main(argv) {
  const fwCount = functionWordSet().size
  if (fwCount > FUNCTION_WORD_LIMIT) console.warn(`⚠ ${fwCount} Funktionswörter (mehr als ${FUNCTION_WORD_LIMIT}) – Liste kürzen, Inhaltswörter gehören in Wortblöcke.`)
  if (argv.includes('--list-function-words')) {
    console.log('Funktionswörter (gelten überall als eingeführt; Quelle: src/ne/lib/functionWords.js):')
    for (const [group, list] of Object.entries(FUNCTION_WORDS)) console.log(`  ${group}: ${list.join(' ')}`)
    return 0
  }
  const grammar = { topics: GRAMMAR, newWords: GRAMMAR_NEW_WORDS, forms: GRAMMAR_FORMS }
  const findings = auditPath(NE_PATH, WORD_BLOCKS, functionWordSet(), grammar)
  const blocks = NE_PATH.filter(n => n.type === 'word' && WORD_BLOCKS.some(b => b.id === n.id)).length
  const topics = NE_PATH.filter(n => n.type === 'grammar' && GRAMMAR.some(g => g.id === n.id)).length
  console.log(`Wort-Audit: ${blocks} Wortblöcke und ${topics} Grammatik-Themen im Pfad geprüft.`)
  if (!findings.length) {
    console.log('✓ Jedes Wort ist an seiner Stelle eingeführt.')
    return 0
  }
  console.log(`\n⚠ ${findings.length} Wörter, bevor sie eingeführt sind (Station · Wort/Satz · Token):\n`)
  for (const f of findings) console.log(`  ${f.block} · ${f.word} · ${f.token}`)
  return 1
}

// Nur als Skript ausführen, nicht beim Import durch den Test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
