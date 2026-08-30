import { useMemo, useState } from 'react'
import { C, JP } from '../theme.js'
import { Card, Btn } from './ui.jsx'
import { shuffled, feedbackColor } from '../lib/srs.js'
import { HAS_JP } from '../lib/furigana.jsx'

// ─── Grammatik-Karte (Lückensatz mit Auswahl) ────────────────────────────────
// Die Form, in der Grammatik im Wiederholungsplan auftaucht: ein Satz mit Lücke,
// dazu ein paar Möglichkeiten. Bewusst KEINE Karteikarte zum Umdrehen – bei
// Grammatik zählt das Anwenden, nicht das Wiedererkennen einer Regel-Erklärung.
//
// Die Bewertung ergibt sich aus der Antwort (richtig = „Gut", falsch =
// „Nochmal"), statt sie selbst einschätzen zu lassen: Bei einer Aufgabe mit
// eindeutiger Lösung wäre die Selbsteinschätzung nur ein zusätzlicher Klick.
export function GrammarDrill({ topic, ex, onDone }) {
  const [ans, setAns] = useState(null)
  const options = useMemo(() => shuffled(ex.options), [ex])
  const revealed = ans != null
  const correct = ans === ex.a

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: C.textMuted }}>
          <span style={{ fontFamily: JP, fontSize: 17, color: C.shu }}>{topic.glyph}</span>
          {'  '}{topic.title}
        </span>
      </div>
      <Card style={{ marginBottom: 14, padding: '18px 16px' }}>
        <div style={{ fontSize: 15, color: C.textMuted, marginBottom: 10 }}>{ex.q.includes('＿') ? 'Was fehlt?' : 'Was stimmt?'}</div>
        <div style={{ fontSize: 22, fontFamily: JP, lineHeight: 1.7, color: C.sumi }}>
          {revealed ? ex.q.replace('＿', ex.a) : ex.q.split('＿').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && (
              <span style={{ display: 'inline-block', minWidth: 36, borderBottom: `2px solid ${C.shu}`, color: C.shu }}>＿</span>
            )}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {options.map(o => {
          const isRight = o === ex.a
          const fb = feedbackColor(!revealed ? 'neutral' : isRight ? 'correct' : o === ans ? 'wrong' : 'neutral')
          return (
            <button key={o} onClick={() => !revealed && setAns(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: `2px solid ${fb.border}`, background: fb.bg,
                fontSize: HAS_JP.test(o) ? 20 : 14, fontFamily: HAS_JP.test(o) ? JP : 'inherit',
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ marginTop: 12, fontWeight: 600, color: correct ? C.matcha : C.shu }}>
            {correct ? '✓ Richtig!' : `✗ Richtig wäre: ${ex.a}`}
          </p>
          {ex.hint && <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginTop: 4 }}>{ex.hint}</p>}
          <Btn onClick={() => onDone(correct)} style={{ width: '100%', marginTop: 12 }}>Weiter →</Btn>
        </>
      )}
    </>
  )
}
