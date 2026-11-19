import { useState, useEffect, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { XP_PER_CARD } from '../../lib/xp.js'
import { Card, Btn } from '../../components/ui.jsx'
import { UebenEmpty, UebenDone } from '../../components/ueben.jsx'
import { SCRIPT_DATA } from '../data/script.js'
import { learnedItems, itemInfo, dueItems, alone } from '../lib/learned.js'
import { SRS_RATINGS, feedbackColor } from '../lib/srs.js'
import { buildScriptQuiz, isReadable, shuffle } from '../lib/scriptQuiz.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { useSound, ListenButton } from '../components/sound.jsx'

// ─── Üben (Yatra) ─────────────────────────────────────────────────────────────
// Gegenstück zu src/screens/ueben.jsx, heute nur für Schriftzeichen: Wiederholen
// fälliger Karten (SRS), Fleiß-Runde über alles Gelernte und drei Erkennen-Arten.
// Alles geht ohne Ton: Hören ist eine Zusatz-Art, nie die einzige, und auch dort lässt
// sich das Geschriebene einblenden. Karten-Schlüssel kommen aus learned.js (NFC).

// Kopfzeile wie UebenHead (components/ueben.jsx), aber mit 44-px-Schließen-Knopf –
// das ✕ dort ist für Finger zu klein, und der geteilte Baustein bleibt unverändert.
function Head({ title, idx, total, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ color: C.textMuted, fontSize: 13 }}>{title}{total ? ` · ${idx + 1} / ${total}` : ''}</span>
      <button onClick={onClose} aria-label="Übung schließen" style={{
        width: 44, height: 44, marginRight: -10, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18,
      }}>✕</button>
    </div>
  )
}

// Schriftgröße für die große Kartenfront: Verbindungen und Vokalzeichen am क sind breiter.
const frontSize = s => ([...s].length > 3 ? 56 : 80)

// ─── Wiederholen (SRS) ────────────────────────────────────────────────────────
// Modus 'due' = fällige Karten; 'free' = Fleiß über ALLE gelernten Karten (begrenzte
// Runde). Nur wirklich fällige Karten verschieben den Plan – so bringt Vorab-Üben den
// Wiederholungsplan nicht durcheinander (wie im Japanischen).
function SRSQuiz({ onClose, initialMode = 'due', sound }) {
  const { progress, awardXp, reviewCard, settings } = useContext(ProgressCtx)
  const learned = learnedItems(progress)
  const [dueSet, setDueSet] = useState(() => new Set(dueItems(progress)))

  // Gemischt, damit nicht immer die Lektionsreihenfolge abgefragt wird.
  const buildDeck = m => (m === 'free' ? shuffle(learned).slice(0, settings.freeSize) : shuffle([...dueSet]))

  const [mode, setMode] = useState(initialMode)
  const [deck, setDeck] = useState(() => buildDeck(initialMode))
  const [queue, setQueue] = useState(deck)
  const [flipped, setFlipped] = useState(false)
  const [passed, setPassed] = useState(0)
  const [lapses, setLapses] = useState(0)
  const [repeats, setRepeats] = useState(() => new Set())

  // Nichts weiterreden lassen, wenn die Karte wechselt oder die Runde endet.
  useEffect(() => () => stopSpeaking(), [queue[0], flipped]) // eslint-disable-line

  const startFree = () => {
    const d = buildDeck('free')
    setMode('free'); setDeck(d); setQueue(d)
    setPassed(0); setLapses(0); setRepeats(new Set()); setFlipped(false)
  }

  if (deck.length === 0) {
    const canFree = mode !== 'free' && learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{mode === 'free' ? 'Noch nichts zu üben' : 'Nichts fällig'}</h3>
        <p style={{ color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
          {mode === 'free'
            ? 'Lerne erst ein paar Zeichen auf der Reise – dann kannst du sie hier nach Lust und Laune üben.'
            : 'Gerade ist nichts zur Wiederholung fällig. Du kannst trotzdem alle gelernten Zeichen durchgehen.'}
        </p>
        {canFree && <Btn onClick={startFree} style={{ width: '100%', minHeight: 48, marginBottom: 8 }}>🔥 Trotzdem üben</Btn>}
        <Btn onClick={onClose} variant={canFree ? 'ghost' : 'primary'} style={{ width: '100%', minHeight: 48 }}>Zurück</Btn>
      </div>
    )
  }

  if (queue.length === 0) {
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

  const item = queue[0]
  const info = itemInfo(item)

  const rate = quality => {
    // Fällige Karte: Bewertung sofort in den Plan (auch „Nochmal“ – dann ist sie in ein
    // paar Stunden wieder dran). Danach zählt sie in dieser Runde nicht mehr als fällig.
    if (dueSet.has(item)) {
      reviewCard(item, quality)
      setDueSet(prev => { const n = new Set(prev); n.delete(item); return n })
    }
    if (quality < 3) {
      // „Nochmal“: ans Ende der Warteschlange, kommt in dieser Runde wieder.
      setRepeats(prev => new Set(prev).add(item))
      setQueue(prev => [...prev.slice(1), prev[0]])
      setLapses(l => l + 1)
    } else {
      awardXp(XP_PER_CARD)
      setPassed(p => p + 1)
      setQueue(prev => prev.slice(1))
    }
    setFlipped(false)
  }

  return (
    <div style={{ padding: '12px 20px 20px' }}>
      <Head title={`${mode === 'free' ? '🔥 Fleiß · ' : ''}${passed} / ${deck.length} gekonnt · noch ${queue.length}`} onClose={onClose} />

      <Card style={{ textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 14, position: 'relative' }}>
        {repeats.has(item) && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <div style={{ fontSize: frontSize(info.front), fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{info.front}</div>
        {flipped ? (
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
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>Wie liest man das?</div>
        )}
      </Card>

      {flipped && (
        <>
          {info.de && (
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
      <Head title={PRACTICE_TITLE[mode]} idx={idx} total={rounds.length} onClose={onClose} />

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
        {tile({ id: 'fleiss', icon: '🔥', title: 'Fleiß-Übung', sub: 'Alle gelernten Zeichen, jederzeit', color: '#C2410C' })}
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
