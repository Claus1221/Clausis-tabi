import { useState, useEffect, useRef, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { XP_PER_CARD } from '../../lib/xp.js'
import { Card, Btn } from '../../components/ui.jsx'
import { UebenHead, UebenEmpty, UebenDone } from '../../components/ueben.jsx'
import { startSession, rateCard, currentCard, isFinished } from '../lib/reviewQueue.js'
import { SCRIPT_DATA } from '../data/script.js'
import { learnedItems, itemInfo, dueItems, alone, srsEntry } from '../lib/learned.js'
import { SRS_RATINGS, feedbackColor } from '../lib/srs.js'
import { pickDrill, topicForKey, GRAMMAR_QUALITY } from '../lib/grammarSrs.js'
import { GapDrill } from '../components/GapDrill.jsx'
import { buildScriptQuiz, isReadable, shuffle } from '../lib/scriptQuiz.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { useSound, ListenButton } from '../components/sound.jsx'
import { TappableSentence, useShowRoman } from '../components/text.jsx'

// ─── Üben (Yatra) ─────────────────────────────────────────────────────────────
// Gegenstück zu src/screens/ueben.jsx: Wiederholen fälliger Karten (SRS – Schriftzeichen
// und Wörter als Karteikarte, Grammatik als Lückensatz), Fleiß-Runde über alles Gelernte
// und drei Erkennen-Arten (nur Zeichen).
// Alles geht ohne Ton: Hören ist eine Zusatz-Art, nie die einzige, und auch dort lässt
// sich das Geschriebene einblenden. Karten-Schlüssel kommen aus learned.js (NFC).

const HEAD_CLOSE = 44 // Tippfläche des ✕ in UebenHead

// Schriftgröße für die große Kartenfront: Verbindungen und Vokalzeichen am क sind breiter,
// Wörter noch breiter (माफ गर्नुहोस् muss bei 360 px in eine Zeile passen).
const frontSize = s => {
  const n = [...s].length
  return n <= 3 ? 80 : n <= 6 ? 56 : n <= 10 ? 44 : 34
}

// ─── Wiederholen (SRS) ────────────────────────────────────────────────────────
// Modus 'due' = fällige Karten; 'free' = Fleiß über ALLE gelernten Karten (begrenzte
// Runde). Die Regeln der Runde (Nochmal ans Ende, höchstens eine Bewertung je Karte,
// nur beim Start fällige Karten) stehen getestet in lib/reviewQueue.js.
// Der Stapel wird beim Öffnen aus `progress` gebaut – das ist sicher, weil NepaliApp
// keinen Screen zeigt, solange der Lernstand noch lädt.
function SRSQuiz({ onClose, initialMode = 'due', sound }) {
  const { progress, awardXp, reviewCard, settings } = useContext(ProgressCtx)
  const showRoman = useShowRoman()
  const learned = learnedItems(progress)

  // Gemischt, damit nicht immer die Lektionsreihenfolge abgefragt wird.
  const buildDeck = (m, due) => (m === 'free' ? shuffle(learned).slice(0, settings.freeSize) : shuffle(due))

  // Eine Runde = Modus + Stapelgröße (für „x / N gekonnt“) + Zustand aus reviewQueue.
  const [round, setRound] = useState(() => {
    const due = dueItems(progress)
    const deck = buildDeck(initialMode, due)
    return { mode: initialMode, size: deck.length, s: startSession(deck, due), turn: 0 }
  })
  const [flipped, setFlipped] = useState(false)
  // Grammatik: zuletzt gezeigte Frage je Karte – kommt die Karte nach „Nochmal“ wieder,
  // zeigt pickDrill eine andere Übung desselben Themas.
  const lastDrill = useRef({})
  const { mode, size, s: session, turn } = round
  const item = currentCard(session)
  // Jüngster Rundenstand, schon bevor neu gerendert ist; folgt jedem neuen `round`.
  const liveRef = useRef(session)
  const seenRound = useRef(round)
  if (seenRound.current !== round) { seenRound.current = round; liveRef.current = session }

  // Nichts weiterreden lassen, wenn die Karte wechselt oder die Runde endet.
  useEffect(() => () => stopSpeaking(), [item, flipped])

  // Fleiß-Runde: Karten, die beim ersten Start fällig waren und noch nicht bewertet
  // sind, zählen weiter als fällig – alle anderen verschieben den Plan nicht.
  const startFree = () => {
    const d = buildDeck('free')
    setRound(r => ({ mode: 'free', size: d.length, s: startSession(d, session.pending), turn: r.turn + 1 }))
    setFlipped(false)
  }
  const { passed, lapses, repeats } = session

  if (size === 0) {
    const canFree = mode !== 'free' && learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{mode === 'free' ? 'Noch nichts zu üben' : 'Nichts fällig'}</h3>
        <p style={{ color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
          {mode === 'free'
            ? 'Lerne erst ein paar Zeichen auf der Reise – dann kannst du sie hier nach Lust und Laune üben.'
            : 'Gerade ist nichts zur Wiederholung fällig. Du kannst trotzdem alles Gelernte durchgehen.'}
        </p>
        {canFree && <Btn onClick={startFree} style={{ width: '100%', minHeight: 48, marginBottom: 8 }}>🔥 Trotzdem üben</Btn>}
        <Btn onClick={onClose} variant={canFree ? 'ghost' : 'primary'} style={{ width: '100%', minHeight: 48 }}>Zurück</Btn>
      </div>
    )
  }

  if (isFinished(session)) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{mode === 'free' ? '🔥' : '✅'}</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{mode === 'free' ? 'Fleiß-Runde geschafft!' : 'Alle fälligen Karten geschafft!'}</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {passed} Karten · +{passed * XP_PER_CARD} XP{lapses > 0 && ` · ${lapses}× wiederholt`}
        </p>
        <Btn onClick={startFree} style={{ width: '100%', minHeight: 48, marginBottom: 8 }}>
          🔥 {mode === 'free' ? 'Noch eine Runde' : 'Weiter üben (Fleiß)'}
        </Btn>
        <Btn onClick={onClose} variant="ghost" style={{ width: '100%', minHeight: 48 }}>Fertig</Btn>
      </div>
    )
  }

  const info = itemInfo(item)
  const isWord = info.kind === 'word'

  const rate = quality => {
    // Schreiben (reviewCard) nur, wenn reviewQueue es verlangt: erste Bewertung einer
    // beim Start fälligen Karte – auch „Nochmal“, dann ist sie in ein paar Stunden dran.
    // Gerechnet wird auf liveRef, nicht auf dem gerenderten `session`: zwei Tipps im
    // selben Render-Durchgang sähen sonst beide denselben Stand und schrieben doppelt.
    const { state, review } = rateCard(liveRef.current, quality)
    if (state === liveRef.current) return
    liveRef.current = state
    if (review) reviewCard(review.key, review.quality)
    if (quality >= 3) awardXp(XP_PER_CARD)
    setRound(r => ({ ...r, s: state, turn: r.turn + 1 }))
    setFlipped(false)
  }

  const headTitle = `${mode === 'free' ? '🔥 Fleiß · ' : ''}${passed} / ${size} gekonnt · noch ${session.queue.length}`

  // Grammatik-Karte: EIN Lückensatz statt Karteikarte; richtig beim ersten Versuch = Gut,
  // falsch = Nochmal (kommt am Rundenende wieder, dann mit einer anderen Übung – avoid).
  // key je Zug: auch dieselbe Karte im nächsten Zug ist eine neue, offene Aufgabe.
  if (info.kind === 'grammar') {
    return (
      <div style={{ padding: '12px 20px 20px' }}>
        <UebenHead title={headTitle} onClose={onClose} closeSize={HEAD_CLOSE} />
        <GrammarReview key={`${item}|${turn}`} info={info} topic={topicForKey(item)} entry={srsEntry(progress, item)}
          avoid={lastDrill.current[item] ?? null} sound={sound} again={repeats.includes(item)}
          onShown={q => { lastDrill.current[item] = q }}
          onDone={ok => rate(ok ? GRAMMAR_QUALITY.right : GRAMMAR_QUALITY.wrong)} />
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 20px 20px' }}>
      <UebenHead title={headTitle} onClose={onClose} closeSize={HEAD_CLOSE} />

      <Card style={{ textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 14, position: 'relative' }}>
        {repeats.includes(item) && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <div style={{ fontSize: frontSize(info.front), fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{info.front}</div>
        {/* Wörter: die Umschrift steht vorn nur mit Schalter (dann ist die Bedeutung gefragt,
            nicht die Lesung). Zeichen: vorn nie – ihre Lesung IST die Frage. */}
        {isWord && showRoman && !flipped && <div style={{ fontSize: 16, color: C.indigo, fontWeight: 600 }}>{info.roman}</div>}
        {flipped ? (
          isWord ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{info.roman}</div>
              <div style={{ fontSize: 18, color: C.sumi, marginTop: 4, lineHeight: 1.4 }}>{info.de}</div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {info.front !== info.key && (
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
                  allein: <span style={{ fontFamily: NE, fontSize: 20, color: C.sumi }}>{alone(info.key)}</span>
                </div>
              )}
              <div style={{ fontSize: 26, fontWeight: 700, color: C.indigo }}>{info.roman}</div>
              {info.kindLabel && (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.textMuted, textTransform: 'uppercase', marginTop: 2 }}>{info.kindLabel}</div>
              )}
            </div>
          )
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>{isWord ? 'Was bedeutet das?' : 'Wie liest man das?'}</div>
        )}
      </Card>

      {flipped && (
        <>
          {isWord ? (
            info.ex && (
              <Card style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELSATZ</div>
                <TappableSentence dev={info.ex.dev} roman={info.ex.roman} tokens={info.ex.tokens} size={22} sound={sound} />
                <div style={{ fontSize: 14, color: C.indigo, marginTop: 6, lineHeight: 1.45 }}>„{info.ex.de}“</div>
              </Card>
            )
          ) : info.de && (
            <div style={{ background: `${C.shu}10`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.55, margin: 0 }}>💡 {info.de}</p>
            </div>
          )}
          {/* Nur mit Ton: ohne Ton fehlt der Knopf ganz (die Umschrift steht ja da). */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}><ListenButton text={info.say} sound={sound} quiet /></div>
        </>
      )}

      {!flipped ? (
        <Btn onClick={() => setFlipped(true)} variant="secondary" style={{ width: '100%', minHeight: 48 }}>Aufdecken</Btn>
      ) : (
        <>
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 6 }}>Wie gut wusstest du es?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
            {SRS_RATINGS.map(([label, color, q]) => (
              <button key={label} onClick={() => rate(q)}
                style={{
                  minHeight: 48, padding: '10px 2px', borderRadius: 8, border: `2px solid ${color}`,
                  background: `${color}15`, color, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Eine Grammatik-Karte im Wiederholen: Thema als Kopf, darunter EIN Lückensatz. Die
// Übung wird einmal beim Erscheinen gewählt (useState-Startwert) – ein Neu-Rendern
// (etwa wenn der Lernstand nach reviewCard nachlädt) wechselt sie nicht aus.
// Thema ohne Übungen oder aus einer neueren Version: Weiter ohne Abfrage, nie hängen.
function GrammarReview({ info, topic, entry, avoid, sound, again, onShown, onDone }) {
  const [ex] = useState(() => pickDrill(topic, entry, Math.random, avoid))
  useEffect(() => { if (ex) onShown(ex.q) }, []) // eslint-disable-line
  const head = (
    <div style={{ textAlign: 'center', marginBottom: 10, position: 'relative' }}>
      {again && <div style={{ fontSize: 11, color: C.shu, fontWeight: 600, marginBottom: 2 }}>🔁 nochmal</div>}
      {/* Nur der Titel: er nennt das Zeichen des Themas meist schon (हो – „ist“). */}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.textMuted }}>GRAMMATIK · </span>
      <span style={{ fontSize: 14, color: C.sumi }}>{info.de}</span>
    </div>
  )
  if (!ex) {
    return (
      <>
        {head}
        <Card style={{ textAlign: 'center', padding: '18px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{info.summary || 'Zu diesem Thema gibt es hier noch keine Übung.'}</div>
        </Card>
        <Btn onClick={() => onDone(true)} style={{ width: '100%', minHeight: 48 }}>Weiter →</Btn>
      </>
    )
  }
  return <GapDrill ex={ex} sound={sound} head={head} onDone={onDone} />
}

// ─── Erkennen ─────────────────────────────────────────────────────────────────
// 'lesen'   Zeichen sehen → Lesung wählen
// 'finden'  Lesung sehen → Zeichen wählen
// 'hoeren'  hören → Zeichen wählen (nur mit Ton; das Geschriebene lässt sich einblenden)
// Eine Fragenquelle für alle drei (buildScriptQuiz): keine zwei Optionen mit gleicher
// Lesung – so ist auch umgekehrt nie mehr als ein Zeichen richtig (श/ष, ं/ँ).
const PRACTICE_TITLE = { lesen: 'Lesen', finden: 'Finden', hoeren: 'Hören' }

function findPrompt(ch) {
  const d = SCRIPT_DATA[ch]
  if (d.kind === 'digit') return 'Welche Ziffer ist das?'
  if (d.shown !== ch) return 'Welches Zeichen bringt diesen Laut mit?'
  return 'Welches Zeichen liest man so?'
}

function PracticeQuiz({ mode, onClose }) {
  const { progress, awardXp, settings } = useContext(ProgressCtx)
  const learned = learnedItems(progress).filter(isReadable)
  const [rounds] = useState(() => buildScriptQuiz(learned, Math.random, settings.options).slice(0, settings.roundSize))
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState(null) // gewählter Index
  const [correct, setCorrect] = useState(0)
  const [showWritten, setShowWritten] = useState(false) // Hören: Geschriebenes eingeblendet

  const cur = rounds[idx]
  // Hören: jede neue Frage einmal vorlesen; beim Wechsel/Schließen verstummen.
  useEffect(() => {
    if (mode === 'hoeren' && cur) speak(SCRIPT_DATA[cur.char].say)
    return () => stopSpeaking()
  }, [mode, idx]) // eslint-disable-line

  if (learned.length < 4) {
    return <UebenEmpty onClose={onClose} text="Lerne zuerst ein paar Zeichen auf der Reise – dann kannst du sie hier üben." />
  }
  if (idx >= rounds.length) return <UebenDone correct={correct} total={rounds.length} onClose={onClose} />

  const okIdx = cur.optionChars.indexOf(cur.char)
  const revealed = answer !== null
  const choose = i => {
    if (revealed) return
    setAnswer(i)
    if (i === okIdx) { awardXp(XP_PER_CARD); setCorrect(c => c + 1) }
  }
  const next = () => { setAnswer(null); setShowWritten(false); setIdx(i => i + 1) }
  const d = SCRIPT_DATA[cur.char]
  const charOptions = mode !== 'lesen'

  return (
    <div style={{ padding: '12px 20px 20px' }}>
      <UebenHead title={PRACTICE_TITLE[mode]} idx={idx} total={rounds.length} onClose={onClose} closeSize={HEAD_CLOSE} />

      <Card style={{ textAlign: 'center', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 14 }}>
        {mode === 'lesen' && (
          <>
            <div style={{ fontSize: frontSize(cur.shown), fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{cur.shown}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{cur.prompt}</div>
          </>
        )}
        {mode === 'finden' && (
          <>
            <div style={{ fontSize: 40, fontWeight: 700, color: C.indigo, marginBottom: 6 }}>{cur.correct}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{findPrompt(cur.char)}</div>
          </>
        )}
        {mode === 'hoeren' && (
          <>
            <button onClick={() => speak(d.say)} aria-label="Nochmal anhören"
              style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40, width: 80, height: 80, fontSize: 34, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
            {/* Ausweg, falls der Ton doch nicht kommt: nie nur übers Hören lösbar. */}
            {showWritten ? (
              <div style={{ fontSize: 22, fontWeight: 700, color: C.indigo, marginTop: 8 }}>{cur.correct}</div>
            ) : !revealed && (
              <button onClick={() => setShowWritten(true)}
                style={{ minHeight: 44, marginTop: 4, background: 'none', border: 'none', color: C.indigo, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
                Nichts gehört? Umschrift zeigen
              </button>
            )}
          </>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map((roman, i) => {
          const fb = feedbackColor(!revealed ? 'neutral' : i === okIdx ? 'correct' : i === answer ? 'wrong' : 'neutral')
          const label = charOptions ? SCRIPT_DATA[cur.optionChars[i]].shown : roman
          return (
            <button key={i} onClick={() => choose(i)} disabled={revealed}
              style={{
                minHeight: 56, padding: '10px 6px', borderRadius: 10, border: `2px solid ${fb.border}`, background: fb.bg,
                fontSize: charOptions ? 30 : 18, fontFamily: charOptions ? NE : 'inherit', lineHeight: 1.2,
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{label}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ textAlign: 'center', marginTop: 12, color: answer === okIdx ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === okIdx ? '✓ Richtig!' : <>✗ Richtig: <span style={{ fontFamily: NE }}>{cur.shown}</span> = {cur.correct}</>}
          </p>
          {answer !== okIdx && <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, textAlign: 'center' }}>{d.tip}</p>}
          <Btn onClick={next} style={{ marginTop: 8, width: '100%', minHeight: 48 }}>
            {idx === rounds.length - 1 ? 'Übung abschließen →' : 'Weiter →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function UebenScreen({ initialMode, onConsumeInitial }) {
  const { progress } = useContext(ProgressCtx)
  const [mode, setMode] = useState(initialMode || null)
  const sound = useSound()
  // Einmaliger Sprung (z. B. „jetzt wiederholen“ aus Fortschritt) wird verbraucht.
  useEffect(() => { if (initialMode) onConsumeInitial?.() }, []) // eslint-disable-line

  const close = () => setMode(null)
  if (mode === 'srs') return <SRSQuiz onClose={close} sound={sound} />
  if (mode === 'fleiss') return <SRSQuiz initialMode="free" onClose={close} sound={sound} />
  if (mode === 'lesen' || mode === 'finden') return <PracticeQuiz mode={mode} onClose={close} />
  // Ein Sprung nach „Hören“ ohne Ton (veralteter Zustand) fällt auf „Finden“ zurück.
  if (mode === 'hoeren') return <PracticeQuiz mode={sound ? 'hoeren' : 'finden'} onClose={close} />

  const learnedCount = learnedItems(progress).length
  const dueCount = dueItems(progress).length

  const tile = ({ id, icon, title, sub, color, disabled }) => (
    <button key={id} onClick={() => !disabled && setMode(id)} disabled={disabled}
      style={{
        background: '#fff', border: `2px solid ${color}20`, borderRadius: 12, padding: '14px 12px',
        textAlign: 'left', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1, minHeight: 44,
      }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.35 }}>{sub}</div>
    </button>
  )

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 4 }}>
        Üben <span style={{ fontFamily: NE }}>अभ्यास</span>
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        Dein roter Faden ist die Reise – hier festigst du, was du dort gelernt hast.
      </p>

      {dueCount > 0 ? (
        <button onClick={() => setMode('srs')} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          background: `${C.shu}12`, border: `2px solid ${C.shu}40`, borderRadius: 14,
          padding: '14px 16px', marginBottom: 16, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 26 }}>🎯</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: C.shu }}>{dueCount} {dueCount === 1 ? 'Karte' : 'Karten'} fällig</span>
            <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>Jetzt wiederholen, bevor sie aus dem Kopf rutschen</span>
          </span>
          <span style={{ fontSize: 18, color: C.shu }}>›</span>
        </button>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 26 }}>{learnedCount ? '✅' : '🌱'}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: C.sumi }}>{learnedCount ? 'Alles erledigt' : 'Noch nichts gelernt'}</span>
            <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>
              {learnedCount ? 'Aktuell ist nichts zur Wiederholung fällig' : 'Die erste Station der Reise bringt deine ersten Zeichen'}
            </span>
          </span>
        </Card>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>WIEDERHOLEN</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {tile({ id: 'srs', icon: '🗂', title: 'Wiederholen', sub: dueCount > 0 ? `${dueCount} fällig` : 'Nichts fällig', color: C.shu })}
        {tile({ id: 'fleiss', icon: '🔥', title: 'Fleiß-Übung', sub: 'Alles Gelernte, jederzeit', color: '#C2410C' })}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>ERKENNEN</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {tile({ id: 'lesen', icon: '👁', title: 'Lesen', sub: 'Zeichen sehen → Lesung wählen', color: C.indigo })}
        {tile({ id: 'finden', icon: '🔎', title: 'Finden', sub: 'Lesung sehen → Zeichen wählen', color: C.matcha })}
        {tile({
          id: 'hoeren', icon: '👂', title: 'Hören', color: '#1A7A6E', disabled: !sound,
          sub: sound === null ? 'Ton wird geprüft…' : sound ? 'Hören → Zeichen wählen' : '🔇 Auf diesem Gerät noch kein Nepali-Ton',
        })}
      </div>
    </div>
  )
}
