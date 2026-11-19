import { describe, it, expect } from 'vitest'
import { playSequence } from './sequence.js'

describe('playSequence', () => {
  it('spricht alle Texte nacheinander, jeden erst nach dem Ende des vorigen', async () => {
    const log = []
    const speakFn = t => { log.push('start ' + t); return Promise.resolve().then(() => log.push('end ' + t)) }
    await playSequence(['क', 'ख', 'ग'], speakFn, () => false)
    expect(log).toEqual(['start क', 'end क', 'start ख', 'end ख', 'start ग', 'end ग'])
  })
  it('abgebrochen während des ersten → der zweite wird nie gesprochen', async () => {
    const spoken = []
    let cancelled = false
    const speakFn = t => { spoken.push(t); cancelled = true; return Promise.resolve() }
    await playSequence(['क', 'ख'], speakFn, () => cancelled)
    expect(spoken).toEqual(['क'])
  })
  it('schon vor dem Start abgebrochen → nichts', async () => {
    const spoken = []
    await playSequence(['क'], t => { spoken.push(t); return Promise.resolve() }, () => true)
    expect(spoken).toEqual([])
  })
  it('speakFn lehnt ab oder wirft → löst trotzdem auf und hört auf', async () => {
    const spoken = []
    await expect(playSequence(['क', 'ख'], t => { spoken.push(t); return Promise.reject(new Error('x')) }, () => false)).resolves.toBeUndefined()
    expect(spoken).toEqual(['क'])
    await expect(playSequence(['क'], () => { throw new Error('y') }, () => false)).resolves.toBeUndefined()
  })
  it('wirft isCancelled → löst trotzdem auf', async () => {
    await expect(playSequence(['क'], () => Promise.resolve(), () => { throw new Error('z') })).resolves.toBeUndefined()
  })
})
