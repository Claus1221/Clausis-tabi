import { SCRIPT_DATA, SCRIPT_LESSONS, SCRIPT_NOTES } from '../data/script.js'

// Reine Logik für das Quiz am Ende einer Schrift-Lektion und die Laut-Hinweise davor
// (kein React, kein window). Alles kommt aus SCRIPT_DATA – nichts ist hier fest
// verdrahtet, damit Korrekturen an den Daten ohne Codeänderung durchschlagen.

// Fisher-Yates auf einer Kopie; `rand` ist einsetzbar, damit Tests viele feste
// Mischungen prüfen können (sort mit Zufallsvergleich mischt schief).
export function shuffle(arr, rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Hat das Zeichen eine sprechbare Lesung? Halant und Danda tragen statt einer Silbe
// eine Beschreibung in Klammern („(ohne a)“) – nach ihrer „Lesung“ zu fragen ergibt
// keinen Sinn, sie fehlen im Lese-Quiz (die Lektion erklärt sie trotzdem).
export const isReadable = ch => {
  const r = SCRIPT_DATA[ch]?.roman
  return !!r && !r.startsWith('(')
}

// Frage je Zeichenart: Ein Vokalzeichen wird an क gezeigt (का) – gefragt ist der Laut,
// den es beisteuert („ā“), nicht die ganze Silbe; bei Ziffern der Zahlwert.
function promptFor(kind, ch, shown) {
  if (kind === 'digit') return 'Welche Zahl ist das?'
  if (shown !== ch) return 'Welchen Laut bringt das Zeichen hier mit?'
  return 'Welche Lesung ist richtig?'
}

// Baut das Quiz: jedes lesbare Zeichen einmal, gemischt, mit drei Optionen. Lesungen
// sind nicht eindeutig (श/ष „sha“, ं/ँ „ṃ“) – daher wird über die LESUNG entdoppelt,
// nicht über das Zeichen: nie zwei gleich lautende Optionen, und kein Ablenker, der
// zufällig die richtige Lesung trägt. Ablenker zuerst aus der Lektion selbst (das
// eigentliche Verwechslungsrisiko), dann aus derselben Zeichenart, dann aus allem.
// optionCount: Optionen je Frage (Lektion 3, Üben nach Einstellung 4–8).
// optionChars[i] ist das Zeichen, von dem options[i] stammt – damit dient dieselbe Frage
// auch umgekehrt („Lesung sehen → Zeichen wählen“): weil die Lesungen verschieden sind,
// ist dann auch nie mehr als ein Zeichen richtig (nie श und ष zugleich).
export function buildScriptQuiz(chars, rand = Math.random, optionCount = 3) {
  const readable = [...new Set(chars)].filter(isReadable)
  const allReadable = Object.keys(SCRIPT_DATA).filter(isReadable)
  return shuffle(readable, rand).map(ch => {
    const { roman: correct, kind, shown } = SCRIPT_DATA[ch]
    const pools = [
      readable.filter(c => c !== ch),
      allReadable.filter(c => SCRIPT_DATA[c].kind === kind),
      allReadable,
    ]
    const picked = [] // [Lesung, Zeichen]
    for (const pool of pools) {
      for (const c of shuffle(pool, rand)) {
        if (picked.length >= optionCount - 1) break
        const r = SCRIPT_DATA[c].roman
        if (r !== correct && !picked.some(([pr]) => pr === r)) picked.push([r, c])
      }
    }
    const pairs = shuffle([[correct, ch], ...picked], rand)
    return {
      char: ch, shown, correct, prompt: promptFor(kind, ch, shown),
      options: pairs.map(([r]) => r), optionChars: pairs.map(([, c]) => c),
    }
  })
}

// Laut-Hinweise vor dem Quiz: ein Paar passt, wenn eines seiner Zeichen in DIESER
// Lektion neu ist und das andere hier oder schon früher gelernt wurde. So erscheint
// dental/retroflex bei der त-Reihe (die ट-Reihe kennt man dann schon), nicht vorher.
// Ergebnis: [{ note, pairs }] in der Reihenfolge von SCRIPT_NOTES, nur mit Paaren.
export function notesForLesson(lessonId) {
  const idx = SCRIPT_LESSONS.findIndex(l => l.id === lessonId)
  if (idx === -1) return []
  const here = new Set(SCRIPT_LESSONS[idx].chars)
  const known = new Set(SCRIPT_LESSONS.slice(0, idx + 1).flatMap(l => l.chars))
  return SCRIPT_NOTES
    .map(note => ({
      note,
      pairs: note.pairs.filter(([a, b]) => known.has(a) && known.has(b) && (here.has(a) || here.has(b))),
    }))
    .filter(x => x.pairs.length > 0)
}
