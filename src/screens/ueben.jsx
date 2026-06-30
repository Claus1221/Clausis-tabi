import { useState, useRef, useEffect, useMemo, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { dueKana } from '../useProgress.js'
import { KANA_DATA } from '../data/kana.js'
import { learnedWordKanji } from '../data/words.js'
import { KANJI_ORIGIN } from '../data/kanjiOrigin.js'
import { GRAMMAR, GRAMMAR_GLYPH } from '../data/grammar.js'
import { DIALOGS } from '../data/dialogs.js'
import { XP_PER_CARD, XP_PER_DIALOG } from '../lib/xp.js'
import { completedKanaList } from '../lib/kanaStats.js'
import { speak, speakItem } from '../lib/speech.js'
import { srsItemInfo, SRS_RATINGS, shuffled, buildRounds, feedbackColor } from '../lib/srs.js'
import { dialogGate } from '../lib/dialog.js'
import { MIX_LABEL, buildMixTasks } from '../lib/mix.js'
import { Emoji, Card, Btn } from '../components/ui.jsx'
import { CardNote, KanjiOrigin, TappableJp } from '../components/japanese.jsx'
import { UebenHead, UebenEmpty, UebenDone } from '../components/ueben.jsx'
import { BuildStep } from '../components/BuildStep.jsx'

// Spaced-Repetition-Quiz. Modus 'due' = heute fällige Karten; 'free' = Fleiß-
// Übung über ALLE gelernten Karten (begrenzte Session), auch wenn nichts fällig
// ist. Nur wirklich fällige Karten verschieben dabei den Wiederholungsplan.
function SRSQuiz({ onClose, initialMode = 'due' }) {
  const { progress, awardXp, reviewCard, settings } = useContext(ProgressCtx)

  const learned = [
    ...completedKanaList(progress.completedLessons || []),
    ...learnedWordKanji(progress.completedWordBlocks || []),
  ]
  // Welche Karten sind WIRKLICH heute fällig? Nur diese verschieben den Plan.
  const [dueSet, setDueSet] = useState(() => new Set(dueKana(progress, learned)))

  // Stapel je nach Modus bauen und mischen, damit nicht immer dasselbe Schema
  // (a, e, i, o, u …) abgefragt wird – sonst lernt man die Reihenfolge.
  const buildDeck = (m) => {
    const pool = m === 'free' ? learned : [...dueSet]
    const d = shuffled(pool)
    return m === 'free' ? d.slice(0, settings.freeSize) : d
  }

  const [mode, setMode] = useState(initialMode)
  const [deck, setDeck] = useState(() => buildDeck(initialMode))
  const [queue, setQueue] = useState(deck)   // Arbeits-Warteschlange (kann wachsen)
  const [flipped, setFlipped] = useState(false)
  const [passed, setPassed] = useState(0)    // endgültig gekonnte Karten
  const [lapses, setLapses] = useState(0)    // wie oft „Nochmal"
  const [repeats, setRepeats] = useState(() => new Set()) // welche Karten schon mal daneben

  // Eine Fleiß-Session über alle gelernten Karten starten – auch wenn nichts fällig ist.
  const startFree = () => {
    const d = buildDeck('free')
    setMode('free'); setDeck(d); setQueue(d)
    setPassed(0); setLapses(0); setRepeats(new Set()); setFlipped(false)
  }

  // Leerer Stapel: nichts fällig – oder im Fleiß-Modus noch nichts gelernt.
  if (deck.length === 0) {
    const canFree = mode !== 'free' && learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>
          {mode === 'free' ? 'Noch nichts zu üben' : 'Nichts fällig'}
        </h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {mode === 'free'
            ? 'Lerne erst ein paar Kana oder Wörter auf der Reise – dann kannst du hier nach Lust und Laune üben.'
            : 'Aktuell sind keine Wiederholungen fällig. Du kannst trotzdem zur Übung alle gelernten Karten durchgehen.'}
        </p>
        {canFree && <Btn onClick={startFree} style={{ width: '100%', marginBottom: 8 }}>🔥 Trotzdem üben</Btn>}
        <Btn onClick={onClose} variant={canFree ? 'ghost' : 'primary'} style={{ width: '100%' }}>Zurück</Btn>
      </div>
    )
  }

  if (queue.length === 0) {
    const canMore = learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{mode === 'free' ? '🔥' : '✅'}</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>
          {mode === 'free' ? 'Fleiß-Session geschafft!' : 'Alle fälligen Karten gemeistert!'}
        </h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {passed} Karten · +{passed * XP_PER_CARD} XP
          {lapses > 0 && ` · ${lapses}× wiederholt`}
        </p>
        {canMore && (
          <Btn onClick={startFree} style={{ width: '100%', marginBottom: 8 }}>
            🔥 {mode === 'free' ? 'Noch eine Runde' : 'Weiter üben (Fleiß)'}
          </Btn>
        )}
        <Btn onClick={onClose} variant={canMore ? 'ghost' : 'primary'} style={{ width: '100%' }}>Fertig</Btn>
      </div>
    )
  }

  const item = queue[0]
  const info = srsItemInfo(item)
  const isRepeat = repeats.has(item)

  const rate = (quality) => {
    if (quality < 3) {
      // „Nochmal": Karte ans Ende der Warteschlange – kommt in dieser Sitzung wieder.
      setRepeats(prev => new Set(prev).add(item))
      setQueue(prev => [...prev.slice(1), prev[0]])
      setLapses(l => l + 1)
    } else {
      // „Gekonnt": nur WIRKLICH fällige Karten verschieben den Wiederholungsplan –
      // so bringt Vorab-Üben („Fleiß") den Plan nicht durcheinander. Danach gilt
      // die Karte als erledigt (kein Doppel-Review in einer späteren Fleiß-Runde).
      if (dueSet.has(item)) {
        reviewCard(item, quality)
        setDueSet(prev => { const n = new Set(prev); n.delete(item); return n })
      }
      awardXp(XP_PER_CARD)
      setPassed(p => p + 1)
      setQueue(prev => prev.slice(1))
    }
    setFlipped(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {mode === 'free' && <span style={{ color: '#C2410C', fontWeight: 700 }}>🔥 Fleiß · </span>}
          {passed} / {deck.length} gekonnt · noch {queue.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        {isRepeat && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <button onClick={() => speakItem(item)} title="Anhören"
          style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        <div style={{ fontSize: item.length > 1 ? 52 : 80, fontFamily: JP, marginBottom: 12 }}>{item}</div>
        {flipped ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{info.reading}</div>
            {info.sub && <div style={{ fontSize: 13, color: C.textMuted }}>{info.sub}</div>}
          </>
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14 }}>Tippen zum Aufdecken</div>
        )}
      </Card>

      {flipped && [...item].some(c => KANJI_ORIGIN[c]) && (
        <div style={{ marginBottom: 12 }}>
          <KanjiOrigin jp={item} />
        </div>
      )}

      {flipped && <CardNote itemKey={item} />}

      {!flipped ? (
        <Btn onClick={() => setFlipped(true)} style={{ width: '100%' }} variant="secondary">
          Aufdecken
        </Btn>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {SRS_RATINGS.map(([label, color, q]) => (
            <button key={label} onClick={() => rate(q)}
              style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${color}`,
                background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PracticeQuiz({ mode, onClose }) {
  // mode: 'erkennen' (Zeichen → Lesung) | 'hoeren' (Audio → Zeichen)
  const { progress, awardXp, settings } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => buildRounds(learned, settings.options).slice(0, settings.roundSize))
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  // Bei „Hören" automatisch vorlesen, sobald eine neue Runde erscheint.
  const cur = rounds[idx]
  useEffect(() => {
    if (mode === 'hoeren' && cur) speak(cur.char)
  }, [mode, idx]) // eslint-disable-line

  if (learned.length < 4) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Noch zu wenig gelernt</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          Lerne zuerst ein paar Kana im „Lernen"-Tab – dann kannst du sie hier üben.
        </p>
        <Btn onClick={onClose}>Zurück</Btn>
      </div>
    )
  }

  if (idx >= rounds.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Übung fertig!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {correctCount} / {rounds.length} richtig · +{correctCount * XP_PER_CARD} XP
        </p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const revealed = answer !== null
  const choose = (opt) => {
    if (revealed) return
    setAnswer(opt)
    if (opt === cur.char) { awardXp(XP_PER_CARD); setCorrectCount(c => c + 1) }
  }
  const next = () => { setAnswer(null); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {mode === 'erkennen' ? 'Erkennen' : 'Hören'} · {idx + 1} / {rounds.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Aufgabe */}
      <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        {mode === 'erkennen' ? (
          <>
            <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 4 }}>{cur.char}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welche Lesung?</div>
          </>
        ) : (
          <>
            <button onClick={() => speak(cur.char)}
              style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40,
                width: 80, height: 80, fontSize: 36, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
          </>
        )}
      </Card>

      {/* Optionen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(opt => {
          const isCorrect = opt === cur.char
          const isChosen = opt === answer
          const fb = feedbackColor(!revealed ? 'neutral' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'neutral')
          // Erkennen: Optionen sind Lesungen; Hören: Optionen sind Zeichen.
          const label = mode === 'erkennen' ? KANA_DATA[opt]?.romaji : opt
          return (
            <button key={opt} onClick={() => choose(opt)} disabled={revealed}
              style={{
                padding: '16px 8px', borderRadius: 8, border: `2px solid ${fb.border}`,
                background: fb.bg,
                fontSize: mode === 'erkennen' ? 18 : 28,
                fontFamily: mode === 'erkennen' ? 'inherit' : JP,
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{label}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ textAlign: 'center', marginTop: 12, color: answer === cur.char ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.char ? '✓ Richtig!' : `✗ Richtig: ${cur.char} (${KANA_DATA[cur.char]?.romaji})`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {idx === rounds.length - 1 ? 'Übung abschließen →' : 'Weiter →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// ─── Screens ─────────────────────────────────────────────────────────────────

// Tagesstatus — war früher der „Heute"-Tab, jetzt eingebettet im Kopf der Reise.

// Tippen: Kana ansehen, Lesung (Romaji) per Tastatur eingeben.
function TypeQuiz({ onClose }) {
  const { progress, awardXp, settings } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => shuffled(learned).slice(0, settings.roundSize))
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState('')
  const [res, setRes] = useState(null)
  const [correct, setCorrect] = useState(0)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [idx])

  if (learned.length < 1) return <UebenEmpty onClose={onClose} text="Lerne zuerst ein paar Kana – dann kannst du sie hier tippen." />
  if (idx >= rounds.length) return <UebenDone correct={correct} total={rounds.length} onClose={onClose} />

  const cur = rounds[idx]
  const answer = KANA_DATA[cur]?.romaji
  const revealed = res != null
  const check = () => { if (!val.trim()) return; const ok = val.trim().toLowerCase() === answer; setRes(ok); if (ok) { awardXp(XP_PER_CARD); setCorrect(c => c + 1) } }
  const next = () => { setVal(''); setRes(null); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Tippen" idx={idx} total={rounds.length} onClose={onClose} />
      <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 6 }}>{cur}</div>
        <button onClick={() => speak(cur)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
      </Card>
      <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} disabled={revealed}
        onKeyDown={e => { if (e.key === 'Enter') (revealed ? next() : check()) }}
        placeholder="Lesung tippen (z. B. ka)" autoCapitalize="none" autoCorrect="off"
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 18, borderRadius: 10, textAlign: 'center', border: `2px solid ${feedbackColor(!revealed ? 'neutral' : res ? 'correct' : 'wrong').border}` }} />
      {revealed && (
        <p style={{ textAlign: 'center', marginTop: 12, color: res ? C.matcha : C.shu, fontWeight: 600 }}>
          {res ? '✓ Richtig!' : `✗ Richtig: ${answer}`}
        </p>
      )}
      <Btn onClick={revealed ? next : check} style={{ width: '100%', marginTop: 12 }}>
        {revealed ? (idx === rounds.length - 1 ? 'Fertig →' : 'Weiter →') : 'Prüfen'}
      </Btn>
    </div>
  )
}

// Satzbau: Satz aus Wort-Kacheln bauen (aus gelernten Grammatik-Beispielen).
function SentenceQuiz({ onClose }) {
  const { progress } = useContext(ProgressCtx)
  const done = progress.completedGrammar || []
  const [rounds] = useState(() => {
    const ex = GRAMMAR.filter(g => done.includes(g.id)).flatMap(g => g.examples)
    return shuffled(ex).slice(0, 6).map(e => {
      const ans = e.tokens.map(t => t.t).filter(t => t !== '。' && t !== '！')
      return { prompt: `Bilde: „${e.de}"`, tiles: ans, answer: ans, tr: e.de }
    })
  })
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)

  if (rounds.length === 0) return <UebenEmpty onClose={onClose} text="Lerne zuerst Grammatik – dann kannst du hier Sätze bauen." />
  if (idx >= rounds.length) return <UebenDone total={rounds.length} onClose={onClose} />
  const last = idx === rounds.length - 1

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Satzbau" idx={idx} total={rounds.length} onClose={onClose} />
      <BuildStep key={idx} step={rounds[idx]} onSolved={() => setSolved(true)} />
      {solved && <Btn onClick={() => { setSolved(false); setIdx(i => i + 1) }} style={{ width: '100%', marginTop: 14 }}>{last ? 'Fertig →' : 'Weiter →'}</Btn>}
    </div>
  )
}

function MixQuiz({ onClose }) {
  const { progress, reviewCard, settings } = useContext(ProgressCtx)
  const kana = completedKanaList(progress.completedLessons || [])
  const learnedAll = [...kana, ...learnedWordKanji(progress.completedWordBlocks || [])]
  const sentencePool = GRAMMAR.filter(g => (progress.completedGrammar || []).includes(g.id)).flatMap(g => g.examples)

  const [tasks] = useState(() => buildMixTasks({ kana, learnedAll, sentencePool, settings }))
  // Nur WIRKLICH fällige Karten verschieben den Wiederholungsplan (wie bei „Fleiß").
  const [dueSet, setDueSet] = useState(() => new Set(dueKana(progress, learnedAll)))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)

  if (tasks.length === 0) {
    return <UebenEmpty onClose={onClose} text="Lerne erst ein paar Kana, Wörter oder Grammatik – dann mischt die Wiederholung daraus." />
  }
  if (idx >= tasks.length) {
    return <UebenDone correct={score} total={tasks.length} onClose={onClose} />
  }

  const cardReview = (item, q) => {
    if (dueSet.has(item)) {
      reviewCard(item, q)
      setDueSet(prev => { const n = new Set(prev); n.delete(item); return n })
    }
  }
  const next = (ok) => { if (ok) setScore(s => s + 1); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Gemischt" idx={idx} total={tasks.length} onClose={onClose} />
      <MixStep key={idx} task={tasks[idx]} cardReview={cardReview} onNext={next} />
    </div>
  )
}

// Eine einzelne Aufgabe der gemischten Wiederholung – Rendering je nach Format.
function MixStep({ task, cardReview, onNext }) {
  const { awardXp } = useContext(ProgressCtx)
  const [answer, setAnswer] = useState(null)   // Multiple-Choice
  const [val, setVal] = useState('')           // Tippen-Eingabe
  const [typed, setTyped] = useState(null)      // Tippen-Ergebnis
  const [flipped, setFlipped] = useState(false) // Karteikarte aufgedeckt
  const [built, setBuilt] = useState(null)       // Satzbau-Ergebnis
  const inputRef = useRef(null)

  useEffect(() => {
    // „Hören" wird vorgelesen (das ist die Aufgabe); Karteikarten NICHT – sonst
    // verrät die Aussprache die Lesung, bevor man aufgedeckt hat. 🔊 bleibt manuell.
    if (task.type === 'hoeren') speak(task.char)
    if (task.type === 'tippen') inputRef.current?.focus()
  }, []) // eslint-disable-line

  const chip = (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, marginBottom: 8 }}>
      {MIX_LABEL[task.type]}
    </div>
  )

  // ── Multiple-Choice: Erkennen / Hören ──
  if (task.type === 'erkennen' || task.type === 'hoeren') {
    const revealed = answer !== null
    const choose = (opt) => { if (revealed) return; setAnswer(opt); if (opt === task.char) awardXp(XP_PER_CARD) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
          {task.type === 'erkennen' ? (
            <>
              <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 4 }}>{task.char}</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>Welche Lesung?</div>
            </>
          ) : (
            <>
              <button onClick={() => speak(task.char)}
                style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40, width: 80, height: 80, fontSize: 36, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
              <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
            </>
          )}
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {task.options.map(opt => {
            const isCorrect = opt === task.char
            const isChosen = opt === answer
            const fb = feedbackColor(!revealed ? 'neutral' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'neutral')
            const label = task.type === 'erkennen' ? KANA_DATA[opt]?.romaji : opt
            return (
              <button key={opt} onClick={() => choose(opt)} disabled={revealed}
                style={{
                  padding: '16px 8px', borderRadius: 8, border: `2px solid ${fb.border}`,
                  background: fb.bg,
                  fontSize: task.type === 'erkennen' ? 18 : 28,
                  fontFamily: task.type === 'erkennen' ? 'inherit' : JP,
                  fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
                }}>{label}</button>
            )
          })}
        </div>
        {revealed && (
          <>
            <p style={{ textAlign: 'center', marginTop: 12, color: answer === task.char ? C.matcha : C.shu, fontWeight: 600 }}>
              {answer === task.char ? '✓ Richtig!' : `✗ Richtig: ${task.char} (${KANA_DATA[task.char]?.romaji})`}
            </p>
            <Btn onClick={() => onNext(answer === task.char)} style={{ width: '100%', marginTop: 12 }}>Weiter →</Btn>
          </>
        )}
      </>
    )
  }

  // ── Tippen ──
  if (task.type === 'tippen') {
    const ans = KANA_DATA[task.char]?.romaji
    const revealed = typed !== null
    const check = () => { if (!val.trim()) return; const ok = val.trim().toLowerCase() === ans; setTyped(ok); if (ok) awardXp(XP_PER_CARD) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 6 }}>{task.char}</div>
          <button onClick={() => speak(task.char)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        </Card>
        <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} disabled={revealed}
          onKeyDown={e => { if (e.key === 'Enter') (revealed ? onNext(typed) : check()) }}
          placeholder="Lesung tippen (z. B. ka)" autoCapitalize="none" autoCorrect="off"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 18, borderRadius: 10, textAlign: 'center', border: `2px solid ${feedbackColor(!revealed ? 'neutral' : typed ? 'correct' : 'wrong').border}` }} />
        {revealed && (
          <p style={{ textAlign: 'center', marginTop: 12, color: typed ? C.matcha : C.shu, fontWeight: 600 }}>
            {typed ? '✓ Richtig!' : `✗ Richtig: ${ans}`}
          </p>
        )}
        <Btn onClick={revealed ? () => onNext(typed) : check} style={{ width: '100%', marginTop: 12 }}>
          {revealed ? 'Weiter →' : 'Prüfen'}
        </Btn>
      </>
    )
  }

  // ── Karteikarte (Selbstbewertung wie im SRS) ──
  if (task.type === 'karte') {
    const info = srsItemInfo(task.item)
    const rate = (q) => { cardReview(task.item, q); if (q >= 3) awardXp(XP_PER_CARD); onNext(q >= 3) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => speakItem(task.item)} title="Anhören"
            style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
          <div style={{ fontSize: task.item.length > 1 ? 52 : 80, fontFamily: JP, marginBottom: 12 }}>{task.item}</div>
          {flipped ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{info.reading}</div>
              {info.sub && <div style={{ fontSize: 13, color: C.textMuted }}>{info.sub}</div>}
            </>
          ) : (
            <div style={{ color: C.textMuted, fontSize: 14 }}>Tippen zum Aufdecken</div>
          )}
        </Card>
        {flipped && [...task.item].some(c => KANJI_ORIGIN[c]) && (
          <div style={{ marginBottom: 12 }}>
            <KanjiOrigin jp={task.item} />
          </div>
        )}
        {flipped && <CardNote itemKey={task.item} />}
        {!flipped ? (
          <Btn onClick={() => setFlipped(true)} style={{ width: '100%' }} variant="secondary">Aufdecken</Btn>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {SRS_RATINGS.map(([label, color, q]) => (
              <button key={label} onClick={() => rate(q)}
                style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${color}`, background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </>
    )
  }

  // ── Satzbau (renutzt BuildStep) ──
  return (
    <>
      {chip}
      <BuildStep step={task.step} onSolved={(ok) => setBuilt(!!ok)} />
      {built !== null && <Btn onClick={() => onNext(built)} style={{ width: '100%', marginTop: 14 }}>Weiter →</Btn>}
    </>
  )
}

function DialogHub({ onClose }) {
  const { progress, completeDialog } = useContext(ProgressCtx)
  const done = progress.completedDialogs || []
  const [active, setActive] = useState(null)

  const steps = DIALOGS.filter(n => !n.section)

  if (active) {
    const node = DIALOGS.find(n => n.id === active)
    return <DialogPlay node={node} alreadyDone={done.includes(active)}
      onComplete={() => completeDialog(active, XP_PER_DIALOG)}
      onClose={() => setActive(null)} />
  }

  const doneCount = steps.filter(s => done.includes(s.id)).length

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 10 }}>← Üben</button>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, margin: '0 0 4px' }}>会話の道 · Gesprächspfad</h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Echte Reise-Situationen. {doneCount}/{steps.length} gemeistert – eine Szene öffnet sich, sobald ihre Wörter & Grammatik in der Reise dran kamen.
      </p>
      {DIALOGS.map((n, i) => {
        if (n.section) return (
          <div key={`s${i}`} style={{ margin: '18px 0 8px' }}>
            <div style={{ fontSize: 16, fontFamily: JP, color: C.sumi }}>{n.section}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{n.sub}</div>
          </div>
        )
        const isDone = done.includes(n.id)
        const gate = dialogGate(n, progress, done)
        const si = steps.findIndex(s => s.id === n.id)
        const prevDone = si <= 0 || done.includes(steps[si - 1].id)
        const open = isDone || (gate.open && prevDone)
        const need = [...gate.missGrammar.map(g => GRAMMAR_GLYPH[g] || g), ...gate.missVocab]
        const lockHint = !gate.open ? `Erst in der Reise lernen: ${need.slice(0, 5).join(' · ')}`
          : !prevDone ? 'Vorige Szene zuerst abschließen' : null
        return (
          <button key={n.id} onClick={() => open && setActive(n.id)} disabled={!open}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              background: '#fff', border: `2px solid ${isDone ? `${C.matcha}55` : open ? C.washiDark : C.washiDark}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: open ? 1 : 0.5,
              cursor: open ? 'pointer' : 'default', boxShadow: '0 1px 3px rgba(33,31,27,0.06)' }}>
            <div style={{ position: 'relative' }}>
              <Emoji name={n.emoji} size={36} style={{ filter: open ? 'none' : 'grayscale(1)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.sumi }}>{n.title}{n.review && <span style={{ fontWeight: 400, fontSize: 11, color: C.textMuted }}> · Mix</span>}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{n.goal}</div>
              {!open && lockHint && (
                <div style={{ fontSize: 11, color: C.shu, marginTop: 3, fontFamily: JP }}>🔒 {lockHint}</div>
              )}
            </div>
            <div style={{ fontSize: 18 }}>{isDone ? '✓' : open ? '›' : '🔒'}</div>
          </button>
        )
      })}
    </div>
  )
}

// Spielt eine Gesprächs-Szene: Kontext-Intro → Wechsel mit verblassenden Hilfen.
function DialogPlay({ node, alreadyDone, onComplete, onClose }) {
  const { awardXp } = useContext(ProgressCtx)
  const [turns] = useState(() => {
    if (node.review) {
      const pool = node.from.flatMap(id => DIALOGS.find(d => d.id === id)?.turns || [])
      return shuffled(pool).slice(0, 5)
    }
    return node.turns
  })
  const scaffold = node.review ? 'mittel' : node.scaffold
  const [phase, setPhase] = useState('intro')
  const [turn, setTurn] = useState(0)
  const [ans, setAns] = useState(null)
  const [score, setScore] = useState(0)
  // Antwortoptionen pro Zug einmalig mischen (sonst steht die richtige zuerst).
  const options = useMemo(() => shuffled(turns[turn]?.options || []), [turns, turn])

  useEffect(() => { if (phase === 'done' && !alreadyDone) onComplete() }, [phase])
  // NPC-Zeile beim Erscheinen vorlesen (Hören-zuerst).
  useEffect(() => { if (phase === 'play') speak(turns[turn]?.npc) }, [phase, turn])

  if (phase === 'intro') {
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={node.title} idx={0} total={turns.length} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '24px 18px' }}>
          <Emoji name={node.emoji} size={64} />
          <p style={{ fontSize: 13, color: C.textMuted, margin: '14px 0 2px', letterSpacing: 1 }}>SITUATION</p>
          <p style={{ fontWeight: 600, fontSize: 17, color: C.sumi, margin: 0 }}>{node.goal}</p>
        </Card>
        <Btn onClick={() => setPhase('play')} style={{ width: '100%', marginTop: 16 }}>Los geht's →</Btn>
      </div>
    )
  }
  if (phase === 'done') {
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={node.title} idx={turns.length} total={turns.length} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '28px 18px' }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <p style={{ fontWeight: 600, fontSize: 18, color: C.sumi, margin: '8px 0 2px' }}>Szene gemeistert!</p>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {score} / {turns.length} passend{!alreadyDone && ` · +${XP_PER_DIALOG} XP`}
          </p>
        </Card>
        <Btn onClick={onClose} style={{ width: '100%', marginTop: 16 }}>Zurück zum Pfad →</Btn>
      </div>
    )
  }

  const t = turns[turn]
  const revealed = ans != null
  const showDe = scaffold === 'voll' || revealed
  const choose = (o) => { if (revealed) return; setAns(o); speak(o); if (o === t.answer) { awardXp(XP_PER_CARD); setScore(s => s + 1) } }
  const next = () => { if (turn === turns.length - 1) { setPhase('done'); return } setAns(null); setTurn(x => x + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title={node.title} idx={turn} total={turns.length} onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <Emoji name={node.emoji} size={48} />
        <div style={{ background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '10px 14px', flex: 1 }}>
          <TappableJp text={t.npc} size={19} hint />
          {showDe && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>„{t.de}"</div>}
          <button onClick={() => speak(t.npc)} style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', padding: '2px 0 0', color: C.textMuted }}>🔊 nochmal hören</button>
        </div>
      </div>
      <p style={{ fontWeight: 500, marginBottom: 12 }}>Was antwortest du?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {options.map(o => {
          const correct = o === t.answer, chosen = o === ans
          const fb = feedbackColor(!revealed ? 'neutral' : correct ? 'correct' : chosen ? 'wrong' : 'neutral')
          return (
            <button key={o} onClick={() => choose(o)} disabled={revealed}
              style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${fb.border}`,
                background: fb.bg,
                fontSize: 17, fontFamily: JP, color: C.sumi, cursor: revealed ? 'default' : 'pointer', textAlign: 'left' }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, fontWeight: 600, color: ans === t.answer ? C.matcha : C.shu }}>
            {ans === t.answer ? '✓ Gute Antwort!' : '✗ Passt nicht ganz'}
            <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted, marginTop: 2 }}>NPC: „{t.de}"</span>
          </p>
          <div style={{ background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>RICHTIGE ANTWORT · WÖRTER ANTIPPEN</div>
            <TappableJp text={t.answer} size={18} />
          </div>
          <Btn onClick={next} style={{ width: '100%', marginTop: 12 }}>{turn === turns.length - 1 ? 'Fertig →' : 'Weiter →'}</Btn>
        </>
      )}
    </div>
  )
}

export default function UebenScreen({ initialMode, onConsumeInitial }) {
  const { progress } = useContext(ProgressCtx)
  const [mode, setMode] = useState(initialMode || null)
  // einmaligen Deep-Link (z. B. „Wiederholen" aus Reise/Fortschritt) verbrauchen
  useEffect(() => { if (initialMode) onConsumeInitial?.() }, [])

  if (mode === 'mix') return <MixQuiz onClose={() => setMode(null)} />
  if (mode === 'srs') return <SRSQuiz onClose={() => setMode(null)} />
  if (mode === 'fleiss') return <SRSQuiz initialMode="free" onClose={() => setMode(null)} />
  if (mode === 'erkennen' || mode === 'hoeren') return <PracticeQuiz mode={mode} onClose={() => setMode(null)} />
  if (mode === 'tippen') return <TypeQuiz onClose={() => setMode(null)} />
  if (mode === 'satzbau') return <SentenceQuiz onClose={() => setMode(null)} />
  if (mode === 'konversation') return <DialogHub onClose={() => setMode(null)} />

  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const dueCount = dueKana(progress, learnedAll).length
  const dialogsDone = (progress.completedDialogs || []).length

  // Fällig-Banner: direkter Sprung in den SRS-Quiz im "due"-Modus (Standard von
  // SRSQuiz). Zahl kommt aus demselben dueKana-Mechanismus wie DailyStrip auf der
  // Reise – damit stimmt sie exakt mit der dortigen Anzeige überein.
  const dueBanner = dueCount > 0 ? (
    <button onClick={() => setMode('srs')} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      background: `${C.shu}12`, border: `2px solid ${C.shu}40`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 16, cursor: 'pointer',
    }}>
      <span style={{ fontSize: 26 }}>🎯</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: C.shu }}>{dueCount} Karten fällig</span>
        <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>Jetzt wiederholen, bevor sie aus dem Kopf rutschen</span>
      </span>
      <span style={{ fontSize: 18, color: C.shu }}>›</span>
    </button>
  ) : (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 26 }}>✅</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: C.sumi }}>Alles erledigt</span>
        <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>Aktuell ist nichts zur Wiederholung fällig</span>
      </span>
    </Card>
  )

  const exercises = [
    { id: 'mix', icon: '🎲', title: 'Gemischte Wiederholung', sub: 'Alle Übungsarten bunt gemischt', color: C.indigo },
    { id: 'srs', icon: '🗂', title: 'SRS-Wiederholungen', sub: dueCount > 0 ? `${dueCount} Karten fällig` : 'Nichts fällig', color: C.shu },
    { id: 'fleiss', icon: '🔥', title: 'Fleiß-Übung', sub: 'Alle Karten, jederzeit', color: '#C2410C' },
    { id: 'erkennen', icon: '👁', title: 'Erkennen', sub: 'Zeichen → Lesung', color: C.indigo },
    { id: 'hoeren', icon: '👂', title: 'Hören', sub: 'Was hast du gehört?', color: C.matcha },
    { id: 'tippen', icon: '⌨️', title: 'Tippen', sub: 'Kana per Tastatur', color: '#8B6914' },
    { id: 'satzbau', icon: '🧩', title: 'Satzbau', sub: 'Wörter sortieren', color: '#7B3FA0' },
    { id: 'konversation', icon: '💬', title: 'Rollenspiel', sub: `Gesprächspfad · ${dialogsDone}/${DIALOGS.filter(n => !n.section).length}`, color: '#1A7A6E' },
  ]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
        Üben
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Wähle einen Übungstyp</p>

      {dueBanner}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {exercises.map(e => (
          <button key={e.id} onClick={() => setMode(e.id)}
            style={{
              background: '#fff', border: `2px solid ${e.color}20`,
              borderRadius: 12, padding: '14px 12px', textAlign: 'left',
              cursor: 'pointer',
            }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{e.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi, marginBottom: 2 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{e.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

