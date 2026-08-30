import { describe, it, expect } from 'vitest'
import { learnedItems } from './learned.js'
import { srsItemInfo } from './srs.js'

// Wendungen aus freien Gesprächen sind ganz normale SRS-Karten – sie müssen in
// denselben Stapeln und Zählern auftauchen wie Kana und Wörter, sonst übernimmt
// man sie in der Nachbesprechung und sieht sie nie wieder.
describe('learnedItems', () => {
  it('nimmt übernommene Gesprächs-Wendungen mit auf', () => {
    const items = learnedItems({ extraPhrases: { 'また あとで。': { kana: 'また あとで。', de: 'Bis später.' } } })
    expect(items).toContain('また あとで。')
  })

  it('verträgt leeren und fehlenden Fortschritt', () => {
    expect(learnedItems({})).toEqual([])
    expect(learnedItems(undefined)).toEqual([])
  })

  it('nimmt gelernte Kana auf', () => {
    const items = learnedItems({ completedLessons: ['h1'] })
    expect(items.length).toBeGreaterThan(0)
  })

  it('liefert jede Karte nur einmal', () => {
    // Eine Wendung, die zufällig einem gelernten Zeichen entspricht, darf den
    // Stapel nicht doppelt belegen.
    const items = learnedItems({ completedLessons: ['h1'], extraPhrases: { 'あ': { de: 'Ah' } } })
    expect(items.length).toBe(new Set(items).size)
  })
})

describe('srsItemInfo mit Gesprächs-Wendungen', () => {
  const extra = { 'また あとで。': { kana: 'また あとで。', de: 'Bis später.' } }

  it('zeigt Lesung und Bedeutung einer übernommenen Wendung', () => {
    const info = srsItemInfo('また あとで。', extra)
    expect(info.sub).toBe('Bis später.')
    expect(info.isWord).toBe(true)
    expect(info.fromTalk).toBe(true)
  })

  it('lässt bekannte Kana und Wörter unverändert', () => {
    expect(srsItemInfo('あ', extra).isWord).toBe(false)
    expect(srsItemInfo('あ').isWord).toBe(false)   // ohne Argument wie bisher
  })
})
