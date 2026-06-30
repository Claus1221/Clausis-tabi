import { useState, useRef, useEffect, useMemo, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { computeStats, dueKana } from '../useProgress.js'
import { LESSONS } from '../data/kana.js'
import { WORD_BLOCKS, learnedWordKanji } from '../data/words.js'
import { KANJI_ORIGIN } from '../data/kanjiOrigin.js'
import { GRAMMAR } from '../data/grammar.js'
import { STORY_TOKENS, CHAPTER_BY_ID } from '../data/chapters.js'
import { PATH } from '../data/path.js'
import { XP_PER_KANA, XP_PER_CARD, XP_PER_WORD, XP_PER_GRAMMAR, XP_PER_CHAPTER } from '../lib/xp.js'
import { completedKanaList } from '../lib/kanaStats.js'
import { speak, speakItem } from '../lib/speech.js'
import { srsItemInfo, SRS_RATINGS, shuffled, feedbackColor } from '../lib/srs.js'
import { chapterSrsKeys, chapterStarsShown, computeAllChapterStars, shouldTypeSentence } from '../lib/chapters.js'
import { renderFuri, furiPlain } from '../lib/furigana.jsx'
import { sceneTorii, buildBackdrop, roadPath, STATE_PALETTE } from '../lib/scene.jsx'
import { isNodeDone, pathNodeMeta } from '../lib/path.js'
import { Emoji, Card, Btn, Stars } from '../components/ui.jsx'
import { DrawCanvas } from '../components/kana.jsx'
import { KanjiOrigin, StoryLine } from '../components/japanese.jsx'
import { BuildStep } from '../components/BuildStep.jsx'
import { LessonPlayer, BlockCourse, GrammarLesson } from './players.jsx'

function DailyStrip({ onReview }) {
  const { progress } = useContext(ProgressCtx)
  const { streak, xpToday: xp, goal } = computeStats(progress)
  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const due = dueKana(progress, learnedAll).length
  const pct = Math.min(xp / goal, 1)

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="56" height="56" style={{ flexShrink: 0 }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke={C.washiDark} strokeWidth="5" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={C.shu} strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 22 * pct} ${2 * Math.PI * 22}`}
            strokeLinecap="round" transform="rotate(-90 28 28)" />
          <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.shu}>
            {Math.min(Math.round(xp / goal * 100), 100)}%
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Tagesziel</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{xp} / {goal} XP</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            {xp >= goal ? 'erreicht 🎉' : `noch ${goal - xp} XP`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.shu, lineHeight: 1 }}>{streak} 🔥</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Streak</div>
          {due > 0 ? (
            <button onClick={onReview} style={{
              background: `${C.shu}14`, border: `1px solid ${C.shu}40`, borderRadius: 999,
              padding: '4px 10px', fontSize: 12, fontWeight: 700, color: C.shu, cursor: 'pointer',
            }}>{due} fällig →</button>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted }}>nichts fällig</div>
          )}
        </div>
      </div>
    </Card>
  )
}


// ─── Geschichts-Kapitel: Übungs-Schritte + Player ────────────────────────────

// Auswahl-Übung (deckt tap/sign/listen/dialog/gap/tf ab): Reiz + Optionen + Auflösung.
function ChoiceStep({ step, onSolved }) {
  const { awardXp } = useContext(ProgressCtx)
  const [ans, setAns] = useState(null)
  const revealed = ans != null

  // Optionen pro Schritt einmalig mischen (sonst steht die Lösung immer zuerst).
  const mixedOpts = useMemo(() => step.options ? shuffled(step.options) : null, [step])

  // Abruf OHNE deutsche Krücke: pic (Bild→Schrift), audio (Audio→Schrift),
  // pic_choice (Schrift→Bild). Deutsch erscheint NUR im Feedback nach der Antwort.
  let options, answerValue, emojiOptions = false
  if (step.kind === 'pic_choice') { options = mixedOpts.map(n => ({ value: n, emoji: n })); answerValue = step.answer; emojiOptions = true }
  else if (step.kind === 'tf') { options = [{ value: 'Ja' }, { value: 'Nein' }]; answerValue = step.answer ? 'Ja' : 'Nein' }
  else { options = mixedOpts.map(o => ({ value: o })); answerValue = step.answer } // pic, audio, sign, dialog, gap

  const prompt = step.prompt || (step.kind === 'pic' ? 'Welches Wort passt?' : step.kind === 'audio' ? 'Was hörst du?' : step.kind === 'pic_choice' ? 'Welches Bild passt?' : '')

  useEffect(() => { if (step.kind === 'audio') speak(step.say) }, []) // eslint-disable-line

  const choose = (v) => { if (revealed) return; setAns(v); if (v === answerValue) awardXp(XP_PER_CARD); onSolved() }

  // Feedback-Glosse (Deutsch ERST hier): Schrift — „Bedeutung".
  let gloss = ''
  if (step.de) gloss = (step.jp || step.answer || '') + ' — „' + step.de + '"'
  else if (step.tr) gloss = (step.line || step.sign || '') + ' — „' + step.tr + '"'

  return (
    <div style={{ textAlign: 'center' }}>
      {step.kind === 'pic' && <div style={{ marginBottom: 14 }}><Emoji name={step.emoji} size={76} /></div>}
      {step.kind === 'pic_choice' && <div style={{ fontSize: 42, fontFamily: JP, color: C.sumi, marginBottom: 14 }}>{step.jp}</div>}
      {step.kind === 'audio' && (
        <button onClick={() => speak(step.say)} style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 50, width: 76, height: 76, fontSize: 32, cursor: 'pointer', margin: '0 auto 14px' }}>🔊</button>
      )}
      {step.kind === 'sign' && (
        <div style={{ display: 'inline-block', background: '#1E4368', color: '#fff', borderRadius: 10, padding: '14px 26px', marginBottom: 14 }}>
          <span style={{ fontSize: 34, fontFamily: JP }}>{step.sign}</span>
        </div>
      )}
      {step.kind === 'dialog' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, textAlign: 'left' }}>
          <Emoji name={step.emoji} size={48} />
          <div style={{ background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '10px 14px', flex: 1 }}>
            <span style={{ fontSize: 20, fontFamily: JP, color: C.sumi }}>{step.line}</span>
          </div>
        </div>
      )}
      {step.kind === 'tf' && (
        <div style={{ marginBottom: 12 }}>
          <Emoji name={step.emoji} size={72} />
          <div style={{ fontSize: 26, fontFamily: JP, color: C.sumi, marginTop: 8 }}>{step.jp}</div>
        </div>
      )}
      {step.kind === 'gap' && (
        <div style={{ fontSize: 28, fontFamily: JP, color: C.sumi, marginBottom: 12 }}>
          {step.text.split('＿').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span style={{ display: 'inline-block', minWidth: 34, borderBottom: `2px solid ${C.shu}`, color: C.shu }}>＿</span>}</span>
          ))}
        </div>
      )}

      {prompt && <p style={{ fontWeight: 500, marginBottom: 14, color: C.textMuted }}>{prompt}</p>}

      <div style={{ display: emojiOptions ? 'flex' : 'grid', gridTemplateColumns: step.kind === 'tf' ? '1fr 1fr' : '1fr', gap: 10, justifyContent: 'center' }}>
        {options.map(o => {
          const correct = o.value === answerValue, chosen = o.value === ans
          const fb = feedbackColor(!revealed ? 'neutral' : correct ? 'correct' : chosen ? 'wrong' : 'neutral')
          const isJa = /[぀-ヿ一-龯]/.test(o.value)
          return (
            <button key={o.value} onClick={() => choose(o.value)} disabled={revealed}
              style={{
                padding: emojiOptions ? 10 : '12px 14px', borderRadius: 10, border: `2px solid ${fb.border}`,
                background: fb.bg,
                cursor: revealed ? 'default' : 'pointer', flex: emojiOptions ? 1 : undefined,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: isJa ? 22 : 15, fontFamily: isJa ? JP : 'inherit',
                fontWeight: 600, color: C.sumi,
              }}>
              {o.emoji ? <Emoji name={o.emoji} size={52} /> : <span>{o.value}</span>}
            </button>
          )
        })}
      </div>

      {revealed && (
        <p style={{ marginTop: 14, fontWeight: 600, color: ans === answerValue ? C.matcha : C.shu }}>
          {ans === answerValue ? '✓ Richtig!' : (emojiOptions ? '✗ Leider falsch' : `✗ Richtig: ${answerValue}`)}
          {gloss && <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{gloss}</span>}
        </p>
      )}
    </div>
  )
}

// Wort-Einführungskarte: Bild + Schrift + Lesung + Audio. Deutsch nur einmal.
function IntroStep({ step }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, marginBottom: 12 }}>NEUES WORT</div>
      <div style={{ width: 96, height: 96, borderRadius: 20, background: '#EAF0EA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Emoji name={step.emoji} size={56} />
      </div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>{step.reading}</div>
      <div style={{ fontSize: 48, fontFamily: JP, color: C.sumi, lineHeight: 1.1 }}>{step.jp}</div>
      <button onClick={() => speak(step.reading || step.jp)}
        style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo, borderRadius: 20, padding: '7px 16px', fontSize: 14, cursor: 'pointer' }}>
        🔊 Anhören
      </button>
      <div style={{ fontSize: 13, color: C.textMuted, paddingTop: 10, borderTop: `1px solid ${C.washiDark}`, maxWidth: 260, margin: '14px auto 0' }}>
        Bedeutung: <strong style={{ color: C.sumi }}>{step.de}</strong>
      </div>
      <div style={{ maxWidth: 320, margin: '14px auto 0' }}>
        <KanjiOrigin jp={step.jp} />
      </div>
    </div>
  )
}

// Nachzeichnen (produktiver Abruf): das Zeichen selbst auf die Fläche schreiben.
function TraceStep({ step }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 500, marginBottom: 4 }}>
        Schreibe nach: <span style={{ fontFamily: JP, fontSize: 24 }}>{step.char}</span>
      </p>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{step.reading}{step.de ? ' · ' + step.de : ''}</p>
      <DrawCanvas char={step.char} />
    </div>
  )
}


// Spielt ein Geschichts-Kapitel: Erzählbeats + abwechslungsreiche Übungen.
function ChapterPlayer({ chapter, alreadyDone, onComplete, onClose }) {
  const { progress: userProg } = useContext(ProgressCtx)
  const [step, setStep] = useState(0)
  const [solved, setSolved] = useState(false)
  const [finished, setFinished] = useState(false)
  const steps = chapter.steps
  const cur = steps[step]
  const total = steps.length
  const noGate = cur.kind === 'story' || cur.kind === 'intro' || cur.kind === 'trace'
  const canContinue = noGate || solved
  const isLastStep = step === total - 1
  const progress = Math.round(((finished ? total : step) / total) * 100)

  const advance = () => { if (isLastStep) { setFinished(true); return } setStep(s => s + 1); setSolved(false) }

  let content
  if (finished) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Emoji name="party" size={72} />
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, margin: '10px 0 8px' }}>Kapitel geschafft!</h2>
        <p style={{ lineHeight: 1.6 }}>„{chapter.title}" – du hast das Gelernte angewendet und die Geschichte erlebt.</p>
      </div>
    )
  } else if (cur.kind === 'story') {
    const toks = cur.tokens || STORY_TOKENS[cur.jp]
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Emoji name={cur.emoji} size={80} />
        {cur.jp && (
          <div style={{ marginTop: 16 }}>
            {toks ? <StoryLine tokens={toks} tr={cur.tr} /> : (
              <>
                <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 2.1, color: C.sumi }}>
                  {renderFuri(cur.jp)}
                  <button onClick={() => speak(furiPlain(cur.jp))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginLeft: 6, verticalAlign: 'middle' }}>🔊</button>
                </div>
                {cur.tr && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6 }}>„{cur.tr}"</div>}
              </>
            )}
          </div>
        )}
        {cur.text && <p style={{ fontSize: cur.jp ? 13 : 16, color: cur.jp ? C.textMuted : C.sumi, lineHeight: 1.6, marginTop: cur.jp ? 12 : 16 }}>{cur.text}</p>}
      </div>
    )
  } else if (cur.kind === 'intro') {
    content = <IntroStep key={step} step={cur} />
  } else if (cur.kind === 'trace') {
    content = <TraceStep key={step} step={cur} />
  } else if (cur.kind === 'build') {
    content = <BuildStep key={step} step={cur} typed={shouldTypeSentence(cur.answer.join(''), userProg)} onSolved={() => setSolved(true)} />
  } else {
    content = <ChoiceStep key={step} step={cur} onSolved={() => setSolved(true)} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>📖 {chapter.title}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
        {finished ? (
          <Btn onClick={onComplete} style={{ width: '100%' }}>Abschließen ✓</Btn>
        ) : (
          <Btn onClick={advance} style={{ width: '100%', opacity: canContinue ? 1 : 0.5 }} variant={canContinue ? 'primary' : 'ghost'}>
            {noGate ? 'Weiter →' : (isLastStep ? 'Kapitel abschließen →' : 'Weiter →')}
          </Btn>
        )}
      </div>
    </div>
  )
}


// Kapitel-Übung: fragt den Kenntnisstand der Kapitel-Vokabeln ab (Karteikarten mit
// Selbstbewertung wie im SRS). Jede Bewertung aktualisiert die SRS-Karte → hebt mit
// der Zeit die Sterne des Kapitels. Beim ersten Mal werden die Kapitel-Wörter als
// neue Karten in den Wiederholungsplan aufgenommen (scheduleNew, idempotent).
function ChapterPractice({ chapter, onClose }) {
  const { progress, awardXp, reviewCard, scheduleNew } = useContext(ProgressCtx)
  const keys = useMemo(() => chapterSrsKeys(chapter), [chapter])
  const deck = useMemo(() => shuffled(keys), [keys])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)

  // Kapitel-Vokabeln als SRS-Karten anlegen (falls noch nicht geplant).
  useEffect(() => { if (keys.length) scheduleNew(keys) }, []) // eslint-disable-line

  const finished = idx >= deck.length
  const item = deck[idx]
  const info = item ? srsItemInfo(item) : null

  const rate = (q) => {
    reviewCard(item, q)
    if (q >= 3) { awardXp(XP_PER_CARD); setCorrect(c => c + 1) }
    setFlipped(false)
    setIdx(i => i + 1)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round((Math.min(idx, deck.length) / Math.max(1, deck.length)) * 100)}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 12, color: C.textMuted }}>🎯 {chapter.title}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {keys.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
            <p style={{ lineHeight: 1.6 }}>Dieses Kapitel führt keine eigenen Vokabeln ein.</p>
          </div>
        ) : finished ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Emoji name="party" size={72} />
            <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, margin: '10px 0 8px' }}>Geschafft!</h2>
            <p style={{ lineHeight: 1.6 }}>{correct} / {deck.length} sicher gewusst. Dein Kenntnisstand zählt für die Sterne dieses Kapitels.</p>
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>Karte {idx + 1} / {deck.length} · Wie gut kennst du dieses Wort?</p>
            <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
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
              <div style={{ marginBottom: 12 }}><KanjiOrigin jp={item} /></div>
            )}
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
        )}
      </div>

      {(finished || keys.length === 0) && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          <Btn onClick={onClose} style={{ width: '100%' }}>Fertig ✓</Btn>
        </div>
      )}
    </div>
  )
}

// Info-Sheet beim Antippen eines abgeschlossenen Kapitels: zeigt den Sterne-Stand
// und bietet „Geschichte erneut erleben" sowie „Kenntnisstand üben" an.
function ChapterSheet({ chapter, stars, onReplay, onPractice, onClose }) {
  const STAR_HINT = [
    '', // 0 kommt hier nicht vor
    'Kapitel abgeschlossen. Übe die Vokabeln, um mehr Sterne zu sammeln.',
    'Du kennst die Wörter schon ein wenig. Weiter so!',
    'Solide Kenntnisse – die Hälfte ist geschafft.',
    'Fast gemeistert! Noch ein wenig Übung.',
    'Gemeistert! Du beherrschst die Vokabeln dieses Kapitels. ⛩',
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(33,31,27,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.washi, width: '100%', maxWidth: 480, borderRadius: '18px 18px 0 0', padding: '20px 20px 24px', boxShadow: '0 -8px 30px -12px rgba(33,31,27,0.4)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: C.washiDark, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>KAPITEL</div>
        <h3 style={{ fontSize: 18, fontFamily: JP, color: C.indigo, margin: '0 0 12px' }}>{chapter.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Stars count={stars} size={26} gap={3} />
          <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{stars} / 5</span>
        </div>
        <p style={{ fontSize: 13, color: C.sumi, lineHeight: 1.6, margin: '0 0 18px' }}>{STAR_HINT[stars] || STAR_HINT[1]}</p>
        <Btn onClick={onPractice} style={{ width: '100%', marginBottom: 10 }}>🎯 Kenntnisstand üben</Btn>
        <Btn variant="secondary" onClick={onReplay} style={{ width: '100%' }}>📖 Geschichte erneut erleben</Btn>
      </div>
    </div>
  )
}

// Das Reise-Tagebuch: alle bisher freigeschalteten Kapitel der Reise am Stück.
// Erzählt die Geschichte aus den abgeschlossenen Kapiteln (c1–c6) nach – also
// genau das, was man unterwegs erlebt hat, samt der dort gelernten Sätze.
function StoryJournal({ progress, onClose }) {
  const beats = []
  PATH.forEach(n => {
    if (n.type !== 'chapter' || !isNodeDone(n, progress)) return
    const c = CHAPTER_BY_ID[n.id]
    if (!c) return
    const story = c.steps.filter(s => s.kind === 'story')
    if (story.length) beats.push({ id: c.id, title: c.title, story })
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 15, fontFamily: JP, color: C.indigo }}>📖 Deine Geschichte</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {beats.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📖</div>
            <p style={{ lineHeight: 1.6 }}>Noch keine Kapitel. Schließe ein Kapitel auf deiner Reise ab – dann erzählt sich deine Geschichte hier Stück für Stück weiter.</p>
          </div>
        ) : beats.map((b, i) => (
          <div key={b.id} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>KAPITEL {i + 1}</div>
            <h4 style={{ fontSize: 16, fontFamily: JP, color: C.indigo, margin: '0 0 10px' }}>{b.title}</h4>
            {b.story.map((s, j) => (
              <div key={j} style={{ marginBottom: 12 }}>
                {s.jp && (
                  <div style={{ background: `${C.indigo}0D`, borderRadius: 8, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontFamily: JP, color: C.sumi, lineHeight: 1.9 }}>{renderFuri(s.jp)}</span>
                    <button onClick={() => speak(furiPlain(s.jp))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>🔊</button>
                  </div>
                )}
                {s.text && <p style={{ fontSize: 15, color: C.sumi, lineHeight: 1.7, margin: 0 }}>{s.text}</p>}
              </div>
            ))}
            {i < beats.length - 1 && <div style={{ height: 1, background: C.washiDark, marginTop: 16 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReiseScreen({ onReview }) {
  const { progress, completeLesson, completeWordBlock, completeGrammar, completeChapter, bumpChapterStars } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const [showStory, setShowStory] = useState(false)
  const [sheet, setSheet] = useState(null)        // angetipptes, bereits erledigtes Kapitel
  const [practice, setPractice] = useState(null)  // laufende Kapitel-Übung
  const currentRef = useRef(null)
  const wrapRef = useRef(null)
  const backdropRef = useRef(null)

  // Sterne-Höchststand mit dem aktuellen Kenntnisstand abgleichen. Läuft beim
  // Öffnen der Reise und nach jeder Übung (auch im Üben-Tab, da progress.srs sich
  // ändert) – so heben Übungen die Sterne, ohne dass sie je wieder sinken.
  useEffect(() => {
    bumpChapterStars(computeAllChapterStars(progress))
  }, [progress.srs, progress.completedChapters, progress.chapterStars]) // eslint-disable-line

  useEffect(() => {
    try { currentRef.current?.scrollIntoView({ block: 'center' }) } catch (e) { /* egal */ }
    // Nächsten scrollbaren Vorfahren finden und leichten Parallax aufsetzen.
    let el = wrapRef.current
    while (el && el.scrollHeight <= el.clientHeight + 4) el = el.parentElement
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (backdropRef.current) backdropRef.current.style.transform = `translateY(${el.scrollTop * 0.1}px)`
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const contentNodes = PATH.filter(n => n.type && n.type !== 'goal')
  const doneCount = contentNodes.filter(n => isNodeDone(n, progress)).length
  const allDone = doneCount === contentNodes.length
  // Der Gipfel (goal) leuchtet, sobald alles VOR ihm geschafft ist – unabhängig
  // von Kapiteln, die danach kommen (die Reise geht über den Gipfel hinaus weiter).
  const goalPos = PATH.findIndex(n => n.type === 'goal')
  const summitReached = PATH.slice(0, goalPos).filter(n => n.type && n.type !== 'goal').every(n => isNodeDone(n, progress))

  // ─ Aktive Lektion als Vollbild-Overlay (nutzt bestehende Komponenten) ─
  if (active) {
    const close = () => setActive(null)
    if (active.type === 'kana') {
      const lesson = LESSONS.find(l => l.id === active.id)
      return (
        <LessonPlayer lesson={lesson} onClose={close}
          onComplete={() => {
            if (!(progress.completedLessons || []).includes(active.id)) completeLesson(active.id, lesson.kana.length * XP_PER_KANA)
            close()
          }} />
      )
    }
    if (active.type === 'word') {
      const block = WORD_BLOCKS.find(b => b.id === active.id)
      return (
        <BlockCourse block={block} onClose={close}
          onComplete={() => {
            if (!(progress.completedWordBlocks || []).includes(active.id)) completeWordBlock(active.id, block.words.length * XP_PER_WORD)
            close()
          }} />
      )
    }
    if (active.type === 'grammar') {
      const topic = GRAMMAR.find(t => t.id === active.id)
      const already = (progress.completedGrammar || []).includes(active.id)
      return (
        <GrammarLesson topic={topic} alreadyDone={already} onClose={close}
          onDone={() => { if (!already) completeGrammar(active.id, XP_PER_GRAMMAR); close() }} />
      )
    }
    if (active.type === 'chapter') {
      const chapter = CHAPTER_BY_ID[active.id]
      const already = (progress.completedChapters || []).includes(active.id)
      return (
        <ChapterPlayer chapter={chapter} alreadyDone={already} onClose={close}
          onComplete={() => { if (!already) completeChapter(active.id, XP_PER_CHAPTER); close() }} />
      )
    }
  }

  // ─ Kapitel-Übung als Vollbild-Overlay ─
  if (practice) {
    return <ChapterPractice chapter={practice} onClose={() => setPractice(null)} />
  }

  // ─ Layout der Karte berechnen ─
  const R = 30, AMP = 86, CENTER = 160, XPAT = [0, 1, 0, -1]
  const bands = [], headers = [], laid = []
  let y = 22, ni = 0, foundCurrent = false
  let bandStart = null, bandIdx = -1
  for (const it of PATH) {
    if (it.world) {
      if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
      bandIdx++
      bandStart = y
      headers.push({ y, world: it.world, sub: it.sub })
      y += 50
      continue
    }
    const done = isNodeDone(it, progress)
    let state
    if (it.type === 'goal') state = summitReached ? 'done' : 'locked'
    else if (done) state = 'done'          // erledigt = immer „done" (Sterne + antippbar), auch nach der aktuellen Station
    else if (foundCurrent) state = 'locked'
    else { state = 'current'; foundCurrent = true }

    const x = CENTER + AMP * XPAT[ni % 4]
    laid.push({ node: it, state, x, y: y + R })
    y += 2 * R + 56
    ni++
  }
  if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
  const trackH = y + 60
  const road = roadPath(laid.map(n => [n.x, n.y]))
  const goal = laid.find(n => n.node.type === 'goal')
  const current = laid.find(n => n.state === 'current')   // nächste offene Station

  // Sterne für Ziel-Knoten (z. B. Gipfel): gerundeter Schnitt der Kapitel-Sterne im
  // Pfad-Abschnitt bis zu diesem Ziel (ab Reisebeginn bzw. dem vorigen Ziel) – spiegelt,
  // wie gut die Reise bis dahin sitzt. Funktioniert auch bei mehreren Zielen.
  const goalStarsById = {}
  let segChapters = []
  PATH.forEach(n => {
    if (n.type === 'chapter') segChapters.push(n.id)
    else if (n.type === 'goal') {
      const vals = segChapters.map(id => chapterStarsShown(CHAPTER_BY_ID[id], progress)).filter(v => v > 0)
      goalStarsById[n.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
      segChapters = []
    }
  })

  // Parallax-Hintergrund je Welt-Band: Land (Ankunft) → Berge (Natur/Aufstieg) →
  // Stadt (Tokyo) → Tempelgarten (Schluss). Reihenfolge folgt PATH-Welt-Index;
  // bei neuen Welten hier ergänzen (Default „mountain").
  const BAND_THEMES = ['country', 'country', 'mountain', 'mountain', 'mountain', 'mountain', 'city', 'city', 'city', 'garden', 'city', 'country']
  const backdropH = trackH + 80
  const bandsForBackdrop = bands.map((b, i) => ({
    ...b,
    top: i === 0 ? 0 : b.top,
    bottom: i === bands.length - 1 ? backdropH : b.bottom,
    theme: BAND_THEMES[b.idx] || 'mountain',
  }))
  const backdrop = buildBackdrop(bandsForBackdrop)

  return (
    <div ref={wrapRef} style={{ paddingBottom: 8 }}>
      {showStory && <StoryJournal progress={progress} onClose={() => setShowStory(false)} />}
      {sheet && (
        <ChapterSheet
          chapter={CHAPTER_BY_ID[sheet.id]}
          stars={chapterStarsShown(CHAPTER_BY_ID[sheet.id], progress)}
          onReplay={() => { setActive(sheet); setSheet(null) }}
          onPractice={() => { setPractice(CHAPTER_BY_ID[sheet.id]); setSheet(null) }}
          onClose={() => setSheet(null)}
        />
      )}
      {/* Intro + Tagesstatus + Gesamtfortschritt */}
      <div style={{ padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
          Deine Reise 旅
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
          Ein Weg vom Anfang über den Gipfel hinaus – Schrift, Wörter und Grammatik Schritt für Schritt.
        </p>

        {/* Tagesstatus — eingebettet aus dem früheren „Heute"-Tab */}
        <DailyStrip onReview={onReview} />

        {/* Direkt an der nächsten offenen Station weitermachen */}
        {current ? (
          <Btn onClick={() => setActive(current.node)} style={{ width: '100%', marginBottom: 12 }}>
            Weiter: {pathNodeMeta(current.node).label} →
          </Btn>
        ) : (
          <Btn variant="secondary" onClick={onReview} style={{ width: '100%', marginBottom: 12 }}>
            Alles gemeistert 🎉 – Wiederholen
          </Btn>
        )}

        <div style={{ height: 8, background: C.washiDark, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(doneCount / contentNodes.length * 100)}%`, background: C.matcha, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
          {doneCount} / {contentNodes.length} Stationen gemeistert
        </div>
        <button onClick={() => setShowStory(true)}
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 10,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, color: C.indigo, cursor: 'pointer',
          }}>
          📖 Deine Geschichte
        </button>
      </div>

      {/* Karte */}
      <div style={{ position: 'relative', width: '100%', height: trackH, overflow: 'hidden' }}>
        {/* Durchgängiger Parallax-Hintergrund */}
        <div ref={backdropRef} aria-hidden="true" style={{ position: 'absolute', top: -40, left: 0, right: 0, height: backdropH, zIndex: 0, willChange: 'transform' }}>
          <svg width="100%" height={backdropH} viewBox={`0 0 400 ${backdropH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {backdrop}
          </svg>
        </div>

        {/* Fuji hinter dem Gipfel */}
        {goal && (
          <svg width="180" height="120" viewBox="0 0 180 120" style={{ position: 'absolute', left: '50%', top: goal.y - 96, transform: 'translateX(-50%)', opacity: 0.95, zIndex: 1 }} aria-hidden="true">
            <polygon points="40,110 90,18 140,110" fill="#B7C4D0" />
            <polygon points="72,46 90,18 108,46 98,52 90,44 82,52" fill="#F4F2EC" />
          </svg>
        )}

        {/* zentrierte Spur mit Weg + Stationen */}
        <div style={{ position: 'relative', zIndex: 1, width: 320, margin: '0 auto', height: trackH }}>
          <svg width="320" height={trackH} viewBox={`0 0 320 ${trackH}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
            {laid[0] && sceneTorii(258, laid[0].y - 30, 0.72, 'torii')}
            <path d={road} fill="none" stroke="#D7CEB6" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#EFEBE0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#C2B894" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" />
          </svg>

          {/* Welten-Überschriften */}
          {headers.map((h, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: h.y, textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 16, padding: '4px 14px' }}>
                <span style={{ fontFamily: JP, fontSize: 14, color: C.indigo, marginRight: 6 }}>{h.world}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{h.sub}</span>
              </span>
            </div>
          ))}

          {/* Stationen */}
          {laid.map((n, i) => {
            const meta = pathNodeMeta(n.node)
            const [bg, edge] = STATE_PALETTE[n.state]
            const locked = n.state === 'locked'
            const isGoal = n.node.type === 'goal'
            const Rr = isGoal ? 34 : R
            // Abgeschlossene Kapitel öffnen ein Info-Sheet (Sterne + Übung + erneut erleben),
            // statt direkt erneut die Geschichte zu starten.
            const doneChapter = n.node.type === 'chapter' && n.state === 'done'
            const goalDone = n.node.type === 'goal' && n.state === 'done'
            const stars = doneChapter ? chapterStarsShown(CHAPTER_BY_ID[n.node.id], progress)
              : goalDone ? (goalStarsById[n.node.id] || 0) : 0
            const onTap = () => { if (locked || isGoal) return; if (doneChapter) setSheet(n.node); else setActive(n.node) }
            return (
              <div key={i} ref={n.state === 'current' ? currentRef : null}
                style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', width: 2 * Rr + 64, textAlign: 'center' }}>
                <button onClick={onTap} disabled={locked || isGoal}
                  style={{
                    position: 'relative', width: 2 * Rr, height: 2 * Rr, borderRadius: '50%',
                    background: bg, border: `3px solid ${edge}`, cursor: locked || isGoal ? 'default' : 'pointer',
                    boxShadow: n.state === 'current' ? `0 0 0 6px ${C.shu}28` : 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}>
                  <span style={{ fontFamily: JP, fontSize: isGoal ? 30 : 24, color: locked ? C.textMuted : '#fff', lineHeight: 1 }}>
                    {locked ? '🔒' : meta.face}
                  </span>
                  {n.state === 'done' && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#E8B84B', color: '#7A5A14', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  )}
                </button>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-block', background: 'rgba(239,235,224,0.85)', borderRadius: 8, padding: '1px 6px', fontSize: 11, color: C.sumi, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {meta.label}
                  </span>
                </div>
                {(doneChapter || goalDone) && (
                  <div style={{ marginTop: 3 }}>
                    <span style={{ display: 'inline-block', background: 'rgba(239,235,224,0.85)', borderRadius: 8, padding: '1px 5px' }}>
                      <Stars count={stars} size={11} />
                    </span>
                  </div>
                )}
                {n.state === 'current' && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: C.shu, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>START</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
