import { useState, useMemo, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { KANA_DATA } from '../data/kana.js'
import { ALL_WORDS } from '../data/words.js'
import { XP_PER_CARD } from '../lib/xp.js'
import { speak, copyText } from '../lib/speech.js'
import { shuffled, feedbackColor } from '../lib/srs.js'
import { HAS_JP } from '../lib/furigana.jsx'
import { Card, Btn } from '../components/ui.jsx'
import { StrokeDisplay, DrawCanvas } from '../components/kana.jsx'
import { WordDetail, TappableSentence } from '../components/japanese.jsx'

// ─── Lesson player ────────────────────────────────────────────────────────────

function QuizStep({ kana, onFinish }) {
  // Quiz einmalig aufbauen: jedes Kana einmal, gemischt, mit stabilen Optionen.
  const [quiz] = useState(() => {
    const pool = [...new Set(kana)]
    const allRomaji = [...new Set(Object.values(KANA_DATA).map(v => v.romaji))]
    return shuffled(pool).map(ch => {
      const correct = KANA_DATA[ch]?.romaji
      let distractors = [...new Set(pool.filter(k => k !== ch).map(k => KANA_DATA[k]?.romaji))]
        .filter(r => r && r !== correct)
      for (const r of shuffled(allRomaji)) {
        if (distractors.length >= 2) break
        if (r !== correct && !distractors.includes(r)) distractors.push(r)
      }
      distractors = shuffled(distractors).slice(0, 2)
      const options = shuffled([correct, ...distractors])
      return { char: ch, correct, options }
    })
  })

  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLastQ = qi === quiz.length - 1
  const revealed = answer !== null

  const next = () => {
    if (isLastQ) { onFinish(); return }
    setQi(qi + 1)
    setAnswer(null)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>
        Kurzer Check · {qi + 1} / {quiz.length}
      </p>
      <div style={{ fontSize: 72, fontFamily: JP, marginBottom: 20, color: C.sumi }}>
        {cur.char}
      </div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Welche Lesung ist richtig?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          const fb = feedbackColor(!revealed ? 'neutral' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'neutral')
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: `2px solid ${fb.border}`,
                background: fb.bg,
                fontSize: 18, fontWeight: 600, color: C.sumi,
                cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig wäre: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLastQ ? 'Quiz abschließen →' : 'Nächstes Zeichen →'}
          </Btn>
        </>
      )}
    </div>
  )
}

export function LessonPlayer({ lesson, onComplete, onClose }) {
  const kana = lesson.kana
  const totalSteps = kana.length * 3 + 2 // intro + (explain+stroke+draw) * n + quiz + done
  const [step, setStep] = useState(0)

  const progress = Math.round((step / totalSteps) * 100)
  const isQuiz = step === totalSteps - 2

  // Determine what to show
  let content = null

  if (step === 0) {
    // Intro
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗾</div>
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.indigo, marginBottom: 8 }}>
          {lesson.title}
        </h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In dieser Lektion lernst du {kana.length} {lesson.script || 'Hiragana'}-Zeichen.
          Jedes Zeichen wird erklärt, du siehst die Strichreihenfolge
          und übst es selbst zu schreiben.
        </p>
        <div style={{ background: `${C.indigo}15`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: C.indigo }}>
            💡 <strong>Lerntipp:</strong> Strichreihenfolge ist wichtig –
            sie macht das Schreiben schneller und natürlicher.
          </p>
        </div>
      </div>
    )
  } else if (step === totalSteps - 1) {
    // Done
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>
          よくできました！
        </h2>
        <p style={{ color: C.textMuted, marginBottom: 4 }}>Sehr gut gemacht!</p>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{kana.length} Zeichen</strong> gelernt und geübt.
          Diese kommen in deinen Wiederholungen wieder.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kana.map(k => (
            <span key={k} style={{
              fontSize: 28, fontFamily: JP,
              background: `${C.matcha}20`, borderRadius: 8, padding: '4px 12px',
            }}>{k}</span>
          ))}
        </div>
      </div>
    )
  } else {
    // Determine which kana and which phase
    const innerStep = step - 1
    const kanaIdx = Math.floor(innerStep / 3)
    const phase = innerStep % 3

    // Quiz step comes before done
    if (step === totalSteps - 2) {
      content = <QuizStep kana={kana} onFinish={() => setStep(s => s + 1)} />
    } else {
      const char = kana[kanaIdx]
      const data = KANA_DATA[char]

      if (phase === 0) {
        // Explain
        content = (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 88, fontFamily: JP,
              color: C.sumi, lineHeight: 1, marginBottom: 12 }}>{char}</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Lesung</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.indigo }}>{data?.romaji}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Aussprache</div>
                <div style={{ fontSize: 14, color: C.sumi }}>wie „{data?.romaji}" im Deutschen</div>
              </div>
            </div>
            <button onClick={() => {
              if ('speechSynthesis' in window) {
                const u = new SpeechSynthesisUtterance(char)
                u.lang = 'ja-JP'
                speechSynthesis.speak(u)
              }
            }} style={{
              background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
              color: C.indigo, marginBottom: 16,
            }}>🔊 Aussprechen</button>
            {data?.tip && (
              <div style={{ background: `${C.shu}10`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 13, color: C.shu }}>💡 Merkhilfe: {data.tip}</p>
              </div>
            )}
          </div>
        )
      } else if (phase === 1) {
        // Stroke order
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Strichreihenfolge für <strong style={{ fontFamily: JP, fontSize: 20 }}>{char}</strong>
            </p>
            <StrokeDisplay char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 10 }}>
              Strichpfade: KanjiVG (CC BY-SA)
            </p>
          </div>
        )
      } else {
        // Draw
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Schreibe <strong style={{ fontFamily: JP, fontSize: 20 }}>{char}</strong> nach
            </p>
            <DrawCanvas char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 8 }}>
              Mit dem Finger oder Stift nachzeichnen
            </p>
          </div>
        )
      }
    }
  }

  const isLast = step === totalSteps - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.washi,
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
          }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: C.shu,
                borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: JP, color: C.indigo }}>
          {lesson.title}
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {content}
      </div>

      {/* Footer – beim Quiz ausgeblendet, da QuizStep eigene Knöpfe hat */}
      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isLast ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>
              Lektion abschließen ✓
            </Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {step === 0 ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Wörter: Block-Lernkurse (5 Wörter pro Block) ────────────────────────────

// Quiz am Ende eines Blocks: Kanji → Bedeutung wählen.
function BlockQuiz({ words, onFinish }) {
  const [quiz] = useState(() => {
    const allDe = [...new Set(ALL_WORDS.map(w => w.de))]
    return shuffled(words).map(w => {
      const distractors = shuffled(allDe.filter(d => d !== w.de)).slice(0, 3)
      return { kanji: w.kanji, kana: w.kana, correct: w.de, options: shuffled([w.de, ...distractors]) }
    })
  })
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLast = qi === quiz.length - 1
  const revealed = answer !== null
  const next = () => { if (isLast) onFinish(); else { setQi(qi + 1); setAnswer(null) } }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Quiz · {qi + 1} / {quiz.length}</p>
      <div style={{ fontSize: 72, fontFamily: JP, marginBottom: 4, color: C.sumi }}>{cur.kanji}</div>
      <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>{cur.kana}</div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Was bedeutet das?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          const fb = feedbackColor(!revealed ? 'neutral' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'neutral')
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: `2px solid ${fb.border}`,
                background: fb.bg,
                fontSize: 15, fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLast ? 'Quiz abschließen →' : 'Nächstes →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// Zeigt für jedes Kanji eines Wortes, woher es kommt (Piktogramm/Ideogramm/

export function BlockCourse({ block, onComplete, onClose }) {
  const words = block.words
  const totalSteps = words.length + 3 // intro + Wörter + Quiz + Abschluss
  const [step, setStep] = useState(0)

  const isIntro = step === 0
  const isQuiz = step === words.length + 1
  const isDone = step === words.length + 2
  const progress = Math.round((step / totalSteps) * 100)

  let content = null
  if (isIntro) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{block.theme}</div>
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.indigo, marginBottom: 8 }}>{block.title}</h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In diesem Block lernst du {words.length} Wörter mit Kanji, Lesung und je einem Beispielsatz.
          Am Ende gibt es ein kurzes Quiz.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {words.map(w => (
            <span key={w.kanji} style={{ fontSize: 28, fontFamily: JP, background: `${C.indigo}12`, borderRadius: 8, padding: '4px 12px' }}>{w.kanji}</span>
          ))}
        </div>
      </div>
    )
  } else if (isQuiz) {
    content = <BlockQuiz words={words} onFinish={() => setStep(s => s + 1)} />
  } else if (isDone) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>Block geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{words.length} Wörter</strong> gelernt. Die Kanji kommen ab jetzt in deinen Wiederholungen vor.
        </p>
      </div>
    )
  } else {
    content = <WordDetail key={words[step - 1].kanji} word={words[step - 1]} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: JP, color: C.indigo }}>{block.theme} {block.title}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isDone ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>Block abschließen ✓</Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {isIntro ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

// BlockPath/GrammarPath (parallele Lernpfade) entfernt — Fortschritt läuft über
// die Reise; „Lernen" ist jetzt eine reine Nachschlage-Bibliothek (s. u.).

// Eine Anwendungs-Übung: Lücke füllen, Lösung wählen, Erklärung sehen.
function GrammarExercise({ ex, idx, total, onNext, isLast }) {
  const { awardXp } = useContext(ProgressCtx)
  const [ans, setAns] = useState(null)
  const revealed = ans != null
  const correct = ans === ex.a
  // Optionen pro Übung einmalig mischen (sonst steht die Lösung immer zuerst).
  const options = useMemo(() => shuffled(ex.options), [ex])

  const choose = (o) => {
    if (revealed) return
    setAns(o)
    if (o === ex.a) awardXp(XP_PER_CARD)
  }

  const shown = revealed ? ex.q.replace('＿', ex.a) : ex.q

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>Anwenden · {idx} / {total}</p>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 1.6, color: C.sumi }}>
          {revealed ? shown : ex.q.split('＿').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && (
              <span style={{ display: 'inline-block', minWidth: 36, borderBottom: `2px solid ${C.shu}`, color: C.shu }}>＿</span>
            )}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {options.map(o => {
          const isCorrect = o === ex.a
          const isChosen = o === ans
          const fb = feedbackColor(!revealed ? 'neutral' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'neutral')
          return (
            <button key={o} onClick={() => choose(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: `2px solid ${fb.border}`,
                background: fb.bg,
                fontSize: HAS_JP.test(o) ? 20 : 14,
                fontFamily: HAS_JP.test(o) ? JP : 'inherit',
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ marginTop: 12, color: correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {correct ? '✓ Richtig!' : `✗ Richtig: ${ex.a}`}
          </p>
          <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 8, fontSize: 13, color: C.sumi }}>
            💡 {ex.hint}
          </div>
          <Btn onClick={onNext} style={{ marginTop: 12, width: '100%' }}>
            {isLast ? 'Übungen abschließen →' : 'Nächste Übung →'}
          </Btn>
        </>
      )}
    </div>
  )
}

export function GrammarLesson({ topic, alreadyDone, onDone, onClose }) {
  const exercises = topic.exercises || []
  const totalSteps = 1 + exercises.length + 1 // Erklärung + Übungen + Abschluss
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)

  const isIntro = step === 0
  const isExercise = step >= 1 && step <= exercises.length
  const isDone = step === totalSteps - 1
  const progress = Math.round((step / (totalSteps - 1)) * 100)

  const clip =
    `Grammatik: ${topic.title}\n\n` +
    topic.body.map(s => (s.h ? `${s.h}: ` : '') + s.text).join('\n') +
    '\n\nBeispiele:\n' +
    topic.examples.map(e => `${e.jp}  (${e.kana})  – „${e.de}"`).join('\n')
  const handleCopy = async () => {
    const ok = await copyText(clip)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  let content = null
  if (isIntro) {
    content = (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
          <h2 style={{ fontSize: 20, color: C.indigo, marginTop: 4 }}>{topic.title}</h2>
        </div>
        {topic.body.map((s, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            {s.h && <div style={{ fontSize: 12, color: C.shu, fontWeight: 700, marginBottom: 2 }}>{s.h}</div>}
            <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}
        <Card style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELE</div>
          {topic.examples.map((ex, i) => <TappableSentence key={i} ex={ex} />)}
        </Card>
        <button onClick={handleCopy}
          style={{
            width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 8,
            border: `1px solid ${copied ? C.matcha : C.washiDark}`,
            background: copied ? `${C.matcha}15` : '#fff',
            color: copied ? C.matcha : C.indigo, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
          {copied ? '✓ Kopiert' : '📋 Thema kopieren'}
        </button>
      </>
    )
  } else if (isExercise) {
    content = (
      <GrammarExercise
        key={step}
        ex={exercises[step - 1]}
        idx={step}
        total={exercises.length}
        isLast={step === exercises.length}
        onNext={() => setStep(s => s + 1)}
      />
    )
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>Geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
          Du hast <strong>{topic.title}</strong> verstanden und angewendet.
        </p>
        <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <h3 style={{ fontSize: 13, fontFamily: JP, color: C.indigo }}>{topic.glyph}</h3>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {!isExercise && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isIntro && exercises.length > 0 ? (
            <Btn onClick={() => setStep(1)} style={{ width: '100%' }}>Anwenden – Übungen starten →</Btn>
          ) : (
            <Btn onClick={onDone} style={{ width: '100%' }} variant={alreadyDone && isIntro ? 'ghost' : 'primary'}>
              {isDone ? 'Verstanden ✓' : alreadyDone ? 'Gelesen ✓ – Schließen' : 'Verstanden ✓'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

