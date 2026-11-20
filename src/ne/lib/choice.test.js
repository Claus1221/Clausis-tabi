import { describe, it, expect } from 'vitest'
import { choiceState } from './choice.js'

describe('choiceState', () => {
  it('vor der Antwort ist alles neutral', () => {
    expect(choiceState('a', null, 'a')).toBe('neutral')
    expect(choiceState('b', null, 'a')).toBe('neutral')
  })
  it('danach: richtige grün, gewählte falsche rot, übrige neutral', () => {
    expect(choiceState('a', 'b', 'a')).toBe('correct')
    expect(choiceState('b', 'b', 'a')).toBe('wrong')
    expect(choiceState('c', 'b', 'a')).toBe('neutral')
    expect(choiceState('a', 'a', 'a')).toBe('correct')
  })
  it('funktioniert auch mit Indizes (0 ist eine Antwort, nicht „keine“)', () => {
    expect(choiceState(0, 0, 1)).toBe('wrong')
    expect(choiceState(1, 0, 1)).toBe('correct')
    expect(choiceState(0, undefined, 0)).toBe('neutral')
  })
})
