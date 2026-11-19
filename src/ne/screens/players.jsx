import { useState, useEffect, useMemo } from 'react'
import { C, NE } from '../../theme.js'
import { Btn } from '../../components/ui.jsx'
import { XP_PER_KANA } from '../../lib/xp.js'
import { SCRIPT_DATA } from '../data/script.js'
import { speak, stopSpeaking, soundAvailable } from '../lib/speech.js'
import { buildScriptQuiz, notesForLesson } from '../lib/scriptQuiz.js'
import TraceCanvas from '../components/TraceCanvas.jsx'

// ─── Spieler für Yatra-Lektionen ──────────────────────────────────────────────
// Gegenstück zu src/screens/players.jsx. Grundsatz: alles geht ohne Ton. Heute gibt
// es auf den meisten Geräten keinen Nepali-Ton (kein Studio-Audio, selten eine
// Nepali-Stimme) – jeder Anhören-Knopf ist dann ausgeblendet bzw. sichtbar gesperrt
// mit kurzem Hinweis, nie ein Knopf, der nichts tut. Gelesen wird über die Umschrift.

const KIND_LABEL = {
  vowel: 'Vokal', consonant: 'Konsonant', matra: 'Vokalzeichen',
  conjunct: 'Verbindung', sign: 'Zusatzzeichen', digit: 'Ziffer',
}
// Kombinierende Zeichen (ा, ं …) allein zeigt man auf dem Platzhalterkreis ◌.
const alone = ch => (/^[ऀ-ःऺ-ॏ॑-ॗॢॣ]/.test(ch) ? '◌' + ch : ch)

// null = wird noch geprüft, dann true/false. soundAvailable lehnt nie ab und hängt nie.
function useSound() {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    let live = true
    soundAvailable().then(v => { if (live) setOk(!!v) })
    return () => { live = false }
  }, [])
  return ok
}

const NO_SOUND_HINT = 'Auf diesem Gerät gibt es noch keinen Nepali-Ton – die Umschrift zeigt dir die Aussprache.'

// Anhören-Knopf mit drei Zuständen: prüfen (gesperrt), kein Ton (Hinweis statt Knopf),
// Ton (Knopf, solange gesprochen wird als „spricht…“ markiert).
function ListenButton({ text, sound, label = 'Anhören' }) {
  const [busy, setBusy] = useState(false)
  if (sound === false) return <p style={{ fontSize: 12, color: C.textMuted, margin: '0 auto', maxWidth: 280, lineHeight: 1.5 }}>🔇 {NO_SOUND_HINT}</p>
  const checking = sound === null
  return (
    <button disabled={checking || busy}
      onClick={() => { setBusy(true); speak(text).then(() => setBusy(false)) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
        background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo,
        borderRadius: 22, padding: '8px 18px', fontSize: 14, cursor: checking ? 'default' : 'pointer',
        opacity: checking ? 0.55 : 1,
      }}>
      🔊 {checking ? 'Ton wird geprüft…' : busy ? 'spricht…' : label}
    </button>
  )
}

// Ein Zeichen vorstellen: groß, Art, Umschrift, Anhören, Merkhilfe.
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
  const [busy, setBusy] = useState(null)
  const play = (a, b, key) => {
    setBusy(key)
    speak(SCRIPT_DATA[a].say).then(() => speak(SCRIPT_DATA[b].say)).then(() => setBusy(null))
  }
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
      {sound === false && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>🔇 {NO_SOUND_HINT}</p>}
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

  const cur = steps[step]
  const xp = chars.length * XP_PER_KANA
  const pct = Math.round((step / (steps.length - 1)) * 100)
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
          <span style={{ fontSize: 12, color: C.textMuted, minWidth: 40, textAlign: 'right' }}>{step + 1}/{steps.length}</span>
        </div>
        <h3 style={{ fontSize: 14, color: C.indigo, margin: 0 }}>{lesson.title}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {/* Beim Quiz ausgeblendet: QuizStep hat eigene Knöpfe. */}
      {cur.kind !== 'quiz' && (
        <div style={{ padding: '14px 20px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {cur.kind === 'done' ? (
            <Btn onClick={onComplete} style={{ width: '100%', minHeight: 48 }}>Lektion abschließen ✓</Btn>
          ) : (
            <Btn onClick={next} style={{ width: '100%', minHeight: 48 }}>{cur.kind === 'intro' ? 'Los geht’s →' : 'Weiter →'}</Btn>
          )}
        </div>
      )}
    </div>
  )
}
