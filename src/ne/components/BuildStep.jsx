import { useState, useRef, useEffect } from 'react'
import { C, NE } from '../../theme.js'
import { Btn, Card } from '../../components/ui.jsx'
import { shuffle } from '../lib/scriptQuiz.js'
import { isBuildCorrect, chapterReading } from '../lib/chapters.js'
import { stopSpeaking } from '../lib/speech.js'
import { ListenButton } from './sound.jsx'
import { useShowRoman } from './text.jsx'

// ─── Satzbau (Kapitel-Aufgabe) ────────────────────────────────────────────────
// Eigenes Nepali-Gegenstück zum japanischen BuildStep: die deutsche Bedeutung steht oben,
// darunter legt man den Satz aus Stücken (antippen = anhängen). Ein gelegtes Stück antippen
// nimmt es zurück, „Zurück“ nimmt das letzte. Geprüft wird EINMAL (isBuildCorrect: answer
// oder eine alsoAccept-Reihenfolge); danach steht der richtige Satz mit Umschrift (nach
// Schalter) da, Anhören nur mit Ton. „Weiter“ ruft onDone(richtig?) genau einmal (Ref-Sperre
// wie GapDrill). Ohne Ton voll lösbar – es gibt nichts zu hören, nur zu legen.
//
// Stücke werden über ihren Index geführt, nicht über den Text: zwei gleiche Stücke dürfen
// vorkommen, ohne dass Antippen das falsche wegnimmt. Gemischt einmal je Erscheinen.
// Alle Knöpfe ≥ 44 px.
export function BuildStep({ step, sound, onDone, nextLabel = 'Weiter →' }) {
  const showRoman = useShowRoman()
  const [order] = useState(() => shuffle(step.tiles.map((_, i) => i)))
  const [placed, setPlaced] = useState([]) // Indizes in step.tiles, in Lege-Reihenfolge
  const [result, setResult] = useState(null) // null = noch nicht geprüft, sonst richtig?
  const doneRef = useRef(false)
  useEffect(() => () => stopSpeaking(), [])
  const checked = result !== null

  const put = i => { if (!checked && !placed.includes(i)) setPlaced(p => [...p, i]) }
  const take = i => { if (!checked) setPlaced(p => p.filter(x => x !== i)) }
  const undo = () => { if (!checked) setPlaced(p => p.slice(0, -1)) }
  const check = () => { if (!checked && placed.length) setResult(isBuildCorrect(step, placed.map(i => step.tiles[i]))) }
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone(result)
  }

  const tile = (i, onClick, label) => {
    const r = showRoman ? chapterReading(step.tiles[i]) : ''
    return (
      <button key={i} onClick={onClick} disabled={checked} aria-label={label}
        style={{
          minHeight: 48, minWidth: 44, padding: '4px 12px', borderRadius: 10, cursor: checked ? 'default' : 'pointer',
          background: '#fff', border: `2px solid ${C.washiDark}`, color: C.sumi, textAlign: 'center',
        }}>
        <span style={{ display: 'block', fontFamily: NE, fontSize: 22, lineHeight: 1.3 }}>{step.tiles[i]}</span>
        {r && <span style={{ display: 'block', fontSize: 12, color: C.indigo }}>{r}</span>}
      </button>
    )
  }

  const edge = !checked ? C.washiDark : result ? C.matcha : C.shu
  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 6px', textAlign: 'center' }}>Bilde den Satz auf Nepali:</p>
      <p style={{ fontSize: 18, fontWeight: 600, color: C.sumi, textAlign: 'center', margin: '0 0 14px', lineHeight: 1.45 }}>„{step.de}“</p>

      {/* Gelegter Satz: antippen nimmt ein Stück zurück. */}
      <div aria-label="Dein Satz" style={{
        minHeight: 64, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: 8,
        border: `2px dashed ${edge}`, borderRadius: 12, background: checked ? `${edge}12` : `${C.indigo}06`, marginBottom: 10,
      }}>
        {placed.length === 0 && <span style={{ fontSize: 13, color: C.textMuted, padding: '0 6px' }}>Tippe unten die Stücke in der richtigen Reihenfolge an.</span>}
        {placed.map(i => tile(i, () => take(i), `${step.tiles[i]} – zurücknehmen`))}
      </div>

      {!checked && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12, minHeight: 48 }}>
            {order.filter(i => !placed.includes(i)).map(i => tile(i, () => put(i), `${step.tiles[i]} – anlegen`))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={undo} disabled={!placed.length} style={{ flex: 1, minHeight: 48 }}>↶ Zurück</Btn>
            <Btn onClick={check} disabled={!placed.length} style={{ flex: 2, minHeight: 48 }}>Prüfen</Btn>
          </div>
        </>
      )}

      {checked && (
        <>
          <p style={{ margin: '4px 0 8px', fontWeight: 600, color: result ? C.matcha : C.shu }}>
            {result ? '✓ Richtig!' : '✗ Richtig wäre:'}
          </p>
          <Card style={{ padding: '12px 14px' }}>
            <div style={{ fontFamily: NE, fontSize: 24, color: C.sumi, lineHeight: 1.4 }}>{step.dev}</div>
            {showRoman && <div style={{ fontSize: 14, color: C.indigo, fontWeight: 600, marginTop: 2 }}>{step.roman}</div>}
            {step.alsoAccept?.length > 0 && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>
                Auch richtig: {step.alsoAccept.map(a => a.join(' ')).map((t, k) => <span key={k} style={{ fontFamily: NE, fontSize: 15, color: C.sumi }}>{k ? ' · ' : ''}{t}</span>)}
              </div>
            )}
            {sound && <div style={{ marginTop: 10 }}><ListenButton text={step.dev} sound={sound} quiet label="Satz anhören" /></div>}
          </Card>
          <Btn onClick={finish} style={{ marginTop: 12, width: '100%', minHeight: 48 }}>{nextLabel}</Btn>
        </>
      )}
    </div>
  )
}
