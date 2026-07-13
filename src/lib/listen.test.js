import { describe, it, expect } from 'vitest'
import { normalizeJa, matchSpoken } from './listen.js'

// Realistische Erkennungs-Ausgaben (Standard-Orthografie mit Kanji) müssen auf
// die Kana-Antworten der Dialoge abgebildet werden.
describe('normalizeJa', () => {
  it('wandelt bekannte Kanji-Schreibweisen in Dialog-Kana um', () => {
    expect(normalizeJa('ホテルまでお願いします')).toBe(normalizeJa('ホテルまで おねがいします。'))
    expect(normalizeJa('駅はどこですか？')).toBe(normalizeJa('えきは どこですか？'))
    expect(normalizeJa('右です')).toBe(normalizeJa('みぎです。'))
  })
  it('entfernt Leerraum und Satzzeichen, Katakana wird Hiragana', () => {
    expect(normalizeJa('はい、 どうぞ。')).toBe('はいどうぞ')
    expect(normalizeJa('メニュー')).toBe('めにゅー')
  })
  it('ersetzt längste Einträge zuerst (片道 gewinnt vor 道)', () => {
    expect(normalizeJa('片道でお願いします')).toBe('かたみちでおねがいします')
  })
})

describe('matchSpoken', () => {
  const options = ['ホテルまで おねがいします。', 'いただきます。', 'おやすみなさい。']

  it('findet die exakt gesagte Antwort (Kanji-Transkript)', () => {
    const m = matchSpoken(['ホテルまでお願いします'], options)
    expect(m.option).toBe('ホテルまで おねがいします。')
  })

  it('verzeiht kleine Erkennungsabweichungen', () => {
    // Partikel verschluckt / leicht anders gehört
    const m = matchSpoken(['ホテルまでお願いしま'], options)
    expect(m.option).toBe('ホテルまで おねがいします。')
  })

  it('nutzt auch die Erkennungs-Alternativen', () => {
    const m = matchSpoken(['ほてるまでおねがい', 'ホテルまでお願いします'], options)
    expect(m.option).toBe('ホテルまで おねがいします。')
  })

  it('erkennt eine bewusst falsche (Distraktor-)Antwort als diese', () => {
    const m = matchSpoken(['いただきます'], options)
    expect(m.option).toBe('いただきます。')
  })

  it('kurze Antworten: gemeinsames です-Ende führt nicht zum Fehltreffer', () => {
    const kurz = ['みぎです。', 'たかいです。', 'さようなら。']
    expect(matchSpoken(['右です'], kurz).option).toBe('みぎです。')
    expect(matchSpoken(['高いです'], kurz).option).toBe('たかいです。')
  })

  it('liefert null, wenn nichts sicher passt (kein Raten)', () => {
    expect(matchSpoken(['今日はいい天気ですね'], options).option).toBe(null)
    expect(matchSpoken([''], options).option).toBe(null)
  })

  it('gibt das Gehörte für die Anzeige zurück', () => {
    expect(matchSpoken(['右です'], ['みぎです。', 'ひだりです。']).heard).toBe('右です')
  })

  it('nah beieinanderliegende Optionen: nur eindeutig Besseres gewinnt', () => {
    // みぎ/ひだり unterscheiden sich – exakter Treffer muss trotzdem klar zugeordnet werden
    expect(matchSpoken(['左です'], ['みぎです。', 'ひだりです。']).option).toBe('ひだりです。')
  })
})
