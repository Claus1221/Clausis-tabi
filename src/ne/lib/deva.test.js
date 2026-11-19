import { describe, it, expect } from 'vitest'
import { aksharas, romanSyllables, romanFits, nfc } from './deva.js'
describe('aksharas', () => {
  it('Verbund mit Halant bleibt zusammen', () => expect(aksharas('नमस्ते')).toEqual(['न', 'म', 'स्ते']))
  it('Matra gehört zum Konsonanten', () => expect(aksharas('हिमाल')).toEqual(['हि', 'मा', 'ल']))
  it('zwei Verbünde', () => expect(aksharas('क्षेत्र')).toEqual(['क्षे', 'त्र']))
  it('Nasalzeichen hängt an', () => expect(aksharas('तपाईं')).toEqual(['त', 'पा', 'ईं']))
  it('Leer- und Satzzeichen fallen weg', () => expect(aksharas('यो के हो?')).toEqual(['यो', 'के', 'हो']))
})
describe('romanSyllables / romanFits', () => {
  it('zählt Vokalkerne', () => { expect(romanSyllables('namaste')).toBe(3); expect(romanSyllables('himāl')).toBe(2); expect(romanSyllables('paisā')).toBe(2) })
  it('passende Umschrift', () => { expect(romanFits('नमस्ते', 'namaste')).toBe(true); expect(romanFits('हिमाल', 'himāl')).toBe(true) })
  it('zu kurze oder zu lange Umschrift fällt auf', () => { expect(romanFits('हिमाल', 'hi')).toBe(false); expect(romanFits('हिमाल', 'himālayako')).toBe(false) })
})
// Escapes, damit sichtbar bleibt, dass hier zwei verschiedene Byte-Folgen verglichen werden:
// U+0958 (क़ als ein Zeichen) gegen क + Nukta U+093C.
it('nfc macht zerlegte und zusammengesetzte Form gleich', () => expect(nfc('क़')).toBe(nfc('क़')))
