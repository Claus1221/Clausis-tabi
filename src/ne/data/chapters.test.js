import { describe, it, expect } from 'vitest'
import { CHAPTERS, CHAPTER_BY_ID, CHAPTER_WORD, chapterWords } from './chapters.js'
import { WORD_BLOCKS, WORD_BY_DEV } from './words.js'
import { GRAMMAR_NEW_WORDS, GRAMMAR_FORMS } from './grammar.js'
import { romanFits, nfc } from '../lib/deva.js'
import { functionWordSet, isKnownWord } from '../lib/functionWords.js'

// Paare aus Devanagari und Umschrift, die romanFits ablehnt, obwohl sie richtig sind.
// Je Eintrag eine Zeile Begründung; die Umschrift wird NIE verbogen. Schlüssel `${dev}|${roman}`.
const ROMAN_EXCEPTIONS = {}

// Eigennamen der Geschichte: antippbar (mit Bedeutung „Name“), aber kein Lernwort – sie
// werden nie per intro vorgestellt und gelten deshalb im Wortschatz-Test als bekannt.
const PROPER_NAMES = ['आशा', 'माछापुच्छ्रे']

const IDS = ['nc1', 'nc2', 'nc3', 'nc4', 'nc5', 'nc6', 'nc7', 'nc8', 'nc9', 'nc10']
// Verbindliche Reihenfolge aus dem Lernpfad (path-order.md), fest verdrahtet: was VOR einem
// Kapitel liegt, darf es benutzen. Szenen (nd…) bringen keinen Wortschatz und fehlen hier.
const COURSE = ['nw1', 'ng1', 'ng2', 'nw2', 'ng3', 'nc1',
  'nw3', 'ng4', 'ng5', 'nc2',
  'nw4', 'ng8', 'ng9', 'ng10', 'nc3',
  'nw5', 'ng6', 'ng7', 'ng11', 'nc4',
  'nw6', 'ng12', 'nc5', 'nc6',
  'nw7', 'nc7', 'nc8', 'nc9', 'nc10']

const KINDS = {
  story: ['de'],
  intro: ['dev', 'roman', 'de'],
  audio: ['say', 'sayRoman', 'options', 'answer', 'de'],
  dialog: ['line', 'lineRoman', 'lineDe', 'options', 'answer', 'answerRoman', 'answerDe', 'optionsMeta'],
  gap: ['before', 'after', 'options', 'answer', 'de', 'roman'],
  tf: ['dev', 'roman', 'de', 'claimDe', 'answer'],
  build: ['tiles', 'answer', 'dev', 'de', 'roman'],
}
const TASKS = ['audio', 'dialog', 'gap', 'tf', 'build']

const isNfc = s => s === nfc(s)
const fits = (dev, roman) => romanFits(dev, roman) || `${dev}|${roman}` in ROMAN_EXCEPTIONS
const nonEmpty = s => typeof s === 'string' && s.trim() !== ''
const letters = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}]/gu, '')
const hasLetter = s => /[\p{L}\p{M}]/u.test(s)
const isDeva = s => /[ऀ-ॿ]/.test(s) && !/[A-Za-z]/.test(s)
// Satz → Wörter ohne Satzzeichen
const wordsOf = s => nfc(s).split(/[\s,।?!…–]+/).filter(hasLetter)
const gapSentence = s => s.before + s.answer + s.after
const allSteps = CHAPTERS.flatMap(c => c.steps.map((s, i) => ({ ...s, chapter: c.id, idx: i })))
const at = s => `${s.chapter}#${s.idx} (${s.kind})`

// Jeder Nepali-Satz eines Schritts mit seiner Umschrift (für romanFits und Satzzeichen).
function pairs(s) {
  switch (s.kind) {
    case 'story': return s.dev ? [[s.dev, s.roman]] : []
    case 'intro': return [[s.dev, s.roman]]
    case 'audio': return [[s.say, s.sayRoman]]
    case 'dialog': return [[s.line, s.lineRoman], ...s.options.map(o => [o, s.optionsMeta[o]?.roman])]
    case 'gap': return [[gapSentence(s), s.roman]]
    case 'tf': case 'build': return [[s.dev, s.roman]]
    default: return []
  }
}
// Was ein Schritt tatsächlich SAGT (ohne Ablenker) – zählt für „intro-Wort wieder benutzt“.
function spoken(s) {
  switch (s.kind) {
    case 'story': return s.dev ? [s.dev] : []
    case 'audio': return [s.say]
    case 'dialog': return [s.line, s.answer]
    case 'gap': return [gapSentence(s)]
    case 'tf': case 'build': return [s.dev]
    default: return []
  }
}
// Jeder Nepali-Text eines Schritts, auch Ablenker – für den Wortschatz-Test.
function allNepali(s) {
  switch (s.kind) {
    case 'gap': return [gapSentence(s), ...s.options.map(o => s.before + o + s.after)]
    case 'dialog': return [s.line, ...s.options]
    case 'build': return [s.dev, ...s.tiles]
    default: return spoken(s)
  }
}
const SUFFIXES = ['लाई', 'बाट', 'वटा', 'सँग', 'मा', 'को', 'ले']
// Kommt das (evtl. mehrteilige) Wort im Text vor? Das letzte Teilwort darf ein Anhängsel tragen.
function contains(text, word) {
  const ws = wordsOf(text), parts = word.split(' ').map(nfc)
  return ws.some((_, i) => parts.every((p, j) => {
    const w = ws[i + j]
    if (w === undefined) return false
    return w === p || (j === parts.length - 1 && SUFFIXES.some(x => w === p + x))
  }))
}

describe('CHAPTERS – Gerüst', () => {
  it('Kapitel nc1…nc4 in Reihenfolge, CHAPTER_BY_ID passt', () => {
    expect(CHAPTERS.map(c => c.id)).toEqual(IDS)
    for (const c of CHAPTERS) expect(CHAPTER_BY_ID[c.id]).toBe(c)
  })
  it('jedes Kapitel: title, place, summary (Deutsch), 12–20 Schritte', () => {
    for (const c of CHAPTERS) {
      for (const f of ['title', 'place', 'summary']) expect(nonEmpty(c[f]) && !isDeva(c[f]), `${c.id}.${f}`).toBe(true)
      expect(c.steps.length >= 12 && c.steps.length <= 20, `${c.id}: ${c.steps.length} Schritte`).toBe(true)
    }
  })
  it('≥ 3 intro (höchstens 6) und ≥ 4 Aufgaben aus ≥ 3 Arten je Kapitel', () => {
    for (const c of CHAPTERS) {
      const intros = c.steps.filter(s => s.kind === 'intro').length
      expect(intros >= 3 && intros <= 6, `${c.id}: ${intros} intro`).toBe(true)
      const tasks = c.steps.filter(s => TASKS.includes(s.kind))
      expect(tasks.length, c.id).toBeGreaterThanOrEqual(4)
      expect(new Set(tasks.map(s => s.kind)).size, c.id).toBeGreaterThanOrEqual(3)
    }
  })
  it('jeder Schritt hat eine bekannte Art und deren Pflichtfelder', () => {
    for (const s of allSteps) {
      expect(Object.keys(KINDS), at(s)).toContain(s.kind)
      for (const f of KINDS[s.kind]) expect(s[f] !== undefined && s[f] !== '', `${at(s)}.${f}`).toBe(true)
    }
  })
})

describe('Schritte', () => {
  it('story: Nepali-Zeile nur komplett (dev + roman + tokens); Tokens ergeben Satz und Umschrift', () => {
    for (const s of allSteps.filter(x => x.kind === 'story')) {
      const has = ['dev', 'roman', 'tokens'].map(f => s[f] !== undefined)
      expect(has.every(Boolean) || !has.some(Boolean), at(s)).toBe(true)
      if (!s.dev) continue
      expect(s.tokens.map(t => t.t).join(''), at(s)).toBe(s.dev.replace(/\s/g, ''))
      expect(s.tokens.map(t => t.r || '').join(''), at(s)).toBe(letters(s.roman))
      for (const t of s.tokens) {
        expect(isNfc(t.t), t.t).toBe(true)
        if (t.de !== undefined) expect(nonEmpty(t.de) && nonEmpty(t.r), `${at(s)}: ${t.t}`).toBe(true)
        else expect(hasLetter(t.t), `${at(s)}: ${t.t}`).toBe(false)
        if (t.r) expect(fits(t.t, t.r), `${at(s)}: ${t.t} ≠ ${t.r}`).toBe(true)
      }
    }
  })
  it('audio: Antwort unter den Optionen (Deutsch, eindeutig, ≥ 3)', () => {
    for (const s of allSteps.filter(x => x.kind === 'audio')) {
      expect(s.options, at(s)).toContain(s.answer)
      expect(s.options.length, at(s)).toBeGreaterThanOrEqual(3)
      expect(new Set(s.options).size, at(s)).toBe(s.options.length)
      for (const o of s.options) expect(isDeva(o), `${at(s)}: ${o}`).toBe(false)
      expect(isDeva(s.say), at(s)).toBe(true)
    }
  })
  it('dialog: Antwort unter den Optionen, jede Option mit roman und de in optionsMeta', () => {
    for (const s of allSteps.filter(x => x.kind === 'dialog')) {
      expect(s.options, at(s)).toContain(s.answer)
      expect(s.options.length, at(s)).toBeGreaterThanOrEqual(3)
      expect(new Set(s.options).size, at(s)).toBe(s.options.length)
      expect(Object.keys(s.optionsMeta).sort(), at(s)).toEqual([...s.options].sort())
      for (const o of s.options) {
        expect(isDeva(o) && isNfc(o), `${at(s)}: ${o}`).toBe(true)
        expect(nonEmpty(s.optionsMeta[o].roman) && nonEmpty(s.optionsMeta[o].de), `${at(s)}: ${o}`).toBe(true)
      }
      expect(s.optionsMeta[s.answer]).toEqual({ roman: s.answerRoman, de: s.answerDe })
    }
  })
  it('gap: Antwort unter den Optionen (Nepali, eindeutig, ≥ 3), Lücke an einer Stelle', () => {
    for (const s of allSteps.filter(x => x.kind === 'gap')) {
      expect(s.options, at(s)).toContain(s.answer)
      expect(s.options.length, at(s)).toBeGreaterThanOrEqual(3)
      expect(new Set(s.options).size, at(s)).toBe(s.options.length)
      for (const o of s.options) expect(isDeva(o) && isNfc(o), `${at(s)}: ${o}`).toBe(true)
      expect(isNfc(s.before) && isNfc(s.after), at(s)).toBe(true)
    }
  })
  it('tf: Antwort ist true/false, Behauptung Deutsch', () => {
    const tfs = allSteps.filter(x => x.kind === 'tf')
    for (const s of tfs) {
      expect(typeof s.answer, at(s)).toBe('boolean')
      expect(nonEmpty(s.claimDe) && !isDeva(s.claimDe), at(s)).toBe(true)
    }
    // Nicht alles „falsch“ (oder alles „wahr“) – sonst rät man blind richtig.
    expect(new Set(tfs.map(s => s.answer)).size).toBe(2)
  })
  it('build: answer lässt sich aus tiles legen, 1–2 Ablenker, ergibt dev', () => {
    for (const s of allSteps.filter(x => x.kind === 'build')) {
      const rest = [...s.tiles]
      for (const p of s.answer) {
        const i = rest.indexOf(p)
        expect(i, `${at(s)}: ${p} fehlt in tiles`).toBeGreaterThanOrEqual(0)
        rest.splice(i, 1)
      }
      expect(rest.length >= 1 && rest.length <= 2, `${at(s)}: ${rest.length} Ablenker`).toBe(true)
      for (const d of rest) expect(s.answer, `${at(s)}: Ablenker ${d} steckt auch in der Lösung`).not.toContain(d)
      expect(s.answer.join(' '), at(s)).toBe(s.dev.replace(/[,।?!]/g, '').replace(/\s+/g, ' ').trim())
      for (const t of s.tiles) expect(isNfc(t), t).toBe(true)
    }
  })
  it('build: jede alsoAccept-Reihenfolge ist eine Umstellung von answer, keine gleich answer', () => {
    const key = a => [...a].sort().join('|')
    for (const s of allSteps.filter(x => x.kind === 'build' && x.alsoAccept !== undefined)) {
      expect(Array.isArray(s.alsoAccept) && s.alsoAccept.length > 0, at(s)).toBe(true)
      const seen = new Set([s.answer.join(' ')])
      for (const alt of s.alsoAccept) {
        expect(key(alt), `${at(s)}: ${alt.join(' ')}`).toBe(key(s.answer))
        expect(seen.has(alt.join(' ')), `${at(s)}: ${alt.join(' ')} doppelt oder gleich answer`).toBe(false)
        seen.add(alt.join(' '))
      }
    }
  })
  it('alle Nepali-Sätze: NFC, romanFits, Aussagen mit ।, Fragen mit ? (Umschrift gleich)', () => {
    for (const s of allSteps) {
      for (const [dev, roman] of pairs(s)) {
        expect(isNfc(dev), `${at(s)}: ${dev}`).toBe(true)
        expect(nonEmpty(roman), `${at(s)}: ${dev} ohne Umschrift`).toBe(true)
        expect(fits(dev, roman), `${at(s)}: ${dev} ≠ ${roman}`).toBe(true)
        if (s.kind === 'intro') continue // einzelnes Wort, kein Satz
        const q = dev.endsWith('?')
        expect(q || dev.endsWith('।'), `${at(s)}: ${dev}`).toBe(true)
        expect(roman.endsWith(q ? '?' : '.'), `${at(s)}: ${roman}`).toBe(true)
      }
    }
  })
})

describe('Kapitelwörter', () => {
  it('CHAPTER_WORD enthält genau die intro-Wörter, Schlüssel NFC, mit Kapitel', () => {
    const intros = CHAPTERS.flatMap(c => c.steps.filter(s => s.kind === 'intro').map(s => ({ ...s, chapter: c.id })))
    expect(Object.keys(CHAPTER_WORD)).toHaveLength(intros.length)
    for (const s of intros) expect(CHAPTER_WORD[nfc(s.dev)]).toEqual({ roman: s.roman, de: s.de, chapter: s.chapter })
    for (const k of Object.keys(CHAPTER_WORD)) expect(isNfc(k), k).toBe(true)
  })
  it('chapterWords liefert die intro-Wörter eines Kapitels', () => {
    expect(chapterWords(CHAPTER_BY_ID.nc1)).toEqual(['भिसा', 'पर्यटक', 'नेपाल', 'पहिलो पटक', 'त्यहाँ'].map(nfc))
    for (const c of CHAPTERS) expect(chapterWords(c)).toEqual(c.steps.filter(s => s.kind === 'intro').map(s => nfc(s.dev)))
  })
  it('kein intro-Wort ist schon Wortblock-, Grammatik- oder Funktionswort oder ein anderes Kapitelwort', () => {
    const grammarWords = new Set([...Object.values(GRAMMAR_NEW_WORDS).flat().map(w => nfc(w.dev)),
      ...Object.values(GRAMMAR_FORMS).flat().map(nfc)])
    const blockParts = new Set(WORD_BLOCKS.flatMap(b => b.words.flatMap(w => [w.dev, ...w.dev.split(' ')])).map(nfc))
    const fw = functionWordSet()
    const seen = new Set()
    for (const s of allSteps.filter(x => x.kind === 'intro')) {
      const d = nfc(s.dev)
      expect(WORD_BY_DEV[d], `${d} ist schon ein Wortblock-Wort`).toBeUndefined()
      for (const p of [d, ...d.split(' ')]) {
        expect(blockParts.has(p), `${d}: ${p} steht schon in einem Wortblock`).toBe(false)
        expect(grammarWords.has(p), `${d}: ${p} bringt schon die Grammatik`).toBe(false)
        expect(fw.has(p), `${d}: ${p} ist ein Funktionswort`).toBe(false)
      }
      expect(seen.has(d), `${d} doppelt`).toBe(false)
      seen.add(d)
    }
  })
  it('jedes intro-Wort kommt danach im selben Kapitel mindestens zweimal wieder vor', () => {
    for (const c of CHAPTERS) {
      c.steps.forEach((s, i) => {
        if (s.kind !== 'intro') return
        const uses = c.steps.slice(i + 1).filter(x => spoken(x).some(t => contains(t, s.dev))).length
        expect(uses, `${c.id}: ${s.dev} nur ${uses}× benutzt`).toBeGreaterThanOrEqual(2)
      })
    }
  })
  it('kein intro-Wort wird im Kapitel vor seinem intro benutzt', () => {
    for (const c of CHAPTERS) {
      c.steps.forEach((s, i) => {
        if (s.kind !== 'intro') return
        for (const x of c.steps.slice(0, i)) {
          for (const t of allNepali(x)) expect(contains(t, s.dev), `${c.id}: ${s.dev} steht schon in „${t}“`).toBe(false)
        }
      })
    }
  })
})

describe('Wortschatz-Disziplin', () => {
  it('jedes Kapitel benutzt nur, was im Pfad vorher eingeführt ist (plus eigene intro-Wörter)', () => {
    const blocks = Object.fromEntries(WORD_BLOCKS.map(b => [b.id, b]))
    const known = functionWordSet()
    for (const n of PROPER_NAMES) known.add(nfc(n))
    const addWord = dev => { for (const p of [dev, ...dev.split(' ')]) known.add(nfc(p)) }
    for (const id of COURSE) {
      if (id.startsWith('nw')) { for (const w of blocks[id].words) addWord(w.dev); continue }
      if (id.startsWith('ng')) {
        for (const f of GRAMMAR_FORMS[id] || []) known.add(nfc(f))
        for (const w of GRAMMAR_NEW_WORDS[id] || []) addWord(w.dev)
        continue
      }
      // Kapitel: Schritt für Schritt – ein intro gilt erst ab seiner Stelle.
      const c = CHAPTER_BY_ID[id]
      expect(c, id).toBeTruthy()
      c.steps.forEach((s, i) => {
        if (s.kind === 'intro') { addWord(s.dev); return }
        for (const t of s.tokens || []) {
          if (t.de) expect(known.has(nfc(t.t)), `${id}#${i}: Token ${t.t} ist hier noch nicht eingeführt`).toBe(true)
        }
        for (const text of allNepali(s)) for (const w of wordsOf(text)) {
          expect(isKnownWord(w, known), `${id}#${i} „${text}“: ${w} ist hier noch nicht eingeführt`).toBe(true)
        }
      })
    }
  })
})

// Grammatik nicht vorwegnehmen: Formen, die ein späteres Thema erst erklärt, sind vorher tabu.
// Die Wortschatz-Prüfung oben fängt das nicht, weil die Nachstellungen und मैले Funktionswörter
// sind (überall „bekannt“). Angehängte Nachstellung → Thema, das sie erklärt:
const SUFFIX_TOPIC = { 'मा': 'ng6', 'बाट': 'ng6', 'को': 'ng7', 'लाई': 'ng8', 'सँग': 'ng8', 'वटा': 'ng10', 'ले': 'ng12' }
// Brocken, die ein Wortblock schon VOR dem Thema als Ganzes lehrt – in Kapiteln erlaubt.
const TAUGHT_CHUNKS = {
  'तपाईंलाई': 'nw1: तपाईंलाई सन्चै छ?',
  // nw1: हो, यो तपाईंको हो। – nc1 benutzt es vor einem Nomen (यो तपाईंको झोला हो?), vor ng7;
  // vom Lektor ausdrücklich abgenommen.
  'तपाईंको': 'nw1: यो तपाईंको हो।',
  'मलाई': 'nw3: धन्यवाद, मलाई चाहिँदैन।',
  'मैले': 'nw1: मैले बुझिनँ।',
}
// Wörter, die nur zufällig wie Stamm + Anhängsel aussehen – sonst gilt die Prüfung auch für
// intro-Wörter (ein Kapitel darf keine Grammatik als „neues Wort“ einschmuggeln).
const COINCIDENTAL = {
  'जम्मा': 'nc3 „insgesamt“ – endet nur zufällig auf ‑मा',
}
// Vergangenheitsformen (ng12): ‑एँ (गएँ, थाकेँ), verneint ‑इनँ (बुझिनँ), ‑यो (भयो, खानुभयो).
const isPast = w => /(ेँ|एँ|िनँ)$/u.test(w) || (w.endsWith('यो') && !['यो', 'त्यो'].includes(w))

describe('Grammatik-Reihenfolge', () => {
  it('keine Nachstellung, Vergangenheit oder ‑नुहोस्-Bitte vor ihrem Thema (außer gelehrten Brocken)', () => {
    const blocks = Object.fromEntries(WORD_BLOCKS.map(b => [b.id, b]))
    const passed = new Set(), blockWords = new Set(), fw = functionWordSet()
    for (const id of COURSE) {
      if (!id.startsWith('nc')) {
        passed.add(id)
        if (id.startsWith('nw')) for (const w of blocks[id].words) for (const p of [w.dev, ...w.dev.split(' ')]) blockWords.add(nfc(p))
        continue
      }
      CHAPTER_BY_ID[id].steps.forEach((s, i) => {
        // Auch das intro-Wort selbst wird geprüft, nicht nur seine Verwendungen.
        const texts = s.kind === 'intro' ? [s.dev] : allNepali(s)
        for (const text of texts) for (const w of wordsOf(text)) {
          const need = Object.entries(SUFFIX_TOPIC)
            .filter(([suf, topic]) => w.length > suf.length && w.endsWith(suf) && !passed.has(topic)).map(([, t]) => t)
          if (!passed.has('ng12') && isPast(w)) need.push('ng12')
          if (!passed.has('ng11') && w.endsWith('नुहोस्')) need.push('ng11')
          const ok = !need.length || w in TAUGHT_CHUNKS || w in COINCIDENTAL || blockWords.has(w) || fw.has(w)
          expect(ok, `${id}#${i} „${text}“: ${w} braucht ${need.join(', ')}`).toBe(true)
        }
      })
    }
  })
  it('die Prüfung greift: Beispiele, die sie melden muss', () => {
    expect(isPast('गएँ') && isPast('बुझिनँ') && isPast('खानुभयो')).toBe(true)
    expect(isPast('यो') || isPast('त्यो') || isPast('मेरो')).toBe(false)
  })
})

describe('ROMAN_EXCEPTIONS', () => {
  it('jede Ausnahme wird noch gebraucht', () => {
    const all = new Set([
      ...allSteps.flatMap(s => pairs(s).map(([d, r]) => `${d}|${r}`)),
      ...allSteps.flatMap(s => (s.tokens || []).filter(t => t.r).map(t => `${t.t}|${t.r}`)),
    ])
    for (const key of Object.keys(ROMAN_EXCEPTIONS)) {
      expect(all.has(key), key).toBe(true)
      const [dev, roman] = key.split('|')
      expect(romanFits(dev, roman), key).toBe(false)
    }
  })
})
