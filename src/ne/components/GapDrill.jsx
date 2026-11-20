import { useState, useRef, useEffect } from 'react'
import { C, NE } from '../../theme.js'
import { Btn, Card } from '../../components/ui.jsx'
import { choiceState } from '../lib/choice.js'
import { shuffle } from '../lib/scriptQuiz.js'
import { readingOf } from '../lib/readings.js'
import { solved } from '../data/grammar.js'
import { stopSpeaking } from '../lib/speech.js'
import { ListenButton } from './sound.jsx'
import { useShowRoman } from './text.jsx'
import { Choice, ChoiceGrid } from './Choice.jsx'

// ─── Lückensatz (Grammatik) ───────────────────────────────────────────────────
// Gegenstück zu src/components/grammarDrill.jsx: ein Nepali-Satz mit Lücke ＿＿, darunter
// die Möglichkeiten zum Antippen. Dieselbe Form in der Lektion (GrammarLesson) und im
// Wiederholungsplan (Üben) – Grammatik wird angewendet, nicht als Karteikarte umgedreht.
// Die Bewertung ergibt sich aus der Antwort (onDone(richtig?)), keine Selbsteinschätzung.
//
// Nach dem Antippen: richtige Option grün, gewählte falsche rot, der Hinweis (warum),
// der GELÖSTE Satz mit Umschrift (nach Schalter) und Übersetzung – so ist alles ohne Ton
// verständlich. Anhören erst danach und nur mit Ton (vorher wäre der Ton die Lösung).
// Optionen einmal je Erscheinen gemischt (useState-Startwert), damit sie beim Neu-Rendern
// nicht springen; wer dieselbe Übung neu zeigen will, gibt einen neuen key.
//
// ex     – Übung aus data/grammar.js { q, a, options, hint, de, roman }
// head   – optionale Kopfzeile über der Karte (Thema, Zähler)
// sound  – useSound()-Stand; nextLabel – Text des Weiter-Knopfs oder Funktion (richtig?) → Text
// readOption – Umschrift einer Option (Standard readingOf; Kapitel geben chapterReading,
//          weil ihre Wörter nicht in der Grammatik-Tafel stehen)
export const GAP = '＿＿'

export function GapDrill({ ex, onDone, sound, head = null, nextLabel = 'Weiter →', readOption = readingOf }) {
  const showRoman = useShowRoman()
  const [options] = useState(() => shuffle(ex.options))
  const [ans, setAns] = useState(null)
  // Sperre über die Ref: zwei Tipps im selben Render-Durchgang (Doppeltipp auf „Weiter“)
  // dürfen onDone nicht zweimal rufen – im Üben hieße das zwei Bewertungen.
  const doneRef = useRef(false)
  useEffect(() => () => stopSpeaking(), [])
  const revealed = ans !== null
  const correct = ans === ex.a
  const [before, after = ''] = ex.q.split(GAP)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone(correct)
  }

  return (
    <div>
      {head}
      <Card style={{ marginBottom: 14, padding: '16px 16px 14px' }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>{revealed ? 'Der ganze Satz:' : 'Was fehlt?'}</div>
        <div style={{ fontSize: 26, fontFamily: NE, lineHeight: 1.6, color: C.sumi }}>
          {before}
          {revealed ? (
            // Immer grün: hier steht die richtige Füllung, auch nach einem Fehler.
            <span style={{ color: C.matcha, fontWeight: 600, borderBottom: `2px solid ${C.matcha}` }}>{ex.a}</span>
          ) : (
            // Sichtbare Lücke statt der Unterstriche aus den Daten; für Vorleser benannt.
            <span role="img" aria-label="Lücke"
              style={{ display: 'inline-block', minWidth: '2.2em', height: '1.1em', verticalAlign: '-0.15em', borderBottom: `3px solid ${C.shu}`, background: `${C.shu}10`, borderRadius: '4px 4px 0 0', margin: '0 2px' }} />
          )}
          {after}
        </div>
        {revealed && (
          <>
            {showRoman && ex.roman && <div style={{ fontSize: 14, color: C.indigo, fontWeight: 600, marginTop: 2 }}>{ex.roman}</div>}
            {ex.de && <div style={{ fontSize: 15, color: C.sumi, marginTop: 6, lineHeight: 1.45 }}>„{ex.de}“</div>}
            {sound && <div style={{ marginTop: 10 }}><ListenButton text={solved(ex)} sound={sound} quiet label="Satz anhören" /></div>}
          </>
        )}
      </Card>

      <ChoiceGrid columns="repeat(auto-fill, minmax(130px, 1fr))">
        {options.map(o => (
          <Choice key={o} dev={o} roman={readOption(o)} size={24} state={choiceState(o, ans, ex.a)} disabled={revealed}
            onClick={() => setAns(o)} ariaLabel={revealed ? `${o}${o === ex.a ? ' – richtig' : o === ans ? ' – falsch' : ''}` : o} />
        ))}
      </ChoiceGrid>

      {revealed && (
        <>
          <p style={{ marginTop: 14, marginBottom: 0, fontWeight: 600, color: correct ? C.matcha : C.shu }}>
            {correct ? '✓ Richtig!' : <>✗ Richtig wäre: <span style={{ fontFamily: NE, fontSize: 19 }}>{ex.a}</span></>}
          </p>
          {ex.hint && (
            <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 8, fontSize: 14, color: C.sumi, lineHeight: 1.5 }}>
              💡 {ex.hint}
            </div>
          )}
          <Btn onClick={finish} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{typeof nextLabel === 'function' ? nextLabel(correct) : nextLabel}</Btn>
        </>
      )}
    </div>
  )
}
