// ─── Wort-Audit für den Nepali-Kurs ───────────────────────────────────────────
// Gegenstück zu scripts/audit-examples.mjs: geht NE_PATH der Reihe nach durch und meldet
// jedes antippbare Wort eines Beispielsatzes, das an dieser Stelle noch nicht eingeführt
// ist. Reine Analyse – ändert nichts an den Daten.
//
//   npm run audit:ne                              Funde als „Block · Wort · Token“, Exit 1 bei Funden
//   npm run audit:ne -- --list-function-words     die Liste der Funktionswörter zeigen
//
// „Eingeführt“ heißt: ein Wort-Eintrag dieses oder eines früheren Blocks (in PFAD-
// Reihenfolge; ein Eintrag mit Leerzeichen wie दाल भात führt jeden Teil ein) oder ein
// Funktionswort aus FUNCTION_WORDS. Gezählt wird das Block-Ende: ein Wort darf im Satz
// eines früheren Worts DESSELBEN Blocks vorkommen – die Lektion zeigt alle Wörter, und
// im Satz ist jedes Stück ohnehin antippbar. Satzzeichen (Tokens ohne de) zählen nie.
// Später ergänzen hier Kapitel-`intro`-Wörter und Grammatik-Partikeln die Einführungen.
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { NE_PATH } from '../src/ne/data/path.js'
import { WORD_BLOCKS } from '../src/ne/data/words.js'
import { nfc } from '../src/ne/lib/deva.js'

// Funktionswörter: kleine, sehr häufige Wörter, ohne die kein Beispielsatz auskommt.
// Dieselbe Liste nennt der Kopfkommentar von src/ne/data/words.js – beide gleich halten.
// Sie gelten überall als bekannt – die Sätze erklären sie beim Antippen. Bewusst kurz
// halten: jedes Wort hier ist eines, das der Kurs nie eigens vorstellt (bis Grammatik-
// Lektionen kommen). Inhaltswörter (Nomen, Adjektive) gehören NIE hierher.
export const FUNCTION_WORDS = {
  // nachgestellte Wörter („in“, „von“, „für/an“, „ab“) – im Nepali ans Nomen geschrieben
  Postpositionen: ['मा', 'को', 'लाई', 'बाट'],
  // „ist / bin / ist nicht“
  Kopula: ['हो', 'छ', 'छैन', 'होइन', 'छु'],
  // ich, Sie, das, das dort, mein
  Pronomen: ['म', 'तपाईं', 'यो', 'त्यो', 'मेरो'],
  // was, wie viel, wo
  Fragewörter: ['के', 'कति', 'कहाँ'],
  // „und“ (in den Zahlensätzen von nw2: „eins und eins …“)
  Konjunktion: ['र'],
  // „wird gebraucht“, „geben Sie“, „gehen Sie“, „geht/fährt“, „wird/ergibt“ (… macht zwei)
  Verbformen: ['चाहिन्छ', 'दिनुहोस्', 'जानुहोस्', 'जान्छ', 'हुन्छ'],
}

export const functionWordSet = () => new Set(Object.values(FUNCTION_WORDS).flat().map(nfc))

// Kern (rein): path in Reihenfolge, blocks = WORD_BLOCKS-Format, known = Set (NFC) der
// immer bekannten Wörter. → [{ block, word, token }] in Pfad- und Satzreihenfolge.
export function auditPath(path, blocks, known) {
  const byId = new Map(blocks.map(b => [b.id, b]))
  const introduced = new Set(known)
  const findings = []
  for (const node of path) {
    if (node.type !== 'word') continue
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
  }
  return findings
}

function main(argv) {
  if (argv.includes('--list-function-words')) {
    console.log('Funktionswörter (gelten überall als eingeführt):')
    for (const [group, list] of Object.entries(FUNCTION_WORDS)) console.log(`  ${group}: ${list.join(' ')}`)
    return 0
  }
  const findings = auditPath(NE_PATH, WORD_BLOCKS, functionWordSet())
  const stations = NE_PATH.filter(n => n.type === 'word' && WORD_BLOCKS.some(b => b.id === n.id)).length
  console.log(`Wort-Audit: ${stations} Wortblöcke im Pfad geprüft.`)
  if (!findings.length) {
    console.log('✓ Jedes antippbare Wort ist an seiner Stelle eingeführt.')
    return 0
  }
  console.log(`\n⚠ ${findings.length} Wörter in Beispielsätzen, bevor sie eingeführt sind (Block · Wort · Token):\n`)
  for (const f of findings) console.log(`  ${f.block} · ${f.word} · ${f.token}`)
  return 1
}

// Nur als Skript ausführen, nicht beim Import durch den Test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
