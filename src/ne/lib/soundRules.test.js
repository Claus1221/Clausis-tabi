import { describe, it, expect } from 'vitest'
import { noSoundHint, PROBE_START, probeResult, offerReveal } from './soundRules.js'

describe('noSoundHint', () => {
  it('mit Umschrift: sie zeigt die Aussprache', () => {
    expect(noSoundHint(true)).toMatch(/keinen Nepali-Ton/)
    expect(noSoundHint(true)).toMatch(/die Umschrift zeigt dir die Aussprache/)
  })
  it('ohne Umschrift: Hinweis auf die Einstellungen', () => {
    expect(noSoundHint(false)).toMatch(/keinen Nepali-Ton/)
    expect(noSoundHint(false)).toMatch(/Einstellungen/)
    expect(noSoundHint(false)).not.toMatch(/die Umschrift zeigt dir/)
  })
})

describe('Hör-Probe (useListenProbe)', () => {
  it('Start: Ton wird geprüft, Text verborgen', () => {
    expect(PROBE_START).toEqual({ sound: null, shown: false })
  })
  it('Ton da → Text bleibt verborgen; kein Ton → Text sofort sichtbar', () => {
    expect(probeResult(PROBE_START, true)).toEqual({ sound: true, shown: false })
    expect(probeResult(PROBE_START, false)).toEqual({ sound: false, shown: true })
    expect(probeResult(PROBE_START, undefined)).toEqual({ sound: false, shown: true })
  })
  it('schon eingeblendet bleibt eingeblendet, auch wenn der Ton danach kommt', () => {
    expect(probeResult({ sound: null, shown: true }, true)).toEqual({ sound: true, shown: true })
  })
  it('„Nichts gehört? … zeigen“ steht beim Prüfen UND mit Ton, nie nach der Antwort oder wenn schon sichtbar', () => {
    expect(offerReveal(PROBE_START, false)).toBe(true)
    expect(offerReveal({ sound: true, shown: false }, false)).toBe(true)
    expect(offerReveal({ sound: true, shown: false }, true)).toBe(false)
    expect(offerReveal({ sound: false, shown: true }, false)).toBe(false)
  })
})
