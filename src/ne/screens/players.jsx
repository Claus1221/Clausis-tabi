import { useState, useEffect, useMemo, useRef } from 'react'
import { C, NE } from '../../theme.js'
import { Btn, Card } from '../../components/ui.jsx'
import { XP_PER_KANA, XP_PER_WORD, XP_PER_GRAMMAR } from '../../lib/xp.js'
import { SCRIPT_DATA } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { speak, stopSpeaking, soundAvailable } from '../lib/speech.js'
import { buildScriptQuiz, notesForLesson } from '../lib/scriptQuiz.js'
import { buildWordQuiz } from '../lib/wordQuiz.js'
import { feedbackColor } from '../lib/srs.js'
import { KIND_LABEL, alone } from '../lib/learned.js'
import { wordsBefore } from '../lib/path.js'
import { NE_PATH } from '../data/path.js'
import TraceCanvas from '../components/TraceCanvas.jsx'
import { useSound, usePlayback, ListenButton, NoSoundMark, NO_SOUND_HINT } from '../components/sound.jsx'
import { NeText, TappableSentence, useShowRoman } from '../components/text.jsx'
import { GapDrill } from '../components/GapDrill.jsx'
import { GrammarHead, GrammarExplain, GrammarExamples } from '../components/grammar.jsx'

// ─── Spieler für Yatra-Lektionen ──────────────────────────────────────────────
// Gegenstück zu src/screens/players.jsx. Grundsatz: alles geht ohne Ton (Ton-Bausteine
// in components/sound.jsx). Gelesen wird über die Umschrift.
// ScriptLesson (Schrift), WordBlock (Wörter) und GrammarLesson (Grammatik) teilen Rahmen
// und Abschluss-Muster (LessonFrame, useFinishOnce).

// Ein Zeichen vorstellen: groß, Art, Umschrift, Anhören, Merkhilfe.
// Die Umschrift (roman) steht hier IMMER, unabhängig von settings.showRoman: die Lesung
// ist genau das, was Schrift-Lektionen lehren. Der Schalter gilt erst für Wörter und Sätze.
function ShowStep({ ch, sound }) {
  const d = SCRIPT_DATA[ch]
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textTransform: 'uppercase', marginBottom: 6 }}>
        {KIND_LABEL[d.kind] || 'Zeichen'}
      </div>
      <div style={{ fontSize: 96, fontFamily: NE, color: C.sumi, lineHeight: 1.25 }}>{d.shown}</div>
      {d.shown !== ch && (
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
          allein: <span style={{ fontFamily: NE, fontSize: 22, color: C.sumi }}>{alone(ch)}</span>
        </div>
      )}
      <div style={{ margin: '8px 0 14px' }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Umschrift</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.indigo }}>{d.roman}</div>
      </div>
      <div style={{ marginBottom: 16 }}><ListenButton text={d.say} sound={sound} /></div>
      <div style={{ background: `${C.shu}10`, borderRadius: 10, padding: 12, textAlign: 'left' }}>
        <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.55, margin: 0 }}>💡 <strong style={{ color: C.shu }}>Merkhilfe:</strong> {d.tip}</p>
      </div>
    </div>
  )
}

function TraceStep({ ch }) {
  const d = SCRIPT_DATA[ch]
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 12 }}>
        Male <strong style={{ fontFamily: NE, fontSize: 22, color: C.sumi }}>{d.shown}</strong> nach
        <span style={{ color: C.indigo, fontWeight: 600 }}> · {d.roman}</span>
      </p>
      <TraceCanvas char={d.shown} />
      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Mit Finger, Stift oder Maus – erst langsam, dann aus dem Kopf.</p>
    </div>
  )
}

// Laut-Hinweis (behaucht/unbehaucht, dental/retroflex) mit Hörvergleich der Paare.
// Ohne Ton bleiben die Paare als Schriftvergleich mit Umschrift stehen.
function NoteStep({ note, pairs, sound }) {
  // Paar über playSequence: verlässt man den Schritt während des ersten Lauts, wird
  // der zweite nicht mehr gestartet (Unmount verbraucht das Token).
  const [busy, playKeys] = usePlayback()
  const play = (a, b, key) => playKeys(key, [SCRIPT_DATA[a].say, SCRIPT_DATA[b].say])
  const tile = ch => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 34, fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{SCRIPT_DATA[ch].shown}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.indigo }}>{SCRIPT_DATA[ch].roman}</div>
    </div>
  )
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.shu, marginBottom: 4 }}>LAUT-HINWEIS</div>
      <h3 style={{ fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>{note.title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: C.sumi, margin: '0 0 14px' }}>{note.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {pairs.map(([a, b]) => {
          const key = a + b
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '6px 10px' }}>
              {tile(a)}
              <span style={{ color: C.textMuted, fontSize: 13 }}>oder</span>
              {tile(b)}
              {sound && (
                <button onClick={() => play(a, b, key)} disabled={busy !== null} aria-label={`${a} und ${b} nacheinander anhören`}
                  style={{
                    width: 44, height: 44, flexShrink: 0, borderRadius: 22, fontSize: 18, cursor: busy ? 'default' : 'pointer',
                    background: busy === key ? C.indigo : `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: busy === key ? '#fff' : C.indigo,
                  }}>🔊</button>
              )}
            </div>
          )
        })}
      </div>
      {sound === false && <p style={{ marginTop: 12 }}><NoSoundMark /></p>}
      {sound === true && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>🔊 spielt erst das linke, dann das rechte Zeichen.</p>}
    </div>
  )
}

// Kurzer Check: je lesbares Zeichen eine Frage mit drei Möglichkeiten (lib/scriptQuiz.js
// sorgt dafür, dass nie zwei Optionen gleich lauten).
function QuizStep({ quiz, onFinish }) {
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [right, setRight] = useState(0)
  const cur = quiz[qi]
  const revealed = answer !== null
  const isLast = qi === quiz.length - 1

  const choose = o => {
    if (revealed) return
    setAnswer(o)
    if (o === cur.correct) setRight(r => r + 1)
  }
  const next = () => {
    if (isLast) { onFinish(right); return }
    setQi(qi + 1)
    setAnswer(null)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Kurzer Check · {qi + 1} / {quiz.length}</p>
      <div style={{ fontSize: 84, fontFamily: NE, color: C.sumi, lineHeight: 1.25, marginBottom: 12 }}>{cur.shown}</div>
      <p style={{ marginBottom: 14, fontWeight: 500 }}>{cur.prompt}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const state = !revealed ? 'neutral' : o === cur.correct ? 'correct' : o === answer ? 'wrong' : 'neutral'
          const col = state === 'correct' ? C.matcha : state === 'wrong' ? C.shu : C.washiDark
          return (
            <button key={o} onClick={() => choose(o)} disabled={revealed}
              style={{
                minHeight: 52, padding: '12px 6px', borderRadius: 10, border: `2px solid ${col}`,
                background: state === 'neutral' ? '#fff' : `${col}20`,
                fontSize: 18, fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 14, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig wäre: ${cur.correct}`}
          </p>
          {answer !== cur.correct && (
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginTop: 4 }}>{SCRIPT_DATA[cur.char].tip}</p>
          )}
          <Btn onClick={next} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>
            {isLast ? 'Check abschließen →' : 'Nächstes Zeichen →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// ─── Gemeinsamer Rahmen aller Yatra-Lektionen ────────────────────────────────

// Abschluss-Muster für jede Lektion (Schrift, Wörter, später Grammatik …):
// „… abschließen“ liegt genau dort, wo nach dem Schließen die TabBar erscheint. Ein
// Doppeltipp träfe mit dem zweiten Tipp einen Tab. Daher: erster Tipp sperrt den Knopf,
// geschlossen wird erst nach einer Doppeltipp-Spanne (~350 ms) – bis dahin fängt das noch
// stehende Overlay den zweiten Tipp ab.
// Gebucht wird dagegen SOFORT beim ersten Tipp (onComplete), verzögert ist nur das
// Schließen (onClose): verschwindet die Lektion in der Spanne (Abmelden, Sprachwechsel,
// ✕), geht kein Abschluss verloren – der Timer wird dann nur verworfen.
// → [finishing (für disabled), finish]
function useFinishOnce(onComplete, onClose) {
  const [finishing, setFinishing] = useState(false)
  const finishTimer = useRef(null)
  useEffect(() => () => clearTimeout(finishTimer.current), [])
  // Sperre über die Ref, nicht über den State: zwei Klicks im selben Render-Durchgang
  // sähen beide noch finishing = false und riefen onComplete (XP!) doppelt.
  const locked = useRef(false)
  const finish = () => {
    if (locked.current) return
    locked.current = true
    setFinishing(true)
    onComplete()
    finishTimer.current = setTimeout(onClose, 350)
  }
  return [finishing, finish]
}

// Vollbild-Overlay: Kopf (✕ mit 44 px, Fortschrittsbalken, Schrittzähler, Titel),
// scrollbarer Inhalt, Fußleiste (footer = null → keine, z. B. beim Quiz).
function LessonFrame({ title, step, total, onClose, footer, children }) {
  const pct = Math.round((step / Math.max(1, total - 1)) * 100)
  // Neuer Schritt beginnt oben – sonst bliebe nach einer langen Erklärung die Scroll-
  // Position stehen und der nächste Schritt öffnete mitten im Inhalt.
  const bodyRef = useRef(null)
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [step])
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '8px 16px 10px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onClose} aria-label="Lektion schließen" style={{
            width: 44, height: 44, marginLeft: -10, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
          }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted, minWidth: 40, textAlign: 'right' }}>{step + 1}/{total}</span>
        </div>
        <h3 style={{ fontSize: 14, color: C.indigo, margin: 0 }}>{title}</h3>
      </div>

      <div ref={bodyRef} style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>

      {footer && (
        <div style={{ padding: '14px 20px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// Schrift-Lektion: Einleitung → je Zeichen (zeigen + anhören + Merkhilfe → nachmalen)
// → passende Laut-Hinweise → Quiz → Abschluss mit XP. Vergibt selbst nichts:
// onComplete (Reise-Screen) bucht XP und plant die Zeichen zur Wiederholung ein.
// alreadyDone: Wiederholung einer erledigten Lektion – dann ohne XP-Versprechen.
export function ScriptLesson({ lesson, alreadyDone = false, onComplete, onClose }) {
  const sound = useSound()
  const chars = lesson.chars
  // Quiz einmal je Lektionsstart mischen, sonst springen die Optionen bei jedem Render.
  const quiz = useMemo(() => buildScriptQuiz(chars), [chars])
  const steps = useMemo(() => [
    { kind: 'intro' },
    ...chars.flatMap(ch => [{ kind: 'show', ch }, { kind: 'trace', ch }]),
    ...notesForLesson(lesson.id).map(n => ({ kind: 'note', ...n })),
    ...(quiz.length ? [{ kind: 'quiz' }] : []),
    { kind: 'done' },
  ], [chars, lesson.id, quiz])
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(null)

  // Beim Schritt-Wechsel und beim Schließen nichts weiterreden lassen.
  useEffect(() => () => stopSpeaking(), [step])

  const [finishing, finish] = useFinishOnce(onComplete, onClose)

  const cur = steps[step]
  const xp = chars.length * XP_PER_KANA
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1))

  let content
  if (cur.kind === 'intro') {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <h2 style={{ fontSize: 22, color: C.indigo, marginBottom: 6 }}>{lesson.title}</h2>
        <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 16 }}>{lesson.sub}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {chars.map(ch => (
            <span key={ch} style={{ fontSize: 28, fontFamily: NE, background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 10, padding: '2px 12px', lineHeight: 1.5 }}>
              {SCRIPT_DATA[ch].shown}
            </span>
          ))}
        </div>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          {chars.length} neue Zeichen. Zu jedem siehst du Umschrift und Merkhilfe, dann malst du es nach.
          Am Ende kommt ein kurzer Check.
        </p>
        {sound === false && (
          <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5 }}>
            🔇 {NO_SOUND_HINT}
          </div>
        )}
      </div>
    )
  } else if (cur.kind === 'show') {
    content = <ShowStep key={step} ch={cur.ch} sound={sound} />
  } else if (cur.kind === 'trace') {
    content = <TraceStep key={step} ch={cur.ch} />
  } else if (cur.kind === 'note') {
    content = <NoteStep key={step} note={cur.note} pairs={cur.pairs} sound={sound} />
  } else if (cur.kind === 'quiz') {
    content = <QuizStep quiz={quiz} onFinish={r => { setScore(r); next() }} />
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontFamily: NE, color: C.matcha, marginBottom: 4 }}>धेरै राम्रो!</h2>
        <p style={{ color: C.textMuted, marginBottom: 12 }}>Sehr gut gemacht!</p>
        {alreadyDone ? (
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Schon abgeschlossen – diese Runde bringt keine neuen XP.</p>
        ) : (
          <p style={{ fontSize: 22, fontWeight: 700, color: C.shu, marginBottom: 12 }}>+{xp} XP</p>
        )}
        {score !== null && <p style={{ marginBottom: 8 }}>Check: <strong>{score} / {quiz.length}</strong> richtig</p>}
        <p style={{ lineHeight: 1.6, marginBottom: 14 }}>Diese Zeichen kommen in deinen Wiederholungen wieder:</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {chars.map(ch => (
            <span key={ch} style={{ fontSize: 26, fontFamily: NE, background: `${C.matcha}20`, borderRadius: 10, padding: '2px 12px', lineHeight: 1.5 }}>
              {SCRIPT_DATA[ch].shown}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Fußleiste beim Quiz ausgeblendet: QuizStep hat eigene Knöpfe.
  return (
    <LessonFrame title={lesson.title} step={step} total={steps.length} onClose={onClose}
      footer={cur.kind === 'quiz' ? null : cur.kind === 'done' ? (
        <Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>Lektion abschließen ✓</Btn>
      ) : (
        <Btn onClick={next} style={{ width: '100%', minHeight: 48 }}>{cur.kind === 'intro' ? 'Los geht’s →' : 'Weiter →'}</Btn>
      )}>
      {content}
    </LessonFrame>
  )
}

// ─── Grammatik ────────────────────────────────────────────────────────────────

// Alle Übungen eines Themas als Lückensätze, nacheinander. Falsch beim ersten Versuch →
// die Übung kommt EINMAL am Ende der Lektion wieder (mit neu gemischten Optionen); auch
// ein zweiter Fehler hält die Lektion nicht auf. onFinish(beim ersten Versuch richtig, Anzahl).
function GrammarDrillStep({ topic, sound, onFinish }) {
  const [list, setList] = useState(() => topic.exercises.map(ex => ({ ex, retry: false })))
  const [pos, setPos] = useState(0)
  const [right, setRight] = useState(0)
  const cur = list[pos]

  // GapDrill ruft onDone je Erscheinen genau einmal (eigene Sperre, key je Position) –
  // die Werte aus diesem Render sind also aktuell.
  const done = correct => {
    const nr = right + (correct && !cur.retry ? 1 : 0)
    const nl = !correct && !cur.retry ? [...list, { ...cur, retry: true }] : list
    if (pos + 1 >= nl.length) { onFinish(nr, topic.exercises.length); return }
    setRight(nr)
    setList(nl)
    setPos(pos + 1)
  }

  const last = pos + 1 >= list.length
  const head = (
    <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 10px', textAlign: 'center' }}>
      {cur.retry ? '🔁 Noch einmal' : 'Anwenden'} · {pos + 1} / {list.length}
    </p>
  )
  // key je Position: eine wiederholte Übung ist eine neue Runde (neu gemischt, offen).
  return <GapDrill key={pos} ex={cur.ex} sound={sound} head={head} onDone={done}
    nextLabel={last ? 'Übungen abschließen →' : 'Nächster Satz →'} />
}

// Grammatik-Lektion: Erklärung (mit neuen Wörtern) → Beispiele zum Antippen (Anhören nur
// mit Ton) → alle Übungen als Lückensätze → Abschluss. Vergibt selbst nichts:
// onComplete (Reise-Screen) bucht XP_PER_GRAMMAR und plant die Themen-Karte ein –
// Abschluss-Muster wie ScriptLesson (useFinishOnce). alreadyDone: Wiederholung eines
// erledigten Themas – dann ohne XP-Versprechen.
export function GrammarLesson({ topic, alreadyDone = false, onComplete, onClose }) {
  const sound = useSound()
  const hasDrill = topic.exercises.length > 0
  const steps = useMemo(() => [
    { kind: 'explain' },
    ...(topic.examples.length ? [{ kind: 'examples' }] : []),
    ...(hasDrill ? [{ kind: 'drill' }] : []),
    { kind: 'done' },
  ], [topic, hasDrill])
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(null) // [richtig beim ersten Versuch, Anzahl]
  useEffect(() => () => stopSpeaking(), [step])
  const [finishing, finish] = useFinishOnce(onComplete, onClose)

  const cur = steps[step]
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1))

  let content
  if (cur.kind === 'explain') {
    content = (
      <>
        <GrammarHead topic={topic} />
        <GrammarExplain topic={topic} />
        {sound === false && (
          <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5, marginTop: 14 }}>
            🔇 {NO_SOUND_HINT}
          </div>
        )}
      </>
    )
  } else if (cur.kind === 'examples') {
    content = (
      <>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textAlign: 'center', marginBottom: 4 }}>BEISPIELE</div>
        <p style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', margin: '0 0 12px', lineHeight: 1.5 }}>
          <span style={{ fontFamily: NE, color: C.shu }}>{topic.glyph}</span> im Satz. Tippe ein Wort an, um zu sehen, was es heißt.
        </p>
        <GrammarExamples topic={topic} sound={sound} hint />
      </>
    )
  } else if (cur.kind === 'drill') {
    content = <GrammarDrillStep topic={topic} sound={sound} onFinish={(r, n) => { setScore([r, n]); next() }} />
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontFamily: NE, color: C.matcha, marginBottom: 4 }}>धेरै राम्रो!</h2>
        <p style={{ color: C.textMuted, marginBottom: 12 }}>Sehr gut gemacht!</p>
        {alreadyDone ? (
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Schon abgeschlossen – diese Runde bringt keine neuen XP.</p>
        ) : (
          <p style={{ fontSize: 22, fontWeight: 700, color: C.shu, marginBottom: 12 }}>+{XP_PER_GRAMMAR} XP</p>
        )}
        {score && <p style={{ marginBottom: 8 }}>Beim ersten Versuch richtig: <strong>{score[0]} / {score[1]}</strong></p>}
        <p style={{ lineHeight: 1.6, marginBottom: 10 }}>Dieses Thema kommt in deinen Wiederholungen als Lückensatz wieder:</p>
        <div style={{ display: 'inline-block', background: `${C.matcha}20`, borderRadius: 10, padding: '6px 14px', fontSize: 16, color: C.sumi, lineHeight: 1.5 }}>
          {topic.title}
        </div>
      </div>
    )
  }

  // Fußleiste bei den Übungen ausgeblendet: GapDrill hat eigene Knöpfe.
  return (
    <LessonFrame title={topic.title} step={step} total={steps.length} onClose={onClose}
      footer={cur.kind === 'drill' ? null : cur.kind === 'done' ? (
        <Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>Thema abschließen ✓</Btn>
      ) : (
        <Btn onClick={next} style={{ width: '100%', minHeight: 48 }}>
          {cur.kind === 'explain' ? (steps[1].kind === 'examples' ? 'Zu den Beispielen →' : 'Weiter →') : hasDrill ? 'Zu den Übungen →' : 'Weiter →'}
        </Btn>
      )}>
      {content}
    </LessonFrame>
  )
}

// ─── Wortblock ────────────────────────────────────────────────────────────────

// Ein Wort vorstellen: groß in Devanagari (Umschrift nach Schalter), Bedeutung, Anhören
// (nur mit Ton), Beispielsatz zum Antippen mit Übersetzung.
// hint: Tipp-Hinweis unter dem Satz – nur beim ersten Wort des Blocks.
function WordStep({ word, idx, total, sound, hint }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textAlign: 'center', marginBottom: 4 }}>
        WORT {idx + 1} / {total}
      </div>
      <NeText dev={word.dev} roman={word.roman} size={52} align="center" />
      <div style={{ fontSize: 18, color: C.sumi, textAlign: 'center', margin: '8px 0 12px', lineHeight: 1.45 }}>{word.de}</div>
      {sound !== false && <div style={{ textAlign: 'center', marginBottom: 14 }}><ListenButton text={word.dev} sound={sound} /></div>}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELSATZ</div>
        <TappableSentence dev={word.ex.dev} roman={word.ex.roman} tokens={word.ex.tokens} sound={sound} hint={hint} />
        <div style={{ fontSize: 15, color: C.indigo, marginTop: 8, lineHeight: 1.45 }}>„{word.ex.de}“</div>
      </Card>
    </div>
  )
}

const WORD_PROMPT = {
  meaning: 'Was bedeutet das?',
  word: 'Wie heißt das auf Nepali?',
  listen: 'Welches Wort hast du gehört?',
}

// Quiz am Blockende (Fragen aus lib/wordQuiz.js). Einmal beim Betreten gebaut – mit dem
// Ton-Stand von diesem Moment: Hörfragen gibt es nur, wenn Ton sicher da ist (true, nicht
// „wird geprüft“). Je Hörfrage wird der Ton beim Zeigen neu geprüft: ist er inzwischen weg
// (Stimme entladen, Manifest nicht erreichbar), steht sofort die Bedeutung da und die Frage
// wird zu „Bedeutung sehen → Nepali wählen“ – nie ein Knopf, der nichts tut. Mit Ton lässt
// sich die Bedeutung trotzdem einblenden.
// Nepali-Optionen zeigen immer Devanagari, die Umschrift nur nach Schalter.
function WordQuizStep({ block, earlier, sound, onFinish }) {
  const showRoman = useShowRoman()
  const [quiz] = useState(() => buildWordQuiz(block, { earlier, sound: sound === true }))
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null) // gewählter Index
  const [right, setRight] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false) // Hörfrage: Bedeutung eingeblendet
  const [qSound, setQSound] = useState(null) // Ton-Stand der aktuellen Hörfrage
  const cur = quiz[qi]
  const revealed = answer !== null
  const isLast = qi === quiz.length - 1

  // Hörfrage: Ton prüfen, dann einmal vorlesen – oder ohne Ton die Bedeutung zeigen.
  // Beim Wechsel/Schließen verstummen; eine späte Antwort der Prüfung wirkt nicht mehr.
  useEffect(() => {
    let live = true
    setQSound(null)
    if (cur?.kind === 'listen') {
      soundAvailable().then(ok => {
        if (!live) return
        setQSound(!!ok)
        if (ok) speak(cur.word.dev)
        else setShowMeaning(true)
      })
    }
    return () => { live = false; stopSpeaking() }
  }, [qi]) // eslint-disable-line

  const choose = i => {
    if (revealed) return
    setAnswer(i)
    if (i === cur.correct) setRight(r => r + 1)
  }
  const next = () => {
    if (isLast) { onFinish(right, quiz.length); return }
    setQi(qi + 1)
    setAnswer(null)
    setShowMeaning(false)
  }
  const nepaliOptions = cur.kind !== 'meaning'

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Kurzer Check · {qi + 1} / {quiz.length}</p>
      <Card style={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 12 }}>
        {cur.kind === 'meaning' && <NeText dev={cur.word.dev} roman={cur.word.roman} size={44} align="center" />}
        {cur.kind === 'word' && <div style={{ fontSize: 20, fontWeight: 600, color: C.sumi, lineHeight: 1.4 }}>{cur.word.de}</div>}
        {cur.kind === 'listen' && (
          <>
            {/* Gemeinsamer Anhören-Knopf: prüfen → gesperrt, kein Ton → nichts (quiet). */}
            {qSound !== false && (
              <div style={{ marginBottom: 6 }}><ListenButton key={qi} text={cur.word.dev} sound={qSound} label="Nochmal anhören" quiet /></div>
            )}
            {qSound === false && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}><NoSoundMark /> Gerade kein Ton – wähle nach der Bedeutung:</div>}
            {/* Ausweg, falls der Ton doch nicht kommt: die Bedeutung, nie die Umschrift –
                sonst wäre die Frage nur über die Umschrift lösbar. */}
            {showMeaning ? (
              <div style={{ fontSize: 17, fontWeight: 600, color: C.sumi }}>{cur.word.de}</div>
            ) : !revealed && qSound === true && (
              <button onClick={() => setShowMeaning(true)}
                style={{ minHeight: 44, background: 'none', border: 'none', color: C.indigo, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
                Nichts gehört? Bedeutung zeigen
              </button>
            )}
          </>
        )}
      </Card>
      <p style={{ marginBottom: 12, fontWeight: 500 }}>{WORD_PROMPT[cur.kind === 'listen' && qSound === false ? 'word' : cur.kind]}</p>

      {/* Bedeutungen (oft lang) einspaltig, Nepali-Wörter zweispaltig. */}
      <div style={{ display: 'grid', gridTemplateColumns: nepaliOptions ? '1fr 1fr' : '1fr', gap: 8 }}>
        {cur.options.map((o, i) => {
          const fb = feedbackColor(!revealed ? 'neutral' : i === cur.correct ? 'correct' : i === answer ? 'wrong' : 'neutral')
          return (
            <button key={o.dev} onClick={() => choose(i)} disabled={revealed}
              style={{
                minHeight: 52, padding: '8px 10px', borderRadius: 10, border: `2px solid ${fb.border}`, background: fb.bg,
                color: C.sumi, cursor: revealed ? 'default' : 'pointer', textAlign: 'center',
              }}>
              {nepaliOptions ? (
                <>
                  <span style={{ display: 'block', fontFamily: NE, fontSize: 24, lineHeight: 1.3 }}>{o.dev}</span>
                  {showRoman && <span style={{ display: 'block', fontSize: 12, color: C.indigo }}>{o.roman}</span>}
                </>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{o.de}</span>
              )}
            </button>
          )
        })}
      </div>

      {revealed && (
        <>
          <div style={{ marginTop: 14, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : '✗ Richtig wäre:'}
          </div>
          {/* Nach der Antwort: das Wort ganz – Schrift, Umschrift (nach Schalter), Bedeutung. */}
          <div style={{ marginTop: 6 }}>
            <NeText dev={cur.word.dev} roman={cur.word.roman} size={26} align="center" />
            <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.45 }}>{cur.word.de}</div>
          </div>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>
            {isLast ? 'Check abschließen →' : 'Nächste Frage →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// Wortblock: Einleitung → je Wort vorstellen (mit Beispielsatz) → Quiz → Abschluss mit
// XP. Vergibt selbst nichts: onComplete (Reise-Screen) bucht XP und plant die Wörter
// ein – Abschluss-Muster wie ScriptLesson (useFinishOnce). alreadyDone: Wiederholung
// eines erledigten Blocks – dann ohne XP-Versprechen.
export function WordBlock({ block, alreadyDone = false, onComplete, onClose }) {
  const sound = useSound()
  const words = block.words
  // Ablenker-Vorrat fürs Quiz: Wörter der Wort-Stationen, die im PFAD davor liegen
  // (kleine Blöcke füllen auf) – nicht die Array-Reihenfolge von WORD_BLOCKS.
  const earlier = useMemo(() => wordsBefore(NE_PATH, WORD_BLOCKS, block.id), [block.id])
  // Ein leerer Block (Datenfehler) hätte kein Quiz – dann springt der Ablauf direkt zum Ende.
  const steps = useMemo(() => [
    { kind: 'intro' },
    ...words.map((w, i) => ({ kind: 'word', w, i })),
    ...(words.length ? [{ kind: 'quiz' }] : []),
    { kind: 'done' },
  ], [words])
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(null) // [richtig, gesamt]
  useEffect(() => () => stopSpeaking(), [step])
  const [finishing, finish] = useFinishOnce(onComplete, onClose)

  const cur = steps[step]
  const xp = words.length * XP_PER_WORD
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const chips = bg => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {words.map(w => (
        <span key={w.dev} style={{ fontSize: 20, fontFamily: NE, background: bg, border: `1px solid ${C.washiDark}`, borderRadius: 10, padding: '2px 10px', lineHeight: 1.5 }}>{w.dev}</span>
      ))}
    </div>
  )

  let content
  if (cur.kind === 'intro') {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>{block.theme}</div>
        <h2 style={{ fontSize: 22, color: C.indigo, marginBottom: 8 }}>{block.title}</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          {words.length} Wörter, jedes mit einem kurzen Beispielsatz. Tippe im Satz ein Wort an, um zu
          sehen, was es heißt. Am Ende kommt ein kurzer Check.
        </p>
        {chips('#fff')}
        {sound === false && (
          <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5, marginTop: 16 }}>
            🔇 {NO_SOUND_HINT}
          </div>
        )}
      </div>
    )
  } else if (cur.kind === 'word') {
    content = <WordStep key={step} word={cur.w} idx={cur.i} total={words.length} sound={sound} hint={cur.i === 0} />
  } else if (cur.kind === 'quiz') {
    content = <WordQuizStep block={block} earlier={earlier} sound={sound} onFinish={(r, n) => { setScore([r, n]); next() }} />
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontFamily: NE, color: C.matcha, marginBottom: 4 }}>धेरै राम्रो!</h2>
        <p style={{ color: C.textMuted, marginBottom: 12 }}>Sehr gut gemacht!</p>
        {alreadyDone ? (
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Schon abgeschlossen – diese Runde bringt keine neuen XP.</p>
        ) : (
          <p style={{ fontSize: 22, fontWeight: 700, color: C.shu, marginBottom: 12 }}>+{xp} XP</p>
        )}
        {score && <p style={{ marginBottom: 8 }}>Check: <strong>{score[0]} / {score[1]}</strong> richtig</p>}
        <p style={{ lineHeight: 1.6, marginBottom: 14 }}>Diese Wörter kommen in deinen Wiederholungen wieder:</p>
        {chips(`${C.matcha}20`)}
      </div>
    )
  }

  // Fußleiste beim Quiz ausgeblendet: WordQuizStep hat eigene Knöpfe.
  return (
    <LessonFrame title={`${block.theme} ${block.title}`} step={step} total={steps.length} onClose={onClose}
      footer={cur.kind === 'quiz' ? null : cur.kind === 'done' ? (
        <Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>Block abschließen ✓</Btn>
      ) : (
        <Btn onClick={next} style={{ width: '100%', minHeight: 48 }}>{cur.kind === 'intro' ? 'Los geht’s →' : 'Weiter →'}</Btn>
      )}>
      {content}
    </LessonFrame>
  )
}
