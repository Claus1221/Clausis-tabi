import { describe, it, expect } from 'vitest'
import { TALKS, TALK_BY_SCENE } from '../data/talks.js'
import { GRAMMAR } from '../data/grammar.js'
import { DIALOGS } from '../data/dialogs.js'
import {
  talkGate, talkForScene, learnedVocabList,
  buildTalkSystem, buildHintSystem, buildDebriefSystem, buildDebriefPrompt, transcriptText, grammarTalk,
} from './talk.js'

const talk = TALK_BY_SCENE['d1']

describe('TALKS (Daten)', () => {
  it('hängt jedes freie Gespräch an eine existierende Szene', () => {
    const sceneIds = DIALOGS.filter(d => d.id).map(d => d.id)
    for (const t of TALKS) expect(sceneIds).toContain(t.sceneId)
  })

  it('hat eindeutige IDs und je Szene höchstens ein Gespräch', () => {
    expect(new Set(TALKS.map(t => t.id)).size).toBe(TALKS.length)
    expect(new Set(TALKS.map(t => t.sceneId)).size).toBe(TALKS.length)
  })

  it('hat überall die Pflichtfelder inkl. Zug-Deckel', () => {
    for (const t of TALKS) {
      for (const f of ['goalDe', 'persona', 'place', 'role', 'complication', 'goalCheck']) {
        expect(typeof t[f], `${t.id}.${f}`).toBe('string')
        expect(t[f].length, `${t.id}.${f}`).toBeGreaterThan(0)
      }
      expect(t.maxTurns).toBeGreaterThan(0)
    }
  })
})

describe('talkGate', () => {
  it('bleibt zu, solange die geskriptete Szene nicht gemeistert ist', () => {
    const gate = talkGate(talk, { completedDialogs: [] })
    expect(gate.open).toBe(false)
    expect(gate.reason).toMatch(/Szene/)
  })

  it('öffnet, sobald die Szene gemeistert ist', () => {
    expect(talkGate(talk, { completedDialogs: ['d1'] }).open).toBe(true)
  })

  it('verträgt fehlenden Fortschritt und fehlendes Gespräch', () => {
    expect(talkGate(talk, {}).open).toBe(false)
    expect(talkGate(undefined, { completedDialogs: ['d1'] }).open).toBe(false)
  })

  it('findet das Gespräch zu einer Szene', () => {
    expect(talkForScene('d1')?.id).toBe('t-d1')
    expect(talkForScene('gibtsnicht')).toBeUndefined()
  })
})

describe('learnedVocabList', () => {
  const progress = { completedWordBlocks: [], completedChapters: [], completedDialogs: ['d1'] }

  it('nimmt die Wendungen gemeisterter Szenen auf', () => {
    const list = learnedVocabList(progress)
    expect(list).toContain('こんにちは')
    expect(list).toContain('です')
  })

  it('ist sortiert und deterministisch (Voraussetzung fürs Prompt-Caching)', () => {
    const a = learnedVocabList(progress)
    const b = learnedVocabList(progress)
    expect(a).toEqual(b)
    expect(a).toEqual([...a].sort())
  })

  it('verträgt leeren Fortschritt', () => {
    expect(Array.isArray(learnedVocabList({}))).toBe(true)
    expect(Array.isArray(learnedVocabList(undefined))).toBe(true)
  })
})

describe('buildTalkSystem', () => {
  const sys = buildTalkSystem(talk, ['こんにちは', 'です'])

  it('gibt Rolle, Ziel und die geheime Wendung mit', () => {
    expect(sys).toContain(talk.persona)
    expect(sys).toContain(talk.goalDe)
    expect(sys).toContain(talk.complication)
    expect(sys).toContain(talk.goalCheck)
  })

  it('schreibt die Wortschatz-Grenze mit Bedeutungen fest', () => {
    expect(sys).toContain('WORTSCHATZ-LISTE')
    expect(sys).toMatch(/こんにちは = /)
  })

  it('verlangt Kana-Ausgabe und das NPC-JSON-Format', () => {
    expect(sys).toContain('KEINE Kanji')
    expect(sys).toContain('"npc"')
    expect(sys).toContain('"done"')
  })

  it('verbietet ausdrückliches Korrigieren im Gespräch', () => {
    expect(sys).toMatch(/Korrigiere NIEMALS/)
  })

  it('ist bei gleichen Eingaben Byte-für-Byte gleich', () => {
    expect(buildTalkSystem(talk, ['こんにちは', 'です'])).toBe(sys)
  })
})

describe('buildHintSystem', () => {
  it('fragt nach Vorschlägen für die lernende Person, nicht nach einer NPC-Zeile', () => {
    const sys = buildHintSystem(talk, ['こんにちは'])
    expect(sys).toContain('"hints"')
    expect(sys).toContain('WORTSCHATZ-LISTE')
    expect(sys).not.toContain('"done"')
  })
})

describe('Nachbesprechung', () => {
  const turns = [
    { npc: 'こんにちは！', npcDe: 'Guten Tag!', user: 'こんにちは' },
    { npc: 'おなまえは？', npcDe: 'Wie heißen Sie?', user: 'クラウスです', helped: true },
    { npc: 'よろしく。', npcDe: 'Freut mich.' },
  ]

  it('baut ein lesbares Transkript inkl. Hilfe-Markierung', () => {
    const t = transcriptText(turns)
    expect(t).toContain('こんにちは！')
    expect(t).toContain('クラウスです')
    expect(t).toContain('[mit Hilfe]')
    // Der letzte Zug hat keine Antwort – es darf keine leere Zeile entstehen.
    expect(t).not.toMatch(/LERNENDE PERSON: *$/m)
  })

  it('gibt Situation und Transkript an die Nachbesprechung weiter', () => {
    const p = buildDebriefPrompt(talk, turns)
    expect(p).toContain(talk.goalDe)
    expect(p).toContain('クラウスです')
  })

  it('begrenzt Korrekturen und verlangt das Debrief-JSON', () => {
    const sys = buildDebriefSystem()
    expect(sys).toContain('"korrekturen"')
    expect(sys).toContain('"wendungen"')
    expect(sys).toMatch(/Höchstens 3 Korrekturen/)
  })
})

describe('buildTalkSystem: sanfter erster Durchgang', () => {
  const vocab = ['こんにちは', 'です']

  it('verschweigt die Wendung beim ersten Durchgang', () => {
    const sys = buildTalkSystem(talk, vocab, { withComplication: false })
    expect(sys).not.toContain(talk.complication)
    expect(sys).toContain('OHNE ÜBERRASCHUNG')
  })

  it('spielt die Wendung ab dem zweiten Durchgang aus', () => {
    const sys = buildTalkSystem(talk, vocab, { withComplication: true })
    expect(sys).toContain(talk.complication)
    expect(sys).not.toContain('OHNE ÜBERRASCHUNG')
  })

  it('verlangt im geführten Modus Antwort-Vorschläge im selben Zug', () => {
    // Wichtig: in DERSELBEN Antwort – ein zweiter Aufruf je Zug würde die
    // Kosten verdoppeln und das Gespräch verzögern.
    const sys = buildTalkSystem(talk, vocab, { guided: true })
    expect(sys).toContain('"hints"')
    expect(sys).toContain('LERNENDE PERSON')
  })

  it('lässt die Vorschläge ohne geführten Modus weg', () => {
    expect(buildTalkSystem(talk, vocab, { guided: false })).not.toContain('"hints"')
    expect(buildTalkSystem(talk, vocab)).not.toContain('"hints"')
  })

  it('bleibt bei gleichen Schaltern Byte-für-Byte gleich (Prompt-Caching)', () => {
    const a = buildTalkSystem(talk, vocab, { guided: true, withComplication: false })
    const b = buildTalkSystem(talk, vocab, { guided: true, withComplication: false })
    expect(a).toBe(b)
  })
})

describe('Grammatik im Gespräch', () => {
  const topic = GRAMMAR.find(g => g.id === 'g4')

  it('baut aus einem Thema ein Übungsgespräch ohne Wendung', () => {
    const t = grammarTalk(topic)
    expect(t.grammarFocus.id).toBe('g4')
    expect(t.complication).toBe('')
    expect(t.maxTurns).toBeGreaterThan(0)
    for (const f of ['goalDe', 'persona', 'place', 'role', 'goalCheck']) {
      expect(typeof t[f], f).toBe('string')
    }
  })

  it('verträgt ein fehlendes Thema', () => {
    expect(grammarTalk(undefined)).toBeNull()
  })

  it('schreibt das Übungsziel in den System-Prompt', () => {
    const sys = buildTalkSystem(grammarTalk(topic), ['こんにちは'], { withComplication: false })
    expect(sys).toContain('ÜBUNGSZIEL')
    expect(sys).toContain(topic.title)
    // Über die Regel wird nicht geredet – es bleibt ein Gespräch.
    expect(sys).toMatch(/Sprich nie über die Regel/)
  })

  it('lässt normale Gespräche unberührt', () => {
    expect(buildTalkSystem(talk, ['こんにちは'])).not.toContain('ÜBUNGSZIEL')
  })
})

describe('Nachbesprechung mit Grammatik-Bezug', () => {
  it('bietet die gelernten Themen zur Zuordnung an', () => {
    const sys = buildDebriefSystem(GRAMMAR.filter(g => ['g4', 'g5'].includes(g.id)))
    expect(sys).toContain('g4 = ')
    expect(sys).toContain('"grammatik"')
    // Raten wäre schlimmer als nichts – die App zeigt sonst die falsche Regel.
    expect(sys).toMatch(/Rate nicht/)
  })

  it('lässt den Block weg, wenn noch keine Grammatik gelernt ist', () => {
    const sys = buildDebriefSystem([])
    expect(sys).not.toContain('GRAMMATIK-THEMEN')
    expect(sys).toContain('"korrekturen"')
  })
})
