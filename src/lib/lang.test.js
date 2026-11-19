import { describe, it, expect } from 'vitest'
import { selectableLangs, progressPath, profilePath, initialLang, NE_PUBLIC } from './lang.js'

describe('Pfade', () => {
  it('Japanisch bleibt im Wurzeldokument', () => expect(progressPath('u1', 'ja')).toEqual(['users', 'u1']))
  it('Nepali liegt darunter', () => expect(progressPath('u1', 'ne')).toEqual(['users', 'u1', 'langs', 'ne']))
  it('unbekannte Sprache wirft', () => expect(() => progressPath('u1', 'xx')).toThrow())
  it('Profil', () => expect(profilePath('u1')).toEqual(['users', 'u1', 'meta', 'profile']))
})
describe('selectableLangs', () => {
  it('Admin sieht beide', () => expect(selectableLangs(true)).toEqual(['ja', 'ne']))
  it('andere sehen Nepali erst nach Freigabe', () =>
    expect(selectableLangs(false)).toEqual(NE_PUBLIC ? ['ja', 'ne'] : ['ja']))
})
describe('initialLang', () => {
  it('gespeicherte Wahl gilt', () => expect(initialLang({ profileLang: 'ne', hasJaProgress: true, isAdmin: true })).toBe('ne'))
  it('Bestandsnutzer ohne Profil → ja, ohne Frage', () => expect(initialLang({ profileLang: null, hasJaProgress: true, isAdmin: false })).toBe('ja'))
  it('neu, mehrere Sprachen wählbar → Auswahl', () => expect(initialLang({ profileLang: null, hasJaProgress: false, isAdmin: true })).toBe(null))
  it('neu, nur eine Sprache wählbar → diese', () => {
    if (!NE_PUBLIC) expect(initialLang({ profileLang: null, hasJaProgress: false, isAdmin: false })).toBe('ja')
  })
  it('unbekannter Profilwert zählt als kein Profil', () => expect(initialLang({ profileLang: 'xx', hasJaProgress: true, isAdmin: false })).toBe('ja'))
  it('ne im Profil, aber für diese Person gesperrt → ja', () => {
    if (!NE_PUBLIC) expect(initialLang({ profileLang: 'ne', hasJaProgress: false, isAdmin: false })).toBe('ja')
  })
})
