import { describe, it, expect } from 'vitest'
import { sm2, addDays, addHours, localDateTime, LAPSE_RETRY_HOURS, dueKana, computeStats, isDeniedError, emptyProgress, DEFAULT_PROGRESS, progressView } from './useProgress.js'

// Werte unten sind von Hand anhand der sm2()-Formel nachgerechnet (siehe
// useProgress.js), nicht aus der Implementierung zurückgewonnen.
describe('sm2 (SRS-Algorithmus)', () => {
  it('startet eine neue Karte bei Erfolg mit Intervall 1 Tag und unverändertem Ease', () => {
    const r = sm2(undefined, 4) // quality=4 ("Gut") lässt ease laut Formel unverändert (Delta=0)
    expect(r.reps).toBe(1)
    expect(r.interval).toBe(1)
    expect(r.ease).toBe(2.5)
    expect(r.due).toBe(addDays(1))
  })

  it('zweite erfolgreiche Wiederholung springt auf 6 Tage', () => {
    const first = sm2(undefined, 4)
    const second = sm2(first, 4)
    expect(second.reps).toBe(2)
    expect(second.interval).toBe(6)
    expect(second.due).toBe(addDays(6))
  })

  it('dritte Erfolgs-Wiederholung: Intervall = vorheriges Intervall × Ease, gerundet', () => {
    let card = sm2(undefined, 4) // reps=1, interval=1, ease=2.5
    card = sm2(card, 4)          // reps=2, interval=6, ease=2.5
    const third = sm2(card, 4)   // reps=3, interval=round(6×2.5)=15
    expect(third.reps).toBe(3)
    expect(third.interval).toBe(15)
    expect(third.due).toBe(addDays(15))
  })

  it('Vergessen (quality<3) fällt nur eine Kenntnisstufe zurück, nicht auf 0', () => {
    // Karte in Stufe „Gefestigt" (Intervall 45, zwischen den Grenzen 30 und 120).
    const established = { ease: 2.5, interval: 45, reps: 5, due: addDays(0) }
    const r = sm2(established, 1)
    expect(r.interval).toBe(7) // fällt auf die Untergrenze der Stufe „Vertraut" (7 Tage)
    expect(r.reps).toBe(4)     // Multiplikator-Pfad bleibt erhalten (reps-1, min. 2)
    expect(r.ease).toBeCloseTo(1.96, 2)
    // Untertägiger Wiederholungsschritt: in ein paar Stunden erneut fällig
    // (Zeitstempel-Format), nicht erst morgen. Obergrenze statt Gleichheit,
    // damit ein Minutenwechsel zwischen den beiden Aufrufen den Test nicht kippt.
    expect(r.due).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(r.due > localDateTime()).toBe(true)
    expect(r.due <= addHours(LAPSE_RETRY_HOURS)).toBe(true)
  })

  it('Ease-Faktor fällt nie unter die Grenze 1.3', () => {
    let card
    for (let i = 0; i < 20; i++) card = sm2(card, 3) // viele "Schwer"-Bewertungen in Folge
    expect(card.ease).toBeCloseTo(1.3, 2)
  })
})

describe('dueKana', () => {
  it('eine Karte ohne SRS-Eintrag gilt als fällig', () => {
    const due = dueKana({ srs: {} }, ['あ'])
    expect(due).toContain('あ')
  })

  it('eine Karte mit zukünftiger Fälligkeit ist nicht fällig', () => {
    const due = dueKana({ srs: { 'あ': { due: addDays(5) } } }, ['あ'])
    expect(due).not.toContain('あ')
  })

  it('eine Karte mit vergangener Fälligkeit ist fällig', () => {
    const due = dueKana({ srs: { 'あ': { due: addDays(-1) } } }, ['あ'])
    expect(due).toContain('あ')
  })

  it('Tages-Fälligkeit „heute" gilt ab Tagesbeginn (gemischter Formatvergleich)', () => {
    const due = dueKana({ srs: { 'あ': { due: addDays(0) } } }, ['あ'])
    expect(due).toContain('あ')
  })

  it('Zeitstempel-Fälligkeit: vergangene Uhrzeit fällig, zukünftige nicht', () => {
    const past = dueKana({ srs: { 'あ': { due: '2020-01-01T08:00' } } }, ['あ'])
    expect(past).toContain('あ')
    const future = dueKana({ srs: { 'あ': { due: addHours(2) } } }, ['あ'])
    expect(future).not.toContain('あ')
  })
})

describe('computeStats', () => {
  it('Level beginnt bei 1 und steigt alle 1000 XP', () => {
    expect(computeStats({ xpByDate: {} }).level).toBe(1)
    expect(computeStats({ xpByDate: { '2020-01-01': 999 } }).level).toBe(1)
    expect(computeStats({ xpByDate: { '2020-01-01': 1000 } }).level).toBe(2)
  })
})

describe('isDeniedError (gesperrt bei offener App)', () => {
  it('erkennt nur permission-denied', () => {
    expect(isDeniedError({ code: 'permission-denied' })).toBe(true)
  })
  it('ignoriert andere Fehler', () => {
    expect(isDeniedError({ code: 'unavailable' })).toBe(false)
    expect(isDeniedError(undefined)).toBe(false)
    expect(isDeniedError(new Error('x'))).toBe(false)
  })
})

describe('emptyProgress', () => {
  it('setzt jedes Lernstand-Feld zurück und behält nur die Einstellungen', () => {
    const e = emptyProgress({ options: 4 })
    expect(Object.keys(e).sort()).toEqual(Object.keys(DEFAULT_PROGRESS).sort())
    expect(e.settings).toEqual({ options: 4 })
    expect(e.srs).toEqual({}); expect(e.completedLessons).toEqual([])
  })
})

describe('progressView (kein Stand einer anderen Sprache sichtbar)', () => {
  const data = { ...DEFAULT_PROGRESS, completedLessons: ['h1'] }
  it('gleicher Schlüssel: die geladenen Daten, nicht mehr am Laden', () => {
    expect(progressView({ key: 'u|ja', data }, 'u|ja')).toEqual({ progress: data, loading: false })
  })
  it('anderer Schlüssel: Standardwerte und noch am Laden', () => {
    expect(progressView({ key: 'u|ja', data }, 'u|ne')).toEqual({ progress: DEFAULT_PROGRESS, loading: true })
  })
  it('noch nichts geladen: Standardwerte und noch am Laden', () => {
    expect(progressView(null, 'u|ja')).toEqual({ progress: DEFAULT_PROGRESS, loading: true })
  })
})
