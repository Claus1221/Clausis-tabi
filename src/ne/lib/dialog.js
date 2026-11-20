import { XP_PER_DIALOG } from '../../lib/xp.js'
import { NE_PATH } from '../data/path.js'
import { stationStates, nodeMeta, isNodeDone } from './path.js'
import { nfc } from './deva.js'
import { isKnownWord } from './functionWords.js'
import { knownAfter, taughtWords, wordParts } from './known.js'
import { shuffle } from './scriptQuiz.js'

// ─── Reine Szenen-Logik (kein React) ──────────────────────────────────────────
// Gegenstück zu src/lib/dialog.js: Freischaltung fürs Üben, Sätze fürs Aufwärmen und die
// kleine Zustandsmaschine der Aufwärm-Abfrage. Auf der Reise öffnet der Pfad die Szenen
// ohnehin der Reihe nach (lib/path.js) – dialogGate ist für die Szenen-Übersicht im Üben,
// wo man eine Szene auch außer der Reihe spielen darf, sobald man ihre Sätze sagen kann.

// Was der Lernstand als bekannt ausweist – dieselbe Regel wie das Wort-Audit, beide aus
// lib/known.js: Funktionswörter und Eigennamen, dazu was jede erledigte Station des Pfads
// lehrt (Wortblock-Wörter, Themen-Formen und -Wörter, Kapitel-intro-Wörter, newPhrases
// gespielter Szenen; Einträge mit Leerzeichen Teil für Teil). Set aus NFC-Texten.
export function knownWords(progress) {
  return knownAfter(NE_PATH, n => isNodeDone(n, progress))
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
  for (const p of dialog.newPhrases || []) for (const part of wordParts(p.dev)) known.add(part)
  const missing = answerWords(dialog).filter(w => !isKnownWord(w, known))
  return { open: missing.length === 0, missing }
}

// Übersicht im Üben: eine Szene ist spielbar, wenn sie schon gespielt wurde (Wiederholung
// geht immer) – oder wenn ihre Station auf der Karte nicht mehr gesperrt ist UND das
// Wörter-Tor offen ist (wie die japanische Übersicht: nichts außer der Reihe).
export function sceneOpen(dialog, progress) {
  if (!dialog) return false
  if ((progress?.completedDialogs || []).includes(dialog.id)) return true
  const at = NE_PATH.findIndex(n => n.type === 'dialog' && n.id === dialog.id)
  const state = at === -1 ? null : stationStates(NE_PATH, progress || {})[at]
  return state !== null && state !== 'locked' && dialogGate(dialog, progress).open
}

// Wo im Pfad ein Wort zuerst gelehrt wird (taughtWords aus lib/known.js – dieselbe Regel wie
// knownWords) – Titel der Station; Tafel beim ersten Aufruf gebaut.
let TEACHER = null
function teacher() {
  if (TEACHER) return TEACHER
  TEACHER = new Map()
  for (const n of NE_PATH) {
    const title = nodeMeta(n)?.title
    if (!title) continue
    for (const w of taughtWords(n)) if (!TEACHER.has(w)) TEACHER.set(w, title)
  }
  return TEACHER
}

// Abschluss einer Szene buchen – eine Fassung für die Reise (reise.jsx) und das Üben
// (DialogHub): completedDialogs, XP und Zähler `scenes` nur beim ersten Mal (wasDone = Stand
// beim Öffnen). Nichts einplanen – die Antwortsätze haben keinen Karten-Schlüssel; ihre
// Wörter sind über Wortblöcke und Themen ohnehin im Plan.
export function bookDialog(completeDialog, dialog, wasDone) {
  if (!wasDone) completeDialog(dialog.id, XP_PER_DIALOG, { scenes: 1 })
}

// Hinweis zu gesperrten Szenen: je fehlendes Wort { dev, de, where } – de = Bedeutung des
// Worts in der Szene (sein Token), where = Titel der lehrenden Station ('' wenn unbekannt).
export function explainMissing(dialog, words) {
  const tok = new Map()
  for (const t of dialog?.turns || []) for (const k of [...(t.answerTokens || []), ...(t.npcTokens || [])]) {
    if (k.de && !tok.has(nfc(k.t))) tok.set(nfc(k.t), k.de)
  }
  return (words || []).map(w => ({ dev: nfc(w), de: tok.get(nfc(w)) || '', where: teacher().get(nfc(w)) || '' }))
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

// Wortmenge einer Wendung (NFC, an Leer- und Satzzeichen getrennt).
const wordSet = dev => new Set(nfc(dev).split(/[\s,।?]+/).filter(Boolean))
// Steckt a ganz in b? (पुग्यो in „पुग्यो, धन्यवाद।“)
const inside = (a, b) => { const B = wordSet(b); return [...wordSet(a)].every(w => B.has(w)) }
// Zwei Wendungen, die beide auf dieselbe Frage passen könnten: gleicher Text, gleiche
// Bedeutung, oder die eine steckt in der anderen – eine neue Wendung (कति भयो) steht ja
// meist in einem Antwortsatz derselben Szene („दिदी, कति भयो?“).
const clash = (p, q) => p.dev === q.dev || p.de === q.de || inside(p.dev, q.dev) || inside(q.dev, p.dev)

// Optionen der Abfrage „Wie sagst du das?“ für list[i]: die richtige plus bis zu `count − 1`
// andere Wendungen derselben Szene, die weder mit der richtigen noch untereinander
// kollidieren (clash) – sonst wären zwei richtig. Gemischt.
export function warmupOptions(list, i, rand = Math.random, count = 3) {
  const right = list[i]
  const pick = []
  for (const p of shuffle(list.filter((_, j) => j !== i), rand)) {
    if (pick.length >= count - 1) break
    if (!clash(p, right) && !pick.some(q => clash(p, q))) pick.push(p)
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
