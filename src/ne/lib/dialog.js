import { learnedWords } from '../data/words.js'
import { GRAMMAR_FORMS, GRAMMAR_NEW_WORDS } from '../data/grammar.js'
import { CHAPTERS, chapterWords } from '../data/chapters.js'
import { nfc } from './deva.js'
import { functionWordSet, isKnownWord } from './functionWords.js'
import { shuffle } from './scriptQuiz.js'

// ─── Reine Szenen-Logik (kein React) ──────────────────────────────────────────
// Gegenstück zu src/lib/dialog.js: Freischaltung fürs Üben, Sätze fürs Aufwärmen und die
// kleine Zustandsmaschine der Aufwärm-Abfrage. Auf der Reise öffnet der Pfad die Szenen
// ohnehin der Reihe nach (lib/path.js) – dialogGate ist für die Szenen-Übersicht im Üben,
// wo man eine Szene auch außer der Reihe spielen darf, sobald man ihre Sätze sagen kann.

// Was der Lernstand als bekannt ausweist – dieselbe Regel wie das Wort-Audit
// (scripts/audit-ne.mjs): Funktionswörter, jedes Wort erledigter Wortblöcke (ein Eintrag mit
// Leerzeichen wie दाल भात führt jeden Teil ein), Formen und neue Wörter erledigter
// Grammatik-Themen, intro-Wörter erledigter Kapitel. Set aus NFC-Texten.
export function knownWords(progress) {
  const known = functionWordSet()
  const add = dev => { for (const p of nfc(dev).split(/\s+/)) if (p) known.add(p) }
  learnedWords(progress?.completedWordBlocks).forEach(add)
  for (const id of progress?.completedGrammar || []) {
    for (const f of GRAMMAR_FORMS[id] || []) add(f)
    for (const w of GRAMMAR_NEW_WORDS[id] || []) add(w.dev)
  }
  const chapters = progress?.completedChapters || []
  CHAPTERS.filter(c => chapters.includes(c.id)).flatMap(chapterWords).forEach(add)
  return known
}

// Antippbare Wörter der Antwortsätze (nur was man selbst sagen muss – die NPC-Zeile darf
// Neues enthalten, sie lässt sich antippen), NFC, ohne Doppelte, in Spielreihenfolge.
export function answerWords(dialog) {
  const seen = new Set()
  for (const t of dialog?.turns || []) for (const k of t.answerTokens || []) if (k.de) seen.add(nfc(k.t))
  return [...seen]
}

// Freischaltung im Üben: offen, wenn jedes Wort der Antwortsätze gelernt ist. Die eigenen
// newPhrases der Szene zählen als bekannt – das Aufwärmen stellt sie vor. Eine schon
// gespielte Szene bleibt immer offen (ein späterer Umbau des Kurses sperrt nichts weg).
// missing = die fehlenden Wörter (Devanagari), für den Hinweis „Erst auf der Reise lernen“.
export function dialogGate(dialog, progress) {
  if (!dialog) return { open: false, missing: [] }
  if ((progress?.completedDialogs || []).includes(dialog.id)) return { open: true, missing: [] }
  const known = knownWords(progress)
  for (const p of dialog.newPhrases || []) for (const part of nfc(p.dev).split(/\s+/)) known.add(part)
  const missing = answerWords(dialog).filter(w => !isKnownWord(w, known))
  return { open: missing.length === 0, missing }
}

// Die Sätze, die eine Szene von dir verlangt – ohne Doppelte, in Spielreihenfolge, NFC.
// tokens = answerTokens, damit das Aufwärmen die Wörter antippbar zeigt.
export function phrasesFromTurns(turns) {
  const seen = new Set()
  const out = []
  for (const t of turns || []) {
    const dev = nfc(t?.answer || '')
    if (!dev || seen.has(dev)) continue
    seen.add(dev)
    out.push({ dev, roman: t.answerRoman || '', de: t.answerDe || '', tokens: t.answerTokens })
  }
  return out
}

// Alles fürs Aufwärmen: zuerst die neuen Wendungen der Szene (die kennt man noch nicht –
// ohne Tokens, sie sind selbst das Nachschlagbare), dann die Antwortsätze.
export function warmupPhrases(dialog) {
  const fresh = (dialog?.newPhrases || []).map(p => ({ dev: nfc(p.dev), roman: p.roman, de: p.de }))
  const have = new Set(fresh.map(p => p.dev))
  return [...fresh, ...phrasesFromTurns(dialog?.turns).filter(p => !have.has(p.dev))]
}

// Optionen der Abfrage „Wie sagst du das?“ für list[i]: die richtige plus bis zu `count − 1`
// andere Wendungen derselben Szene – nie zwei mit gleichem Text oder gleicher Bedeutung
// (sonst wären zwei richtig). Gemischt.
export function warmupOptions(list, i, rand = Math.random, count = 3) {
  const right = list[i]
  const others = shuffle(list.filter((p, j) => j !== i && p.dev !== right.dev && p.de !== right.de), rand)
  const pick = []
  for (const p of others) {
    if (pick.length >= count - 1) break
    if (!pick.some(q => q.dev === p.dev || q.de === p.de)) pick.push(p)
  }
  return shuffle([right, ...pick], rand).map(p => p.dev)
}

// Aufwärm-Abfrage: jede Wendung einmal; falsch erkannt → sie kommt am Ende noch einmal
// (Festigungs-Bremse wie im Japanischen, aber nie eine Sperre). Zustand unveränderlich.
export const startWarmup = n => ({ queue: Array.from({ length: n }, (_, i) => i), misses: 0 })
export const warmupDone = s => s.queue.length === 0
export function answerWarmup(s, ok) {
  if (warmupDone(s)) return s
  const [head, ...rest] = s.queue
  return ok ? { ...s, queue: rest } : { queue: [...rest, head], misses: s.misses + 1 }
}

// Züge, die beim ERSTEN Antippen richtig waren (results = { [Zug]: richtig beim ersten Mal? }).
export const firstTryScore = (results, n) => Array.from({ length: n }, (_, i) => results?.[i] === true).filter(Boolean).length
