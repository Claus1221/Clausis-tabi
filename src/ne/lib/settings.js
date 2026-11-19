import { getSettings } from '../../useProgress.js'

// Nepali-eigene Einstellungen, die es im japanischen Kurs nicht gibt. Bewusst NICHT in
// SETTINGS_DEFAULTS (useProgress.js): der japanische Kurs soll keinen Schalter erben,
// den er nicht benutzt. Gespeichert wird wie alles andere unter progress.settings
// (im Nepali-Dokument, also getrennt vom japanischen).
export const NE_SETTINGS_DEFAULTS = {
  showRoman: true, // Umschrift unter Devanagari zeigen (Zeichentafel; später Wörter, Sätze)
}

// Einzige Quelle für Einstellungen im Nepali-Zweig: japanische Standards, darüber die
// Nepali-Standards, darüber das Gespeicherte.
export function neSettings(progress) {
  return { ...NE_SETTINGS_DEFAULTS, ...getSettings(progress || {}) }
}
