import { describe, it, expect } from 'vitest'
import { normalizeEmail, isValidEmail, isAdminEmail, accessState } from './access.js'
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
