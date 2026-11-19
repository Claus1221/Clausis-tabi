// Reine Devanagari-Werkzeuge (kein React, kein window) – Grundlage für Karten-Schlüssel
// und für die Prüfung, ob eine Umschrift zur Schreibung passt.

// Jede Stelle, die einen SRS-Karten-Schlüssel bildet, geht hier durch: dieselbe Silbe
// kann als ein Zeichen (U+0958 क़) oder zerlegt (क + Nukta) ankommen – ohne NFC wären
// das zwei Karten.
export const nfc = text => String(text).normalize('NFC')

const cp = ch => ch.codePointAt(0)
const HALANT = 0x094D
const ZWNJ = 0x200C, ZWJ = 0x200D
// Konsonanten inkl. Nukta-Formen (क़ … य़) und der späteren Zusätze am Blockende.
const isConsonant = c => (c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095F) || (c >= 0x0978 && c <= 0x097F)
// Eigenständige Vokale (अ … औ, ॠ ॡ, seltene Zusätze) beginnen immer eine neue Silbe.
const isVowel = c => (c >= 0x0904 && c <= 0x0914) || c === 0x0960 || c === 0x0961 || (c >= 0x0972 && c <= 0x0977)
// Vokalzeichen (Matras ा … ौ, dazu ॎ ॏ ॕ ॖ ॗ ॢ ॣ) – gehören zum Konsonanten davor.
const isMatra = c => (c >= 0x093E && c <= 0x094C) || c === 0x094E || c === 0x094F || (c >= 0x0955 && c <= 0x0957) || c === 0x0962 || c === 0x0963
// Hängt ebenfalls an: Chandrabindu/Anusvara/Visarga (U+0900–0903), Nukta, Halant, Akzente,
// und Joiner, mit denen man Halbformen erzwingt.
const isMark = c => isMatra(c) || (c >= 0x0900 && c <= 0x0903) || c === 0x093A || c === 0x093B || c === 0x093C ||
  c === HALANT || (c >= 0x0951 && c <= 0x0954) || c === ZWNJ || c === ZWJ

// Zerlegt in Schreibsilben (Akshara): Konsonantenverbund (über Halant verbunden) bzw.
// eigenständiger Vokal, samt Matra und Zusatzzeichen. Alles andere – Leerzeichen,
// Satzzeichen, Danda, Ziffern, lateinische Buchstaben – trennt nur und fällt weg.
// Bewusst auch ॐ (U+0950) und Avagraha ऽ (U+093D): kein Reise-Wortschatz, und als
// eigene Silbe würden sie romanFits nur verfälschen.
export function aksharas(text) {
  const out = []
  let cur = ''
  let joinNext = false // letztes Zeichen war Halant → nächster Konsonant gehört dazu
  const flush = () => { if (cur) out.push(cur); cur = ''; joinNext = false }
  for (const ch of nfc(text)) {
    const c = cp(ch)
    if (isConsonant(c)) {
      if (!joinNext) flush()
      cur += ch
      joinNext = false
    } else if (isVowel(c)) {
      flush()
      cur = ch
    } else if (isMark(c)) {
      // Ein verwaistes Zeichen ohne Basis bleibt als eigene Silbe stehen, statt still
      // zu verschwinden – so fällt ein Tippfehler in den Daten in romanFits auf.
      cur += ch
      if (c === HALANT) joinNext = true
      else if (c !== ZWJ && c !== ZWNJ) joinNext = false
    } else flush()
  }
  flush()
  return out
}

// Zahl der Vokalkerne einer Umschrift. Nur die Doppellaute ai und au OHNE Längenstrich
// sind EIN Kern (paisā = pai-sā); ā ī ū sind eigene Kerne (jāū = jā-ū, tapāīṃ = ta-pā-īṃ).
// Deshalb erst in Grundbuchstabe + Zeichen zerlegen, statt Diakritika vorher abzustreifen.
export function romanSyllables(roman) {
  const letters = [...String(roman).toLowerCase().normalize('NFD').matchAll(/(\p{L})(\p{M}*)/gu)]
    .map(m => ({ base: m[1], plain: m[2] === '' }))
  let n = 0
  for (let i = 0; i < letters.length; i++) {
    if (!'aeiou'.includes(letters[i].base)) continue
    n++
    const next = letters[i + 1]
    if (letters[i].base === 'a' && letters[i].plain && next && next.plain && (next.base === 'i' || next.base === 'u')) i++
  }
  return n
}

// Silbe ohne Matra und ohne eigenständigen Vokal: trägt nur das mitgesprochene a,
// das im Nepali oft entfällt (हिमाल = himāl, nicht himāla). Ein Halant am Ende
// (क्) hat gar keinen Vokal und zählt ebenso als „kann leer sein“.
const isBlank = ak => ![...ak].some(ch => isMatra(cp(ch)) || isVowel(cp(ch)))

// Plausibilitätsprüfung für Inhalte: jede Schreibsilbe ergibt höchstens einen Vokalkern,
// und nur Silben ohne Vokalzeichen dürfen stumm sein. Fängt vertauschte oder
// abgeschnittene Umschriften, nicht jede falsche Schreibung.
export function romanFits(deva, roman) {
  const aks = aksharas(deva)
  const blank = aks.filter(isBlank).length
  const n = romanSyllables(roman)
  return aks.length - blank <= n && n <= aks.length
}
