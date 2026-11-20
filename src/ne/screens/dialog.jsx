import { useState, useEffect, useMemo, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { Btn, Card } from '../../components/ui.jsx'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { XP_PER_DIALOG } from '../../lib/xp.js'
import { DIALOGS } from '../data/dialogs.js'
import { stopSpeaking } from '../lib/speech.js'
import { shuffle } from '../lib/scriptQuiz.js'
import { choiceState } from '../lib/choice.js'
import {
  dialogGate, sceneOpen, explainMissing, warmupPhrases, warmupOptions, startWarmup, answerWarmup, warmupDone, firstTryScore,
  bookDialog,
} from '../lib/dialog.js'
import { useSound, ListenButton, NoSoundBanner } from '../components/sound.jsx'
import { NeText, TappableSentence } from '../components/text.jsx'
import { Choice, ChoiceGrid } from '../components/Choice.jsx'
import { LessonFrame, LessonDone, useFinishOnce, useOnce, stepLabel as label } from '../components/lesson.jsx'

// ─── Gesprächs-Szenen: Spieler und Übersicht ──────────────────────────────────
// Gegenstück zu DialogPlay/SceneWarmup in src/screens/players.jsx und DialogHub in
// src/screens/ueben.jsx – ohne Spracherkennung, ohne Hilfe-Stufen, ohne KI: geantwortet
// wird immer durch Antippen. Ablauf: Einleitung → Aufwärmen (alle Sätze zeigen, dann jeden
// einmal abfragen) → Szene (Zug für Zug) → Abschluss.
//
// Ohne Ton voll spielbar: die NPC-Zeile steht IMMER geschrieben da (Anhören nur mit Ton),
// es gibt keine Hör-Aufgabe. Umschrift nur mit settings.showRoman, und nie ist etwas NUR
// in Umschrift zu sehen. Die Übersetzung der NPC-Zeile und die Bedeutung der Optionen kommen
// erst nach der richtigen Antwort – vorher wären sie die Lösung (die Wörter der Zeile lassen
// sich antippen). Eine falsche Antwort zeigt nur IHRE Bedeutung als kurze Erklärung, dann
// versucht man es noch einmal.

// Aufwärmen, Teil 1: alle Sätze auf einen Blick – Nepali (Wörter antippbar), Umschrift nach
// Schalter, Bedeutung, Anhören nur mit Ton. Neue Wendungen der Szene stehen zuerst und sind
// als „neu“ markiert (der Kurs hat sie bis hierher nicht gelehrt).
function WarmupList({ list, fresh, sound }) {
  return (
    <div>
      {label('DAS BRAUCHST DU GLEICH')}
      <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.55, margin: '0 0 12px', textAlign: 'center' }}>
        Lies dir die Sätze in Ruhe durch und tippe Wörter an, die du nicht mehr weißt. Gleich fragen wir jeden einmal ab.
      </p>
      <Card>
        {list.map((p, i) => (
          <div key={p.dev} style={{ paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? `1px solid ${C.washiDark}` : 'none' }}>
            {i < fresh && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.shu, marginBottom: 2 }}>NEU</div>}
            {p.tokens ? (
              <TappableSentence dev={p.dev} roman={p.roman} tokens={p.tokens} size={22} sound={sound} hint={i === fresh} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}><NeText dev={p.dev} roman={p.roman} size={22} /></div>
                {sound && <ListenButton text={p.dev} sound={sound} quiet label="" ariaLabel={`Anhören: ${p.dev}`} />}
              </div>
            )}
            <div style={{ fontSize: 14, color: C.indigo, marginTop: 4, lineHeight: 1.45 }}>„{p.de}“</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// Aufwärmen, Teil 2: eine Abfrage „Wie sagst du das?“ – deutsche Bedeutung, drei
// Nepali-Wendungen derselben Szene. Optionen einmal je Erscheinen gemischt.
function WarmupQuestion({ list, idx, again, sound, onDone, nextLabel }) {
  const [options] = useState(() => warmupOptions(list, idx))
  const [picked, setPicked] = useState(null)
  const done = useOnce(onDone)
  const right = list[idx]
  const revealed = picked !== null
  const ok = picked === right.dev
  const byDev = dev => list.find(p => p.dev === dev)
  return (
    <div>
      {label('WIE SAGST DU DAS?')}
      <Card style={{ marginBottom: 12, textAlign: 'center', position: 'relative' }}>
        {again && <div style={{ fontSize: 11, color: C.shu, fontWeight: 600, marginBottom: 2 }}>🔁 nochmal</div>}
        <div style={{ fontSize: 18, fontWeight: 600, color: C.sumi, lineHeight: 1.45 }}>„{right.de}“</div>
      </Card>
      {/* Nur die falsch gewählte Wendung zeigt ihre Bedeutung – als kurze Erklärung. */}
      <ChoiceGrid>
        {options.map(o => (
          <Choice key={o} dev={o} roman={byDev(o).roman} de={byDev(o).de} showDe={revealed && o === picked && !ok} align="left"
            state={choiceState(o, picked, right.dev)} disabled={revealed} onClick={() => setPicked(o)} />
        ))}
      </ChoiceGrid>
      {revealed && (
        <>
          <p style={{ margin: '14px 0 0', fontWeight: 600, color: ok ? C.matcha : C.shu }}>
            {ok ? '✓ Genau so.' : '✗ Noch nicht – der Satz kommt gleich noch einmal.'}
          </p>
          {sound && <div style={{ marginTop: 8 }}><ListenButton text={right.dev} sound={sound} quiet label="Anhören" /></div>}
          <Btn onClick={() => done(ok)} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel(ok)}</Btn>
        </>
      )}
    </div>
  )
}

// Ein Zug der Szene. Falsch → Option rot und gesperrt, ihre Bedeutung steht darin, darunter
// „… passt hier nicht. Versuch es noch einmal.“; die übrigen bleiben antippbar. Richtig → alles aufgelöst, Weiter ruft
// onDone(beimErstenMal?) genau einmal.
function TurnStep({ turn, emoji, sound, hint, onDone, nextLabel }) {
  const [options] = useState(() => shuffle(turn.options))
  const [wrong, setWrong] = useState([])
  const [solved, setSolved] = useState(false)
  const done = useOnce(onDone)
  useEffect(() => () => stopSpeaking(), [])
  const pick = o => {
    if (solved || wrong.includes(o)) return
    if (o === turn.answer) setSolved(true)
    else setWrong(w => [...w, o])
  }
  const last = wrong[wrong.length - 1]
  return (
    <div>
      {turn.npc ? (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">{emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>Man sagt zu dir:</div>
              <TappableSentence dev={turn.npc} roman={turn.npcRoman} tokens={turn.npcTokens} size={24} sound={sound} hint={hint} />
              {solved && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6, lineHeight: 1.45 }}>„{turn.de}“</div>}
            </div>
          </div>
        </Card>
      ) : (
        // Du fängst an: die Regieanweisung ist die Lage, nicht die Lösung – sie steht sofort da.
        <div style={{ background: `${C.indigo}0D`, border: `1px solid ${C.indigo}30`, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15, color: C.sumi, lineHeight: 1.5 }}>
          🎬 {turn.de}
        </div>
      )}
      <p style={{ margin: '0 0 12px', fontWeight: 500, textAlign: 'center' }}>{turn.npc ? 'Was antwortest du?' : 'Was sagst du?'}</p>
      {/* Hier darf man weiterprobieren: Zustand je Option statt choiceState (eine Wahl). */}
      <ChoiceGrid>
        {options.map(o => {
          const meta = turn.optionsMeta[o] || {}
          const isWrong = wrong.includes(o)
          return (
            <Choice key={o} dev={o} roman={meta.roman} de={meta.de} showDe={solved || isWrong} align="left"
              state={o === turn.answer && solved ? 'correct' : isWrong ? 'wrong' : 'neutral'}
              disabled={solved || isWrong} onClick={() => pick(o)} />
          )
        })}
      </ChoiceGrid>
      {!solved && last && (
        <p role="status" style={{ margin: '12px 0 0', fontSize: 14, color: C.shu, lineHeight: 1.5 }}>
          ✗ „{turn.optionsMeta[last]?.de}“ passt hier nicht. Versuch es noch einmal.
        </p>
      )}
      {solved && (
        <>
          <p style={{ margin: '14px 0 0', fontWeight: 600, color: C.matcha }}>
            {wrong.length ? '✓ Jetzt passt es.' : '✓ Genau richtig!'}
          </p>
          {sound && <div style={{ marginTop: 8 }}><ListenButton text={turn.answer} sound={sound} quiet label="Antwort anhören" /></div>}
          <Btn onClick={() => done(wrong.length === 0)} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel}</Btn>
        </>
      )}
    </div>
  )
}

// Die Szene als Vollbild. Vergibt selbst nichts: onComplete (Reise bzw. Üben) bucht
// completedDialogs und beim ersten Mal XP – Abschluss-Muster wie alle Lektionen
// (useFinishOnce). alreadyDone: Wiederholung – ohne XP-Versprechen, Aufwärmen überspringbar.
export function DialogPlay({ dialog, alreadyDone = false, onComplete, onClose }) {
  const sound = useSound()
  const list = useMemo(() => warmupPhrases(dialog), [dialog])
  const fresh = (dialog.newPhrases || []).length
  const turns = dialog.turns
  const [phase, setPhase] = useState('start') // start | list | quiz | play | done
  const [wq, setWq] = useState(() => startWarmup(list.length))
  const [asked, setAsked] = useState(0) // gestellte Abfragen – key, damit jede neu mischt
  const [missed, setMissed] = useState([]) // Wendungen, die schon einmal daneben gingen
  const [turn, setTurn] = useState(0)
  const [results, setResults] = useState({}) // Zug → beim ersten Antippen richtig?
  const [finishing, finish] = useFinishOnce(onComplete, onClose)
  useEffect(() => () => stopSpeaking(), [phase, turn])

  // Fortschrittsbalken: Einleitung, Liste, je Wendung eine Abfrage, je Zug ein Schritt, Abschluss.
  const P = list.length, T = turns.length
  const total = 3 + P + T
  const step = phase === 'start' ? 0 : phase === 'list' ? 1
    : phase === 'quiz' ? 2 + Math.min(P - wq.queue.length, P - 1)
    : phase === 'play' ? 2 + P + turn : total - 1

  const answerQuiz = ok => {
    if (!ok) setMissed(m => [...m, wq.queue[0]])
    const next = answerWarmup(wq, ok)
    setWq(next)
    setAsked(n => n + 1)
    if (warmupDone(next)) setPhase('play')
  }
  const answerTurn = first => {
    setResults(r => ({ ...r, [turn]: first }))
    if (turn + 1 < T) setTurn(turn + 1)
    else setPhase('done')
  }
  const score = firstTryScore(results, T)

  let content, footer = null
  if (phase === 'start') {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{dialog.emoji}</div>
        <h2 style={{ fontSize: 22, color: C.indigo, marginBottom: 4 }}>{dialog.title}</h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 14 }}>📍 {dialog.place}</p>
        <p style={{ lineHeight: 1.6, marginBottom: 8 }}>{dialog.sceneDe}</p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 14 }}>Dein Gegenüber: {dialog.role}</p>
        <div style={{ background: `${C.indigo}0E`, border: `1px solid ${C.indigo}33`, borderRadius: 12, padding: '12px 14px', fontSize: 14, color: C.sumi, lineHeight: 1.55, textAlign: 'left', marginBottom: 12 }}>
          🧤 Zuerst wärmst du dich auf: die {P} Wendungen, die du gleich brauchst – lesen, verstehen, einmal wiedererkennen.
          Dann spielst du die Szene und tippst jeweils die passende, höfliche Antwort an.
        </div>
        <NoSoundBanner sound={sound} />
        {/* Wer die Szene schon gemeistert hat, darf das Aufwärmen überspringen. */}
        {alreadyDone && (
          <Btn variant="ghost" onClick={() => setPhase('play')} style={{ width: '100%', minHeight: 48, marginTop: 12 }}>Direkt in die Szene</Btn>
        )}
      </div>
    )
    footer = <Btn onClick={() => setPhase('list')} style={{ width: '100%', minHeight: 48 }}>Aufwärmen →</Btn>
  } else if (phase === 'list') {
    content = <WarmupList list={list} fresh={fresh} sound={sound} />
    footer = <Btn onClick={() => setPhase(P ? 'quiz' : 'play')} style={{ width: '100%', minHeight: 48 }}>Kurz abfragen →</Btn>
  } else if (phase === 'quiz') {
    const idx = wq.queue[0]
    const lastOne = wq.queue.length === 1
    content = <WarmupQuestion key={asked} list={list} idx={idx} sound={sound} onDone={answerQuiz}
      again={missed.includes(idx)} nextLabel={ok => (ok && lastOne ? 'In die Szene →' : 'Weiter →')} />
  } else if (phase === 'play') {
    content = <TurnStep key={turn} turn={turns[turn]} emoji={dialog.emoji} sound={sound} hint={turn === 0}
      onDone={answerTurn} nextLabel={turn + 1 < T ? 'Weiter →' : 'Zum Abschluss →'} />
  } else {
    content = (
      <LessonDone xp={XP_PER_DIALOG} alreadyDone={alreadyDone} sub="Szene geschafft!"
        before={<p style={{ fontSize: 14, color: C.sumi, marginBottom: 12 }}>{score} von {T} Antworten beim ersten Versuch richtig.</p>}>
        <p style={{ lineHeight: 1.6, marginBottom: 10 }}>Diese Sätze kannst du jetzt sagen:</p>
        <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
          {list.filter(p => p.tokens).map(p => (
            <div key={p.dev} style={{ background: `${C.matcha}18`, borderRadius: 10, padding: '6px 12px' }}>
              <NeText dev={p.dev} roman={p.roman} size={19} />
              <div style={{ fontSize: 13, color: C.textMuted }}>„{p.de}“</div>
            </div>
          ))}
        </div>
      </LessonDone>
    )
    footer = <Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>Szene abschließen ✓</Btn>
  }

  return (
    <LessonFrame title={`${dialog.emoji} Szene: ${dialog.title}`} step={step} total={total} onClose={onClose} footer={footer}>
      {content}
    </LessonFrame>
  )
}

// Übersicht im Üben: alle Szenen in Pfad-Reihenfolge. Offen ist, was gespielt wurde, oder
// eine Szene, deren Station auf der Karte nicht mehr gesperrt ist UND deren Antwortsätze man
// sagen kann (sceneOpen) – nichts außer der Reihe. Gesperrt: die fehlenden Wörter mit
// Bedeutung und lehrender Station (explainMissing), sonst „kommt auf der Reise noch“.
// Abschluss bucht wie auf der Reise (bookDialog: completedDialogs, XP nur beim ersten Mal).
export function DialogHub({ onClose }) {
  const { progress, completeDialog } = useContext(ProgressCtx)
  const [active, setActive] = useState(null) // { dialog, wasDone }
  if (active) {
    const { dialog, wasDone } = active
    return <DialogPlay dialog={dialog} alreadyDone={wasDone} onClose={() => setActive(null)}
      onComplete={() => bookDialog(completeDialog, dialog, wasDone)} />
  }
  const done = progress.completedDialogs || []
  const doneCount = DIALOGS.filter(d => done.includes(d.id)).length
  return (
    <div style={{ padding: '12px 16px 24px' }}>
      <button onClick={onClose} style={{ minHeight: 44, background: 'none', border: 'none', color: C.textMuted, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 4 }}>← Üben</button>
      <h2 style={{ fontSize: 20, color: C.indigo, margin: '0 0 4px' }}>Szenen <span style={{ fontFamily: NE }}>कुराकानी</span></h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        Die Szenen erlebst du als Stationen deiner Reise – hier kannst du sie jederzeit wiederholen. {doneCount} / {DIALOGS.length} geschafft.
      </p>
      {DIALOGS.map(d => {
        const isDone = done.includes(d.id)
        const open = sceneOpen(d, progress)
        const missing = open ? [] : explainMissing(d, dialogGate(d, progress).missing)
        return (
          <button key={d.id} onClick={() => open && setActive({ dialog: d, wasDone: isDone })} disabled={!open}
            aria-label={`${d.title}${isDone ? ' (geschafft, wiederholen)' : open ? ' (spielen)' : ' (gesperrt)'}`}
            style={{
              width: '100%', minHeight: 64, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              background: '#fff', border: `2px solid ${isDone ? `${C.matcha}55` : C.washiDark}`, borderRadius: 12,
              padding: '10px 14px', marginBottom: 8, opacity: open ? 1 : 0.6, cursor: open ? 'pointer' : 'default',
            }}>
            <span style={{ fontSize: 30, filter: open ? 'none' : 'grayscale(1)' }} aria-hidden="true">{d.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 15, color: C.sumi }}>{d.title}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>{d.place}</span>
              {!open && (
                <span style={{ display: 'block', fontSize: 12, color: C.shu, marginTop: 3, lineHeight: 1.45 }}>
                  {missing.length === 0 ? '🔒 Kommt auf deiner Reise noch – spiel erst die Stationen davor.' : (
                    <>
                      🔒 Erst auf der Reise lernen:
                      {missing.slice(0, 3).map(m => (
                        <span key={m.dev} style={{ display: 'block' }}>
                          <span style={{ fontFamily: NE, fontSize: 14 }}>{m.dev}</span>{m.de ? ` „${m.de}“` : ''}{m.where ? ` · lernst du in „${m.where}“` : ''}
                        </span>
                      ))}
                      {missing.length > 3 && <span style={{ display: 'block' }}>… und {missing.length - 3} weitere</span>}
                    </>
                  )}
                </span>
              )}
            </span>
            <span style={{ fontSize: 18, color: isDone ? C.matcha : C.textMuted }}>{isDone ? '✓' : open ? '›' : '🔒'}</span>
          </button>
        )
      })}
    </div>
  )
}
