import { useState, useEffect, useMemo, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { Btn, Card, Stars } from '../../components/ui.jsx'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { XP_PER_CHAPTER } from '../../lib/xp.js'
import { CHAPTERS } from '../data/chapters.js'
import { stopSpeaking } from '../lib/speech.js'
import { shuffle } from '../lib/scriptQuiz.js'
import { choiceState } from '../lib/choice.js'
import { isTask, chapterStars, chapterReading, journeySummary } from '../lib/chapters.js'
import { isNodeDone } from '../lib/path.js'
import { useSound, useListenProbe, ListenButton, NoSoundMark, NoSoundBanner } from '../components/sound.jsx'
import { NeText, TappableSentence } from '../components/text.jsx'
import { Choice, ChoiceGrid } from '../components/Choice.jsx'
import { GapDrill, GAP } from '../components/GapDrill.jsx'
import { BuildStep } from '../components/BuildStep.jsx'
import { LessonFrame, LessonDone, useFinishOnce, useOnce, stepLabel as label } from '../components/lesson.jsx'

// ─── Geschichts-Kapitel, Tagebuch und Ziel ────────────────────────────────────
// Gegenstück zu ChapterPlayer/StoryJournal in src/screens/reise.jsx. Eigene Datei statt
// players.jsx: die sieben Schritt-Arten bringen fünf Aufgaben-Bausteine mit, players.jsx
// wäre sonst über 1000 Zeilen. Rahmen und Abschluss-Muster (LessonFrame, useFinishOnce,
// LessonDone) kommen aus components/lesson.jsx – es gibt sie nur einmal.
//
// Grundsätze wie überall im Zweig: alles geht ohne Ton (Hör-Aufgaben zeigen dann den Text),
// Umschrift bei Sätzen nur mit settings.showRoman, Antworten werden getippt. Jede Aufgabe
// wird EINMAL beantwortet: danach Rückmeldung, Auflösung (Übersetzung, Umschrift) und ein
// eigener „Weiter“-Knopf, der onDone(richtig?) genau einmal ruft (Ref-Sperre wie GapDrill).

const verdict = ok => (
  <p style={{ margin: '14px 0 0', fontWeight: 600, color: ok ? C.matcha : C.shu }}>{ok ? '✓ Richtig!' : '✗ Leider nicht.'}</p>
)

// Erzählung: deutscher Text; spricht jemand Nepali, steht der Satz antippbar darunter
// (die Bedeutung steckt schon im deutschen Text).
function StoryStep({ step, sound, hint }) {
  return (
    <div>
      <p style={{ fontSize: 16, color: C.sumi, lineHeight: 1.7, margin: 0 }}>{step.de}</p>
      {step.dev && (
        <Card style={{ marginTop: 16 }}>
          <TappableSentence dev={step.dev} roman={step.roman} tokens={step.tokens} sound={sound} hint={hint} />
        </Card>
      )}
    </div>
  )
}

// Neues Wort des Kapitels (kommt danach in den Wiederholungsplan).
function IntroStep({ step, sound }) {
  return (
    <div>
      {label('NEUES WORT')}
      <NeText dev={step.dev} roman={step.roman} size={48} align="center" />
      <div style={{ fontSize: 18, color: C.sumi, textAlign: 'center', margin: '8px 0 12px', lineHeight: 1.45 }}>{step.de}</div>
      {sound !== false && <div style={{ textAlign: 'center', marginBottom: 14 }}><ListenButton text={step.dev} sound={sound} /></div>}
      {step.note && (
        <div style={{ background: `${C.shu}10`, borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.55, margin: 0 }}>💡 {step.note}</p>
        </div>
      )}
    </div>
  )
}

// Deutsche Antwort-Optionen (Hör-Aufgabe) bzw. Stimmt/Stimmt-nicht: Klartext, einspaltig.
function ChoiceButtons({ options, picked, correct, onPick, render = o => o, columns = '1fr' }) {
  const revealed = picked !== null
  return (
    <ChoiceGrid columns={columns}>
      {options.map((o, i) => (
        <Choice key={i} text={render(o)} state={choiceState(o, picked, correct)} disabled={revealed} onClick={() => onPick(o)} />
      ))}
    </ChoiceGrid>
  )
}

// „Was wurde gesagt?“ Ton wird beim Zeigen geprüft (useListenProbe, wie die Hörfrage im
// Wort-Quiz): mit Ton einmal vorlesen; ohne Ton steht der Nepali-Satz sofort geschrieben da
// und die Frage wird zur Leseaufgabe. Solange der Ton noch geprüft wird oder man nichts
// gehört hat, lässt sich der Text jederzeit einblenden – nie ein Knopf, der nichts tut,
// nie eine Sackgasse.
function AudioStep({ step, onDone, nextLabel }) {
  const [options] = useState(() => shuffle(step.options))
  const [picked, setPicked] = useState(null)
  const probe = useListenProbe(step.say)
  const qSound = probe.sound
  const done = useOnce(onDone)
  const revealed = picked !== null
  const reading = qSound === false

  return (
    <div style={{ textAlign: 'center' }}>
      {label(reading ? 'LESEN' : 'HÖREN')}
      <Card style={{ minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 12 }}>
        {qSound !== false && <div style={{ marginBottom: 8 }}><ListenButton text={step.say} sound={qSound} label="Nochmal anhören" quiet /></div>}
        {reading && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}><NoSoundMark /> Gerade kein Ton – lies den Satz:</div>}
        {probe.shown || revealed ? (
          <NeText dev={step.say} roman={step.sayRoman} size={26} align="center" />
        ) : (
          <button onClick={probe.reveal}
            style={{ minHeight: 44, background: 'none', border: 'none', color: C.indigo, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
            Nichts gehört? Satz zeigen
          </button>
        )}
        {revealed && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6 }}>„{step.de}“</div>}
      </Card>
      <p style={{ margin: '0 0 12px', fontWeight: 500 }}>{reading ? 'Was steht da?' : 'Was wurde gesagt?'}</p>
      <ChoiceButtons options={options} picked={picked} correct={step.answer} onPick={setPicked} />
      {revealed && (
        <>
          {verdict(picked === step.answer)}
          <Btn onClick={() => done(picked === step.answer)} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel}</Btn>
        </>
      )}
    </div>
  )
}

// Jemand sagt etwas auf Nepali, du wählst die passende Nepali-Antwort. Die Übersetzung der
// Frage und die Bedeutung JEDER Option erscheinen erst nach dem Antippen (vorher wäre das
// die Lösung) – dann ist alles lesbar, auch die Ablenker.
function DialogStep({ step, sound, onDone, nextLabel }) {
  const [options] = useState(() => shuffle(step.options))
  const [picked, setPicked] = useState(null)
  const done = useOnce(onDone)
  const revealed = picked !== null
  return (
    <div>
      {label('GESPRÄCH')}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Man sagt zu dir:</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}><NeText dev={step.line} roman={step.lineRoman} size={26} /></div>
          {sound && <ListenButton text={step.line} sound={sound} quiet label="" ariaLabel={`Anhören: ${step.line}`} />}
        </div>
        {revealed && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6 }}>„{step.lineDe}“</div>}
      </Card>
      <p style={{ margin: '0 0 12px', fontWeight: 500, textAlign: 'center' }}>Was antwortest du?</p>
      <ChoiceGrid>
        {options.map(o => {
          const meta = step.optionsMeta[o] || {}
          return (
            <Choice key={o} dev={o} roman={meta.roman} de={meta.de} showDe={revealed} align="left"
              state={choiceState(o, picked, step.answer)} disabled={revealed} onClick={() => setPicked(o)} />
          )
        })}
      </ChoiceGrid>
      {revealed && (
        <>
          {verdict(picked === step.answer)}
          {sound && <div style={{ marginTop: 8 }}><ListenButton text={step.answer} sound={sound} quiet label="Antwort anhören" /></div>}
          <Btn onClick={() => done(picked === step.answer)} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel}</Btn>
        </>
      )}
    </div>
  )
}

// Stimmt die deutsche Aussage über den Nepali-Satz? Die Übersetzung des Satzes steht erst
// NACH der Antwort da – vorher verriete sie, ob die Aussage stimmt.
function TfStep({ step, sound, onDone, nextLabel }) {
  const [picked, setPicked] = useState(null)
  const done = useOnce(onDone)
  const revealed = picked !== null
  const YES = 'Stimmt', NO = 'Stimmt nicht'
  const correct = step.answer ? YES : NO
  return (
    <div>
      {label('STIMMT DAS?')}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}><NeText dev={step.dev} roman={step.roman} size={26} /></div>
          {sound && <ListenButton text={step.dev} sound={sound} quiet label="" ariaLabel={`Anhören: ${step.dev}`} />}
        </div>
        {revealed && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6 }}>„{step.de}“</div>}
      </Card>
      <div style={{ background: `${C.indigo}0D`, border: `1px solid ${C.indigo}30`, borderRadius: 10, padding: 12, fontSize: 15, color: C.sumi, lineHeight: 1.5, marginBottom: 12 }}>
        {step.claimDe}
      </div>
      <ChoiceButtons options={[YES, NO]} picked={picked} correct={correct} onPick={setPicked} columns="1fr 1fr"
        render={o => (o === YES ? '✓ Stimmt' : '✗ Stimmt nicht')} />
      {revealed && (
        <>
          {verdict(picked === correct)}
          <Btn onClick={() => done(picked === correct)} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel}</Btn>
        </>
      )}
    </div>
  )
}

// Kapitel: Einleitung → Schritte der Geschichte → Abschluss mit Sternen (lib/chapters.js:
// 3 = fehlerfrei, 2 = höchstens zwei Fehler, 1 = geschafft). Vergibt selbst nichts:
// onComplete(sterne) (Reise-Screen) bucht XP, Sterne (bester Stand) und plant die neuen
// Wörter ein – Abschluss-Muster wie alle Lektionen (useFinishOnce). alreadyDone:
// Wiederholung – dann ohne XP-Versprechen (die Sterne können trotzdem steigen).
export function ChapterPlayer({ chapter, alreadyDone = false, onComplete, onClose }) {
  const sound = useSound()
  const steps = useMemo(() => [
    { kind: 'start' },
    ...chapter.steps.map((s, idx) => ({ ...s, idx })),
    { kind: 'done' },
  ], [chapter])
  // Tipp-Hinweis nur an der ersten Nepali-Zeile der Erzählung.
  const firstLine = useMemo(() => steps.findIndex(s => s.kind === 'story' && s.dev), [steps])
  const [step, setStep] = useState(0)
  const [results, setResults] = useState({}) // Schritt-Index im Kapitel → richtig?
  useEffect(() => () => stopSpeaking(), [step])
  const stars = chapterStars(chapter, results)
  const [finishing, finish] = useFinishOnce(() => onComplete(stars), onClose)

  const cur = steps[step]
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const answer = correct => { setResults(r => ({ ...r, [cur.idx]: correct })); next() }
  const nextLabel = steps[step + 1]?.kind === 'done' ? 'Zum Abschluss →' : 'Weiter →'
  const newWords = chapter.steps.filter(s => s.kind === 'intro')

  let content
  if (cur.kind === 'start') {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>📖</div>
        <h2 style={{ fontSize: 22, color: C.indigo, marginBottom: 4 }}>{chapter.title}</h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 14 }}>📍 {chapter.place}</p>
        <p style={{ lineHeight: 1.6, marginBottom: 12 }}>{chapter.summary}</p>
        <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.55, marginBottom: 12 }}>
          Lies die Geschichte, lerne {newWords.length} neue Wörter und löse unterwegs kleine Aufgaben.
          Tippe ein Nepali-Wort an, um zu sehen, was es heißt.
        </p>
        <NoSoundBanner sound={sound} extra="Hör-Aufgaben zeigen dir dann den Satz zum Lesen." />
      </div>
    )
  } else if (cur.kind === 'story') {
    content = <StoryStep key={step} step={cur} sound={sound} hint={step === firstLine} />
  } else if (cur.kind === 'intro') {
    content = <IntroStep key={step} step={cur} sound={sound} />
  } else if (cur.kind === 'audio') {
    content = <AudioStep key={step} step={cur} onDone={answer} nextLabel={nextLabel} />
  } else if (cur.kind === 'dialog') {
    content = <DialogStep key={step} step={cur} sound={sound} onDone={answer} nextLabel={nextLabel} />
  } else if (cur.kind === 'tf') {
    content = <TfStep key={step} step={cur} sound={sound} onDone={answer} nextLabel={nextLabel} />
  } else if (cur.kind === 'gap') {
    const ex = { q: cur.before + GAP + cur.after, a: cur.answer, options: cur.options, de: cur.de, roman: cur.roman }
    content = <GapDrill key={step} ex={ex} sound={sound} onDone={answer} nextLabel={nextLabel} readOption={chapterReading}
      head={label('LÜCKE')} />
  } else if (cur.kind === 'build') {
    content = <BuildStep key={step} step={cur} sound={sound} onDone={answer} nextLabel={nextLabel} />
  } else {
    content = (
      <LessonDone xp={XP_PER_CHAPTER} alreadyDone={alreadyDone}
        alreadyNote="Schon abgeschlossen – diese Runde bringt keine neuen XP (bessere Sterne zählen trotzdem)."
        before={(
          <>
            <div style={{ marginBottom: 6 }}><Stars count={stars} max={3} size={30} gap={4} /></div>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
              {stars === 3 ? 'Alle Aufgaben beim ersten Mal richtig.' : stars === 2 ? 'Fast fehlerfrei – höchstens zwei Fehler.' : 'Geschafft! Spiel das Kapitel noch einmal für mehr Sterne.'}
            </p>
          </>
        )}>
        <p style={{ lineHeight: 1.6, marginBottom: 14 }}>Diese Wörter kommen in deinen Wiederholungen wieder:</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {newWords.map(w => (
            <span key={w.dev} style={{ fontSize: 20, fontFamily: NE, background: `${C.matcha}20`, borderRadius: 10, padding: '2px 10px', lineHeight: 1.5 }}>{w.dev}</span>
          ))}
        </div>
      </LessonDone>
    )
  }

  // Fußleiste bei Aufgaben ausgeblendet: jede Aufgabe hat ihren eigenen Weiter-Knopf.
  return (
    <LessonFrame title={`📖 ${chapter.title}`} step={step} total={steps.length} onClose={onClose}
      footer={isTask(cur) ? null : cur.kind === 'done' ? (
        <Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>Kapitel abschließen ✓</Btn>
      ) : (
        <Btn onClick={next} style={{ width: '100%', minHeight: 48 }}>{cur.kind === 'start' ? 'Los geht’s →' : 'Weiter →'}</Btn>
      )}>
      {content}
    </LessonFrame>
  )
}

// Das Reise-Tagebuch: die Erzählung aller abgeschlossenen Kapitel am Stück, zum Nachlesen
// (wie StoryJournal im Japanischen). Nepali-Zeilen antippbar; keine Aufgaben, kein XP.
export function ChapterDiary({ onClose }) {
  const { progress } = useContext(ProgressCtx)
  const sound = useSound()
  const done = CHAPTERS.map((c, i) => ({ c, n: i + 1 })).filter(({ c }) => isNodeDone({ type: 'chapter', id: c.id }, progress))
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '8px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onClose} aria-label="Tagebuch schließen" style={{
          width: 44, height: 44, marginLeft: -10, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
        }}>✕</button>
        <h3 style={{ fontSize: 15, color: C.indigo, margin: 0 }}>📖 Deine Geschichte</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {done.length > 0 && <NoSoundBanner sound={sound} style={{ marginBottom: 16 }} />}
        {done.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📖</div>
            <p style={{ lineHeight: 1.6 }}>Noch keine Kapitel. Schließe ein Kapitel auf deiner Reise ab – dann erzählt sich deine Geschichte hier weiter.</p>
          </div>
        ) : done.map(({ c, n }, i) => (
          <div key={c.id} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>KAPITEL {n}</div>
            <h4 style={{ fontSize: 17, color: C.indigo, margin: '0 0 2px' }}>{c.title}</h4>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>📍 {c.place}</div>
            {c.steps.filter(s => s.kind === 'story').map((s, j) => (
              <div key={j} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 15, color: C.sumi, lineHeight: 1.7, margin: 0 }}>{s.de}</p>
                {s.dev && (
                  <div style={{ background: `${C.indigo}0D`, borderRadius: 8, padding: '4px 10px', marginTop: 6 }}>
                    <TappableSentence dev={s.dev} roman={s.roman} tokens={s.tokens} size={20} sound={sound} />
                  </div>
                )}
              </div>
            ))}
            {i < done.length - 1 && <div style={{ height: 1, background: C.washiDark, marginTop: 16 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// Ziel-Station: kurzer Schluss-Bildschirm mit der Bilanz der Reise (lib/chapters.js
// journeySummary). Bucht sich EINMAL (onComplete; der Reise-Screen prüft alreadyDone),
// danach bleibt die Station als erledigt antippbar. Kein XP – der Lohn steckt in den
// Stationen davor.
export function GoalScreen({ alreadyDone = false, onComplete, onClose }) {
  const { progress } = useContext(ProgressCtx)
  const sum = journeySummary(progress)
  const [finishing, finish] = useFinishOnce(onComplete, onClose)
  const tiles = [
    ['Schriftzeichen', sum.chars], ['Wörter', sum.words], ['Grammatik-Themen', sum.grammar], ['Kapitel', `${sum.chapters} / ${CHAPTERS.length}`],
  ]
  return (
    <LessonFrame title="🏔️ Ziel: Annapurna-Blick" step={0} total={1} onClose={onClose}
      footer={<Btn onClick={finish} disabled={finishing} style={{ width: '100%', minHeight: 48 }}>{alreadyDone ? 'Schließen' : 'Reise abschließen ✓'}</Btn>}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 6 }}>🏔️</div>
        <h2 style={{ fontSize: 22, color: C.indigo, marginBottom: 8 }}>Annapurna-Blick erreicht!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 14 }}>
          Von der Ankunft in Kathmandu über Thamel, Boudha und Pokhara bis zum Sonnenaufgang über den Gipfeln –
          deine Reise ist geschafft. Das hast du unterwegs gelernt:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {tiles.map(([name, n]) => (
            <Card key={name} style={{ padding: '12px 8px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.shu }}>{n}</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>{name}</div>
            </Card>
          ))}
        </div>
        <NeText dev="शुभ यात्रा!" roman="shubh yātrā!" size={28} align="center" />
        <p style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>Gute Reise – und komm wieder nach Nepal.</p>
        {alreadyDone && <p style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>Schon erreicht – schön, dass du noch einmal hier oben bist.</p>}
      </div>
    </LessonFrame>
  )
}
