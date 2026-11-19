import { nfc } from './deva.js'

// Reine Auswahl-Logik der Nepali-Sprachausgabe (kein window, kein fetch) – getrennt
// von speech.js, damit sie ohne Browser testbar ist.

// „ne", „ne-NP", „ne_NP" (Android schreibt oft mit Unterstrich). Bewusst kein
// bloßes startsWith('ne'): „nep…"/„nl" gehören nicht dazu.
export const isNepaliLang = lang => /^ne([-_]|$)/i.test(lang || '')

// Welche Quelle spricht den Text? Studio-MP3 (Manifest) → Gerätestimme → nichts.
// Das Manifest kann fehlen (null/undefined = noch nie erzeugt) und zählt dann als leer.
// Der Text wird NFC-normalisiert, weil die Manifest-Schlüssel es auch sind.
export function pickSource({ text, manifest, hasDeviceVoice }) {
  const key = nfc(text ?? '')
  const file = key && manifest && Object.hasOwn(manifest, key) ? manifest[key] : null
  if (typeof file === 'string' && file) return { kind: 'mp3', file }
  return hasDeviceVoice ? { kind: 'device' } : { kind: 'none' }
}

// Beste Nepali-Stimme der Geräteliste: ne-NP vor anderem ne*, innerhalb der Stufe
// lokale vor Netzstimmen (starten zuverlässiger, laufen offline). Nie Hindi oder eine
// andere Sprache als Ersatz – eine fremde Stimme lehrt die falsche Aussprache; dann
// lieber still. `voices` darf auch ein SpeechSynthesisVoice-Array sein.
export function pickVoice(voices) {
  const ne = (voices || []).filter(v => isNepaliLang(v?.lang))
  const isNP = v => /^ne[-_]np$/i.test(v.lang)
  return ne.find(v => isNP(v) && v.localService) || ne.find(isNP) ||
    ne.find(v => v.localService) || ne[0] || null
}

// Chrome auf Android feuert `end` manchmal nie: nach dieser Zeit gilt der Satz als
// zu Ende. Reichlich bemessen (400 ms je Zeichen), damit nichts abgeschnitten wird.
export const watchdogMs = text => Math.max(4000, 400 * [...String(text ?? '')].length)
