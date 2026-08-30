import { DIALOGS, DIALOG_LEX, LEX_MAXLEN } from '../data/dialogs.js'
import { WORD_BLOCKS } from '../data/words.js'
import { CHAPTERS } from '../data/chapters.js'
import { SRS_STAGE_BOUNDS } from '../useProgress.js'


// Zerlegt eine Dialog-Zeile in Tokens. Leerzeichen & Satzzeichen werden als
// untippbare Tokens (ohne .de) durchgereicht; alles andere per Längsten-Treffer
// am Lexikon. Unbekanntes fällt zeichenweise als untippbarer Text zurück.
export function lexTokens(line) {
  const out = []
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ' || ch === '　' || '。、，！？!?,.「」『』・…'.includes(ch)) { out.push({ t: ch }); i++; continue }
    let hit = null
    for (let len = Math.min(LEX_MAXLEN, line.length - i); len >= 1; len--) {
      const sub = line.slice(i, i + len)
      if (DIALOG_LEX[sub]) { hit = { t: sub, ...DIALOG_LEX[sub] }; break }
    }
    if (hit) { out.push(hit); i += hit.t.length }
    else { out.push({ t: ch }); i++ }
  }
  return out
}

// ─── Rollenspiel-Freischaltung: Vokabeln & Grammatik müssen in der Reise dran kommen ──
// Strikt nach Nutzerwunsch: eine Gesprächs-Szene öffnet sich erst, wenn die Wörter
// UND die Grammatik, die ihre Antworten verlangen, schon in der Reise gelernt wurden.
// Wichtig: Wörter, welche die Reise (noch) gar nicht lehrt, zählen NICHT als Sperre –
// so blockiert nichts dauerhaft. Sobald die Reise um solche Vokabeln wächst (TODO Reise),
// greift die Sperre für diese Wörter automatisch.

// Partikeln/Kopula werden über die Grammatik geprüft, nicht als „Vokabel".
export const ROLE_GRAMMATICAL = new Set(['は', 'が', 'を', 'に', 'で', 'の', 'か', 'へ', 'と', 'も', 'よ', 'です'])

// Welches Grammatik-Thema (g-ID) verlangt ein Antwort-Token? null = keins.
export function tokenGrammarId(tok) {
  const b = tok.b || ''
  if (tok.t === 'です') return 'g2'
  if (tok.t === 'は' && tok.r === 'wa') return 'g1'
  if (tok.t === 'が' && /Subjekt/.test(b)) return 'g3'
  if (tok.t === 'を') return 'g4'
  if ((tok.t === 'に' || tok.t === 'で') && /Partikel|Richtung|Ziel|Mittel/.test(b)) return 'g5'
  if (tok.t === 'か') return 'g8'
  if (tok.t === 'の' && /Partikel|Besitz|Verbindung/.test(b)) return 'g9'
  if (/Verb/.test(b) && /höflich/.test(b)) return 'g6' // ます-Form
  if (/Adjektiv/.test(b)) return 'g7'
  return null
}

// Alle bekannten Lexikon-Wörter in einer japanischen Zeile.
export function lexKeysIn(line) {
  if (typeof line !== 'string') return []
  return lexTokens(line).filter(t => DIALOG_LEX[t.t]).map(t => t.t)
}

// Vokabeln (Lexikon-Schlüssel), die die angegebenen Reise-Einheiten lehren.
export function reiseVocab(blockIds, chapterIds) {
  const set = new Set()
  const add = s => lexKeysIn(s).forEach(k => set.add(k))
  WORD_BLOCKS.filter(b => blockIds.includes(b.id)).forEach(b => b.words.forEach(w => {
    add(w.kana); if (w.ex) add(w.ex.kana)
  }))
  const FIELDS = ['jp', 'reading', 'say', 'sign', 'line', 'text']
  CHAPTERS.filter(c => chapterIds.includes(c.id)).forEach(c => c.steps.forEach(s => {
    FIELDS.forEach(f => add(s[f]))
    if (typeof s.answer === 'string') add(s.answer)
    if (Array.isArray(s.answer)) add(s.answer.join(''))
    if (Array.isArray(s.tiles)) add(s.tiles.join(''))
  }))
  return set
}

// Was die GESAMTE Reise theoretisch lehrt (einmalig, zur Ausnahme nicht lehrbarer Wörter).
let _curriculumVocab = null
export function curriculumVocab() {
  if (!_curriculumVocab) _curriculumVocab = reiseVocab(WORD_BLOCKS.map(b => b.id), CHAPTERS.map(c => c.id))
  return _curriculumVocab
}

// Antwort-Sätze einer Szene (bei Wiederholungs-Knoten aus den Quellszenen).
export function dialogAnswers(node) {
  const turns = node.turns || (node.from || []).flatMap(id => DIALOGS.find(d => d.id === id)?.turns || [])
  return turns.map(t => t.answer).filter(Boolean)
}

// Vokabel- & Grammatik-Anforderungen einer Szene aus ihren Antworten ableiten.
export function dialogRequirements(node) {
  const vocab = new Set(), grammar = new Set()
  dialogAnswers(node).forEach(ans => lexTokens(ans).forEach(tok => {
    const g = tokenGrammarId(tok); if (g) grammar.add(g)
    if (DIALOG_LEX[tok.t] && !ROLE_GRAMMATICAL.has(tok.t)) vocab.add(tok.t)
  }))
  return { vocab: [...vocab], grammar: [...grammar] }
}

// Freischalt-Prüfung: offen? + was in der Reise noch fehlt (Grammatik-IDs, Vokabeln).
export function dialogGate(node, progress, done) {
  if (done.includes(node.id)) return { open: true, missGrammar: [], missVocab: [] }
  const learnedG = new Set(progress.completedGrammar || [])
  const learnedV = reiseVocab(progress.completedWordBlocks || [], progress.completedChapters || [])
  const teachableV = curriculumVocab()
  const { vocab, grammar } = dialogRequirements(node)
  const missGrammar = grammar.filter(g => !learnedG.has(g))
  const missVocab = vocab.filter(w => teachableV.has(w) && !learnedV.has(w))
  return { open: missGrammar.length === 0 && missVocab.length === 0, missGrammar, missVocab }
}

// ─── Aufwärmen vor einer Szene ───────────────────────────────────────────────
// Die Sätze, die eine Szene von dir verlangt – ohne Doppelte, in Spielreihenfolge.
// Bis hierher gab es sie nirgends als Ganzes zu üben: Die Vokabeln kamen einzeln
// in einem Wortblock vor, der Satz selbst tauchte erst im Ernstfall auf.
export function phrasesFromTurns(turns) {
  const seen = new Set()
  const out = []
  for (const t of turns || []) {
    if (!t.answer || seen.has(t.answer)) continue
    seen.add(t.answer)
    out.push({ jp: t.answer, de: t.answerDe || '' })
  }
  return out
}

// Dasselbe für eine ganze Szene. Wiederholungs-Knoten würfeln ihre Züge beim
// Start aus mehreren Szenen zusammen – dort muss der Aufrufer die WIRKLICH
// gespielten Züge an phrasesFromTurns geben, sonst wärmt man Sätze auf, die
// gar nicht drankommen.
export function dialogPhrases(node) {
  return phrasesFromTurns(node.turns || (node.from || []).flatMap(id => DIALOGS.find(d => d.id === id)?.turns || []))
}

// Welche Kernwörter der Szene stehen im Wiederholungsplan noch ganz am Anfang?
// Bewusst NUR Wörter, die überhaupt als Karte geführt werden – für alles andere
// (feste Wendungen, Partikeln) gibt es keinen belastbaren Kenntnisstand, und ein
// falscher Alarm wäre schlimmer als gar keiner.
export function dialogShakyWords(node, progress) {
  const srs = progress?.srs || {}
  return dialogRequirements(node).vocab
    .filter(w => srs[w] && (srs[w].interval || 0) < SRS_STAGE_BOUNDS[0])
}
