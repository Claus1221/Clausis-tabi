import { nfc } from './deva.js'
import { functionWordSet } from './functionWords.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR, GRAMMAR_NEW_WORDS, GRAMMAR_FORMS } from '../data/grammar.js'
import { CHAPTERS } from '../data/chapters.js'
import { DIALOGS } from '../data/dialogs.js'

// ─── Eine Regel für „schon gelernt“ (rein, kein React) ────────────────────────
// Dieselbe Quelle für das Wort-Audit (scripts/audit-ne.mjs: geht den Pfad der Reihe nach
// durch) und den Lernstand (lib/dialog.js knownWords: Freischaltung der Szenen im Üben,
// teacher(): wo ein fehlendes Wort gelehrt wird). Laufen beide auseinander, öffnet das Üben
// eine Szene mit Wörtern, die das Audit als „noch nicht eingeführt“ melden würde – oder
// sperrt eine, die man sagen kann.

// Eigennamen der Geschichte: antippbar, aber nie als Lernwort vorgestellt – gelten überall.
export const PROPER_NAMES = ['आशा', 'माछापुच्छ्रे']

// Teile eines Eintrags: ein Eintrag mit Leerzeichen (दाल भात, पहिलो पटक) führt jeden Teil ein.
export const wordParts = dev => nfc(dev || '').split(/\s+/).filter(Boolean)

// Immer bekannt: Funktionswörter und Eigennamen. Neue Menge je Aufruf (Aufrufer ergänzen sie).
export function baseKnown() {
  return new Set([...functionWordSet(), ...PROPER_NAMES.map(nfc)])
}

// Was ein Kapitel-Schritt lehrt: nur intro-Schritte. Das Audit braucht das je Schritt (ein
// intro-Wort gilt ab SEINEM Schritt), der Lernstand fürs ganze Kapitel.
export const introWords = step => (step?.kind === 'intro' ? wordParts(step.dev) : [])

// Kursdaten in Nachschlage-Form. Das Audit baut sich eine aus seinen Parametern (Tests geben
// kleine Kunstdaten), alles andere nimmt COURSE, den echten Kurs.
export function makeCourse({ blocks = [], grammar = {}, chapters = [], dialogs = [] } = {}) {
  return {
    blocks: new Map(blocks.map(b => [b.id, b])),
    topics: new Map((grammar.topics || []).map(g => [g.id, g])),
    forms: grammar.forms || {},
    newWords: grammar.newWords || {},
    chapters: new Map(chapters.map(c => [c.id, c])),
    dialogs: new Map(dialogs.map(d => [d.id, d])),
  }
}

export const COURSE = makeCourse({
  blocks: WORD_BLOCKS,
  grammar: { topics: GRAMMAR, newWords: GRAMMAR_NEW_WORDS, forms: GRAMMAR_FORMS },
  chapters: CHAPTERS,
  dialogs: DIALOGS,
})

// Was eine Station lehrt (NFC, Teile einzeln): Wortblock = seine Wörter; Grammatik-Thema =
// seine Formen und neuen Wörter; Kapitel = seine intro-Wörter; Szene = ihre newPhrases (das
// Aufwärmen stellt sie vor). Station ohne Daten, Überschrift, Schrift, Ziel → nichts.
export function taughtWords(node, course = COURSE) {
  const id = node?.id
  switch (node?.type) {
    case 'word':
      return (course.blocks.get(id)?.words || []).flatMap(w => wordParts(w.dev))
    case 'grammar':
      if (!course.topics.has(id)) return []
      return [...(course.forms[id] || []).flatMap(wordParts), ...(course.newWords[id] || []).flatMap(w => wordParts(w.dev))]
    case 'chapter':
      return (course.chapters.get(id)?.steps || []).flatMap(introWords)
    case 'dialog':
      return (course.dialogs.get(id)?.newPhrases || []).flatMap(p => wordParts(p.dev))
    default:
      return []
  }
}

// Bekannt nach den erledigten Stationen eines Pfads: Grundbestand + was jede lehrt.
export function knownAfter(path, isDone, course = COURSE) {
  const known = baseKnown()
  for (const n of path) if (isDone(n)) for (const w of taughtWords(n, course)) known.add(w)
  return known
}
