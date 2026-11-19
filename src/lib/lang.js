// Sprachlogik: welche Kurssprachen es gibt, wo ihr Fortschritt liegt und
// welche Sprache eine Person beim Start bekommt.
// Bewusst rein (keine Imports): Die Funktionen laufen ohne Firebase, React
// oder Browser-APIs und lassen sich deshalb einfach testen.

export const LANGS = {
  ja: { id: 'ja', name: 'Japanisch', app: 'Tabi', glyph: '旅', sub: 'Japan-Reise' },
  ne: { id: 'ne', name: 'Nepali', app: 'Yatra', glyph: 'यात्रा', sub: 'Nepal-Reise' },
}

// Solange false, ist Nepali nur für Admins wählbar. Plan B stellt auf true,
// dann sehen alle Nutzer die Nepali-Kachel.
export const NE_PUBLIC = false

const isKnown = (lang) => Object.prototype.hasOwnProperty.call(LANGS, lang)

export function selectableLangs(isAdmin) {
  return isAdmin || NE_PUBLIC ? ['ja', 'ne'] : ['ja']
}

// Japanisch behält sein Wurzeldokument users/{uid}, damit bestehende Daten
// unverändert bleiben. Jede weitere Sprache liegt darunter, damit nichts
// migriert oder überschrieben werden muss.
export function progressPath(uid, lang) {
  if (!isKnown(lang)) throw new Error(`Unbekannte Sprache: ${lang}`)
  if (lang === 'ja') return ['users', uid]
  return ['users', uid, 'langs', lang]
}

export function profilePath(uid) {
  return ['users', uid, 'meta', 'profile']
}

// Reihenfolge der Regeln ist wichtig:
// 1. Gespeicherte Wahl gilt, aber nur wenn die Person sie auch wählen darf.
//    Sonst könnte ein früher freigeschalteter Nutzer eine Sprache behalten,
//    die man ihm inzwischen wieder entzogen hat.
// 2. Wer schon Japanisch lernt, bekommt Japanisch ohne Rückfrage.
// 3. Gibt es nur eine wählbare Sprache, wird sie direkt genommen.
// 4. Sonst entscheidet die Person selbst (null = Auswahl zeigen).
export function initialLang({ profileLang, hasJaProgress, isAdmin }) {
  const selectable = selectableLangs(isAdmin)
  if (profileLang && selectable.includes(profileLang)) return profileLang
  if (hasJaProgress) return 'ja'
  if (selectable.length === 1) return selectable[0]
  return null
}
