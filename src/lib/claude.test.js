import { describe, it, expect } from 'vitest'
import { parseJson } from './claude.js'

// Der Parser ist die Sollbruchstelle zwischen Modell und App: Modelle verpacken
// JSON gern in Code-Zäune oder stellen einen Satz voran. Was hier nicht sicher
// lesbar ist, muss `null` ergeben – der Gesprächs-Screen weicht dann auf sein
// Standardverhalten aus, statt Müll anzuzeigen.
describe('parseJson', () => {
  it('liest sauberes JSON', () => {
    expect(parseJson('{"npc":"こんにちは。","done":false}')).toEqual({ npc: 'こんにちは。', done: false })
  })

  it('liest JSON in einem Code-Zaun', () => {
    expect(parseJson('```json\n{"ok": true}\n```')).toEqual({ ok: true })
  })

  it('liest JSON im Zaun ohne Sprachangabe', () => {
    expect(parseJson('```\n{"ok": false}\n```')).toEqual({ ok: false })
  })

  it('schneidet vorangestellten Fließtext weg', () => {
    expect(parseJson('Gerne! {"npc":"はい。"} – viel Erfolg.')).toEqual({ npc: 'はい。' })
  })

  it('gibt null bei kaputtem JSON', () => {
    expect(parseJson('{"npc": "こんにちは}')).toBeNull()
  })

  it('gibt null bei Text ohne JSON', () => {
    expect(parseJson('Das kann ich nicht beantworten.')).toBeNull()
  })

  it('gibt null bei leerer/fehlender Eingabe', () => {
    expect(parseJson('')).toBeNull()
    expect(parseJson(null)).toBeNull()
    expect(parseJson(undefined)).toBeNull()
  })

  it('gibt null bei JSON, das kein Objekt ist', () => {
    expect(parseJson('[1,2,3]')).toBeNull()
    expect(parseJson('"nur ein String"')).toBeNull()
  })
})
