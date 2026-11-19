import { describe, it, expect } from 'vitest'
import { normalizeEmail, isValidEmail, isAdminEmail, accessState, effectiveAccess, mayRecheck } from './access.js'
const ADMINS = ['clausalbers@gmail.com']

describe('normalizeEmail / isValidEmail', () => {
  it('trimmt und schreibt klein', () => expect(normalizeEmail('  Jonas.M@Gmail.com ')).toBe('jonas.m@gmail.com'))
  it('lehnt Unbrauchbares ab', () => {
    for (const s of ['', 'jonas', 'a@b', 'a b@c.de', '@c.de', 'a@', 'a/b@c.de']) expect(isValidEmail(s)).toBe(false)
    expect(isValidEmail('balkonien4ever@web.de')).toBe(true)
  })
})
describe('accessState', () => {
  it('Admin kommt ohne Eintrag rein, auch bei Großschreibung', () =>
    expect(accessState({ email: 'ClausAlbers@gmail.com', admins: ADMINS, docExists: false })).toBe('admin'))
  it('Eintrag vorhanden → allowed', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, docExists: true })).toBe('allowed'))
  it('kein Eintrag → denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, docExists: false })).toBe('denied'))
  it('Regel verweigert → denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, errorCode: 'permission-denied' })).toBe('denied'))
  it('ohne Netz und ohne Cache → offline, nicht denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, errorCode: 'unavailable' })).toBe('offline'))
  it('fehlende Adresse → denied', () =>
    expect(accessState({ email: '', admins: ADMINS, docExists: true })).toBe('denied'))
})

describe('effectiveAccess', () => {
  it('gibt den Zustand zurueck, wenn er dem aktuellen Nutzer gehoert', () => {
    expect(effectiveAccess({ uid: 'a', state: 'allowed' }, 'a')).toBe('allowed')
    expect(effectiveAccess({ uid: 'a', state: 'admin' }, 'a')).toBe('admin')
  })
  it('behandelt das Ergebnis eines anderen Nutzers als checking', () => {
    expect(effectiveAccess({ uid: 'a', state: 'allowed' }, 'b')).toBe('checking')
  })
  it('ohne Ergebnis oder ohne Nutzer ist es checking', () => {
    expect(effectiveAccess(null, 'a')).toBe('checking')
    expect(effectiveAccess({ uid: 'a', state: 'admin' }, null)).toBe('checking')
    expect(effectiveAccess({ uid: 'a', state: 'admin' }, undefined)).toBe('checking')
  })
})

describe('mayRecheck', () => {
  it('erlaubt die erste Neupruefung', () => {
    expect(mayRecheck(null, 1000)).toBe(true)
  })
  it('sperrt eine zweite Neupruefung kurz danach', () => {
    expect(mayRecheck(0, 5000)).toBe(false)
  })
  it('erlaubt sie nach Ablauf der Pause wieder', () => {
    expect(mayRecheck(0, 31000)).toBe(true)
  })
})
