import { GRAMMAR } from '../data/grammar.js'

// ─── Grammatik im Wiederholungsplan ──────────────────────────────────────────
// Bis hierher war Grammatik ein EINMALIGES Ereignis: Thema lesen, zwei Übungen,
// abgehakt – und nie wieder gesehen. Kein Wunder, dass sie im Gespräch nicht
// abrufbar war. Jetzt bekommt jedes gelernte Thema eine eigene SRS-Karte und
// taucht im normalen Wiederholungs-Rhythmus wieder auf.
//
// EINE Karte pro Thema (nicht pro Übung): Die Karte zieht bei jeder Wiederholung
// eine andere Übung aus dem Thema. So übt man die Regel, nicht das Auswendig-
// lernen einer bestimmten Frage.
//
// Schlüssel-Format `g:<themaId>`. Der Doppelpunkt kommt in keinem japanischen
// Karten-Schlüssel vor (die sind Kana/Kanji/Wendungen), Kollisionen sind also
// ausgeschlossen.
const PREFIX = 'g:'

export const grammarKey = (topicId) => PREFIX + topicId
export const isGrammarKey = (key) => typeof key === 'string' && key.startsWith(PREFIX)
export const topicIdForKey = (key) => (isGrammarKey(key) ? key.slice(PREFIX.length) : null)

export function topicForKey(key) {
  const id = topicIdForKey(key)
  return id ? GRAMMAR.find(g => g.id === id) : undefined
}

// Karten-Schlüssel aller Themen, die laut Fortschritt gelernt wurden.
export function grammarKeys(progress) {
  return (progress?.completedGrammar || [])
    .filter(id => GRAMMAR.some(g => g.id === id))
    .map(grammarKey)
}

// Eine Übung aus dem Thema ziehen. `avoid` ist die zuletzt gezeigte Frage –
// zweimal hintereinander dieselbe wäre die eine Sache, die diese Karte gerade
// NICHT üben soll.
export function pickDrill(topic, avoid) {
  const pool = topic?.exercises || []
  if (!pool.length) return null
  const fresh = pool.filter(e => e.q !== avoid)
  const from = fresh.length ? fresh : pool
  return from[Math.floor(Math.random() * from.length)]
}
