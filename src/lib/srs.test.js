import { describe, it, expect } from 'vitest'
import { shuffled, feedbackColor } from './srs.js'
import { C } from '../theme.js'

describe('shuffled', () => {
  it('enthält genau dieselben Elemente, nur neu sortiert', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffled(input)
    expect(out).toHaveLength(input.length)
    expect([...out].sort()).toEqual([...input].sort())
  })

  it('verändert das Original-Array nicht (neue Kopie)', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffled(input)
    expect(input).toEqual(copy)
  })
})

describe('feedbackColor', () => {
  it('richtig → matcha-Rand, getöntes Grün im Hintergrund', () => {
    const fb = feedbackColor('correct')
    expect(fb.border).toBe(C.matcha)
    expect(fb.bg).toBe(`${C.matcha}20`)
  })

  it('falsch → shu-Rand, getöntes Rot im Hintergrund', () => {
    const fb = feedbackColor('wrong')
    expect(fb.border).toBe(C.shu)
    expect(fb.bg).toBe(`${C.shu}20`)
  })

  it('neutral → gedeckter Standard-Rand, weißer Hintergrund', () => {
    const fb = feedbackColor('neutral')
    expect(fb.border).toBe(C.washiDark)
    expect(fb.bg).toBe('#fff')
  })
})
