import { describe, it, expect } from 'vitest'
import { pickSource, pickVoice, deviceMode, isNepaliLang, watchdogMs } from './speechPick.js'

describe('pickSource', () => {
  it('fehlendes Manifest (null/undefined/leer) zählt als leer, ohne Wurf', () => {
    for (const manifest of [null, undefined, {}]) {
      expect(pickSource({ text: 'नमस्ते', manifest, hasDeviceVoice: false })).toEqual({ kind: 'none' })
    }
  })
  it('Text im Manifest → mp3 mit Dateiname', () => {
    const manifest = { 'नमस्ते': 'abc123.mp3' }
    expect(pickSource({ text: 'नमस्ते', manifest, hasDeviceVoice: false })).toEqual({ kind: 'mp3', file: 'abc123.mp3' })
    // MP3 hat Vorrang vor der Gerätestimme
    expect(pickSource({ text: 'नमस्ते', manifest, hasDeviceVoice: true })).toEqual({ kind: 'mp3', file: 'abc123.mp3' })
  })
  it('nicht im Manifest, Gerätestimme da → device', () => {
    expect(pickSource({ text: 'धन्यवाद', manifest: { 'नमस्ते': 'a.mp3' }, hasDeviceVoice: true })).toEqual({ kind: 'device' })
  })
  it('weder noch → none', () => {
    expect(pickSource({ text: 'धन्यवाद', manifest: { 'नमस्ते': 'a.mp3' }, hasDeviceVoice: false })).toEqual({ kind: 'none' })
  })
  it('Text wird vor dem Nachschlagen NFC-normalisiert', () => {
    // U+0958 (क़ als ein Zeichen) ist eine Kompositions-Ausnahme: NFC zerlegt es in क + Nukta.
    // Manifest-Schlüssel sind NFC, der Text kommt in der Rohform an.
    const raw = 'क़'
    const manifest = { 'क़': 'q.mp3' }
    expect(pickSource({ text: raw, manifest, hasDeviceVoice: false })).toEqual({ kind: 'mp3', file: 'q.mp3' })
  })
  it('Leertext und Prototyp-Schlüssel finden nichts', () => {
    expect(pickSource({ text: '', manifest: { a: 'a.mp3' }, hasDeviceVoice: false })).toEqual({ kind: 'none' })
    expect(pickSource({ text: 'constructor', manifest: {}, hasDeviceVoice: false })).toEqual({ kind: 'none' })
  })
})

describe('pickVoice', () => {
  const v = (lang, name, localService = true) => ({ lang, name, localService })
  it('ne-NP vor anderen ne*', () => {
    expect(pickVoice([v('ne', 'A'), v('ne-NP', 'B')]).name).toBe('B')
  })
  it('akzeptiert ne_NP (Android) und beliebige Groß-/Kleinschreibung', () => {
    expect(pickVoice([v('NE_np', 'X')]).name).toBe('X')
  })
  it('lokale Stimme vor Netzstimme bei gleicher Stufe', () => {
    expect(pickVoice([v('ne-NP', 'Net', false), v('ne-NP', 'Lokal', true)]).name).toBe('Lokal')
  })
  it('nie Hindi oder andere Sprachen', () => {
    expect(pickVoice([v('hi-IN', 'H'), v('en-US', 'E'), v('nl-NL', 'N')])).toBeNull()
  })
  it('leere oder fehlende Liste → null', () => {
    expect(pickVoice([])).toBeNull()
    expect(pickVoice(null)).toBeNull()
  })
  it('isNepaliLang: ne, ne-NP ja; nl, nep, hi nein', () => {
    expect(isNepaliLang('ne')).toBe(true)
    expect(isNepaliLang('ne-NP')).toBe(true)
    expect(isNepaliLang('nl-NL')).toBe(false)
    expect(isNepaliLang('nep')).toBe(false)
    expect(isNepaliLang(undefined)).toBe(false)
  })
})

describe('watchdogMs', () => {
  it('mindestens 4 s, sonst 400 ms je Zeichen', () => {
    expect(watchdogMs('नमस्ते')).toBe(4000)
    expect(watchdogMs('x'.repeat(20))).toBe(8000)
  })
})

describe('deviceMode', () => {
  const v = lang => ({ lang, name: lang, localService: true })
  it('leere Liste → lang-only (Android meldet sie oft leer)', () => {
    expect(deviceMode([])).toBe('lang-only')
    expect(deviceMode(null)).toBe('lang-only')
  })
  it('Liste mit Nepali-Stimme → voice', () => {
    expect(deviceMode([v('en-US'), v('ne-NP')])).toBe('voice')
  })
  it('Liste nur mit fremden Stimmen → none', () => {
    expect(deviceMode([v('hi-IN'), v('en-US')])).toBe('none')
  })
})
