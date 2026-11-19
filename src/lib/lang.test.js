import { describe, it, expect } from 'vitest'
import { selectableLangs, progressPath, profilePath, initialLang, resolveLang, NE_PUBLIC } from './lang.js'

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

describe('resolveLang', () => {
  const pending = { uid: 'u1', isAdmin: false, profileReady: false, profileLang: null, existenceReady: false, hasJaProgress: false, choice: null, hint: null }
  const ready = { ...pending, profileReady: true, existenceReady: true }
  it('beide Lesevorgänge offen, kein Hinweis → lädt', () =>
    expect(resolveLang(pending)).toEqual({ lang: null, loading: true }))
  it('Bestandsnutzer ohne Profil → ja', () =>
    expect(resolveLang({ ...ready, hasJaProgress: true })).toEqual({ lang: 'ja', loading: false }))
  it('neue Person, Admin, nichts gespeichert → Auswahl', () =>
    expect(resolveLang({ ...ready, isAdmin: true })).toEqual({ lang: null, loading: false }))
  it('ausdrückliche Wahl gilt sofort', () =>
    expect(resolveLang({ ...pending, isAdmin: true, choice: 'ne' })).toEqual({ lang: 'ne', loading: false }))
  it('ne als Wahl oder im Profil für Nicht-Admin wird ignoriert', () => {
    if (NE_PUBLIC) return
    expect(resolveLang({ ...pending, choice: 'ne' })).toEqual({ lang: null, loading: true })
    expect(resolveLang({ ...ready, profileLang: 'ne', hasJaProgress: true })).toEqual({ lang: 'ja', loading: false })
  })
  it('fehlgeschlagene Existenzprüfung (als hasJaProgress true übergeben) → ja', () =>
    expect(resolveLang({ ...ready, hasJaProgress: true })).toEqual({ lang: 'ja', loading: false }))
  it('Hinweis + offene Lesevorgänge → diese Sprache, lädt nicht', () =>
    expect(resolveLang({ ...pending, isAdmin: true, hint: 'ne' })).toEqual({ lang: 'ne', loading: false }))
  it('Hinweis ne für Nicht-Admin wird ignoriert', () => {
    if (!NE_PUBLIC) expect(resolveLang({ ...pending, hint: 'ne' })).toEqual({ lang: null, loading: true })
  })
  it('sind beide Lesevorgänge fertig, zählt der Hinweis nicht', () =>
    expect(resolveLang({ ...ready, isAdmin: true, hint: 'ne' })).toEqual({ lang: null, loading: false }))
})
