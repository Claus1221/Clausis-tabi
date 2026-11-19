import { SCRIPT_LESSONS, SCRIPT_DATA } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR_BY_ID } from '../data/grammar.js'

// Reine Pfad-Logik der Yatra-Karte (kein React). Gegenstück zu src/lib/path.js.

// Welches Fortschritts-Feld eine Station abhakt. Felder werden aus dem japanischen
// Kurs wiederverwendet (completedLessons = Schrift-Lektionen usw.).
const DONE_FIELD = {
  script: 'completedLessons',
  word: 'completedWordBlocks',
  grammar: 'completedGrammar',
  chapter: 'completedChapters',
  dialog: 'completedDialogs',
}

// Unbekannter Typ (oder Ziel) → nie erledigt, aber auch kein Wurf: ein Pfad aus einer
// neueren Version darf eine ältere App nicht abstürzen lassen.
export function isNodeDone(node, progress) {
  const field = node && DONE_FIELD[node.type]
  return !!field && (progress?.[field] || []).includes(node.id)
}

// Titel + Stationszeichen. null für Überschriften und für Stationen, deren Daten es
// heute nicht gibt (Kapitel, Szenen, Ziel kommen in späteren Tasks) – die Karte lässt
// solche Stationen still aus, statt zu stürzen. Spätere Tasks ergänzen hier ihren Typ.
export function nodeMeta(node) {
  if (node?.type === 'script') {
    const l = SCRIPT_LESSONS.find(x => x.id === node.id)
    if (!l) return null
    // shown statt Zeichen: ein Vokalzeichen allein hängt in der Luft (ा → का).
    return { title: l.title, glyph: SCRIPT_DATA[l.chars[0]]?.shown || l.chars[0] }
  }
  if (node?.type === 'word') {
    // Ein Block, den words.js (noch) nicht kennt (nw7, solange die Daten fehlen), fällt
    // still weg wie jede Station ohne Daten.
    const b = WORD_BLOCKS.find(x => x.id === node.id)
    return b ? { title: b.title, glyph: b.theme } : null
  }
  if (node?.type === 'grammar') {
    const g = GRAMMAR_BY_ID[node.id]
    return g ? { title: g.title, glyph: g.glyph } : null
  }
  return null
}

// Station = kein Überschrift-Eintrag und mit Daten. Eine Station ohne Daten (Kapitel,
// Szene, Ziel, solange es sie nicht gibt) ist damit weder erledigt noch offen – sie
// hält die Stationen dahinter nicht auf.
const isStation = n => !n.world && nodeMeta(n) !== null

// Index der nächsten offenen Station: die erste nicht erledigte (Überschriften und
// Stationen ohne Daten zählen nicht). Alles erledigt → path.length.
export function nextOpenIndex(path, progress) {
  const i = path.findIndex(n => isStation(n) && !isNodeDone(n, progress))
  return i === -1 ? path.length : i
}

// Zustand je Pfad-Eintrag, Regel wie auf der japanischen Karte: erledigt bleibt immer
// 'done' (auch hinter der offenen Station, z. B. nach einer Umsortierung), die erste
// nicht erledigte Station ist 'current', alle übrigen 'locked'. Überschriften und
// Stationen ohne Daten → null.
export function stationStates(path, progress) {
  const open = nextOpenIndex(path, progress)
  return path.map((n, i) => {
    if (!isStation(n)) return null
    if (isNodeDone(n, progress)) return 'done'
    return i === open ? 'current' : 'locked'
  })
}

// Wörter aller Wortblöcke, die im Pfad VOR dem Block `id` liegen, in Pfad-Reihenfolge –
// der Ablenker-Vorrat fürs Wort-Quiz. Maßgeblich ist der Pfad, nicht die Reihenfolge in
// WORD_BLOCKS: nur so kennt der Lernende die Ablenker schon. Block nicht im Pfad → [].
export function wordsBefore(path, blocks, id) {
  const at = path.findIndex(n => n.type === 'word' && n.id === id)
  if (at === -1) return []
  const byId = new Map(blocks.map(b => [b.id, b]))
  return path.slice(0, at).filter(n => n.type === 'word').flatMap(n => byId.get(n.id)?.words || [])
}
