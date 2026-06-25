import { useState, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { shuffled } from '../lib/srs.js'
import { speak } from '../lib/speech.js'
import { XP_PER_CARD } from '../lib/xp.js'
import { Btn } from './ui.jsx'

// Satz-Bau-Aufgabe: Kacheln in die richtige Reihenfolge tippen. Geteilt von
// Üben (SentenceQuiz/MixStep) und der Reise (Kapitel-Schritt).
// `typed`: Produktions-Modus – der Satz wird selbst über die (japanische) Tastatur
// eingegeben statt aus Bausteinen gebaut. Wird ab Kenntnisstufe „Gefestigt" aktiv.
export function BuildStep({ step, onSolved, typed = false }) {
  const { awardXp } = useContext(ProgressCtx)
  const [pool, setPool] = useState(() => shuffled(step.tiles.map((t, i) => ({ t, id: i }))))
  const [line, setLine] = useState([])
  const [result, setResult] = useState(null)
  const [val, setVal] = useState('')

  const target = step.answer.join('')
  const norm = (s) => s.replace(/[\s　。、!！?？]/g, '')

  const add = (tile) => { if (result != null) return; speak(tile.t); setPool(p => p.filter(x => x.id !== tile.id)); setLine(l => [...l, tile]) }
  const back = (tile) => { if (result != null) return; setLine(l => l.filter(x => x.id !== tile.id)); setPool(p => [...p, tile]) }
  const check = () => { const ok = line.map(x => x.t).join('') === target; setResult(ok); if (ok) awardXp(XP_PER_CARD); onSolved(ok) }
  const checkTyped = () => { if (!val.trim()) return; const ok = norm(val) === norm(target); setResult(ok); if (ok) awardXp(XP_PER_CARD); onSolved(ok) }

  const tileStyle = (filled) => ({
    padding: '8px 12px', borderRadius: 8, border: `2px solid ${filled ? C.indigo : C.washiDark}`,
    background: filled ? `${C.indigo}10` : '#fff', fontSize: 20, fontFamily: JP,
    color: C.sumi, cursor: result != null ? 'default' : 'pointer',
  })

  // Auflösung (Antwort + Übersetzung) – in beiden Modi gleich.
  const feedback = (
    <div style={{ fontWeight: 600, color: result ? C.matcha : C.shu }}>
      {result ? '✓ Richtig!' : '✗ Nicht ganz'}
      <span style={{ display: 'block', fontWeight: 400, fontSize: 14, color: C.sumi, marginTop: 4, fontFamily: JP }}>
        {target}
        <button onClick={() => speak(target)} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', marginLeft: 6 }}>🔊</button>
      </span>
      <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted }}>„{step.tr}"</span>
    </div>
  )

  if (typed) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 500, marginBottom: 6 }}>{step.prompt}</p>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>⌨️ Tippe den Satz selbst auf Japanisch ein</p>
        <input value={val} onChange={(e) => setVal(e.target.value)} disabled={result != null} lang="ja"
          onKeyDown={(e) => { if (e.key === 'Enter' && result == null) checkTyped() }}
          placeholder="日本語で…" autoCapitalize="off" autoCorrect="off"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 22, fontFamily: JP, textAlign: 'center', borderRadius: 10, border: `2px solid ${result == null ? C.washiDark : result ? C.matcha : C.shu}` }} />
        {result == null ? (
          <Btn onClick={checkTyped} variant={val.trim() ? 'primary' : 'ghost'} style={{ width: '100%', marginTop: 14, opacity: val.trim() ? 1 : 0.5 }}>Prüfen</Btn>
        ) : (
          <div style={{ marginTop: 14 }}>{feedback}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 500, marginBottom: 14 }}>{step.prompt}</p>
      <div style={{ minHeight: 52, border: `2px dashed ${C.washiDark}`, borderRadius: 10, padding: 8, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
        {line.length === 0 && <span style={{ color: C.textMuted, fontSize: 13 }}>Tippe die Wörter der Reihe nach an</span>}
        {line.map(tile => <button key={tile.id} onClick={() => back(tile)} style={tileStyle(true)}>{tile.t}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {pool.map(tile => <button key={tile.id} onClick={() => add(tile)} style={tileStyle(false)}>{tile.t}</button>)}
      </div>
      {result == null ? (
        <Btn onClick={check} variant={line.length === step.tiles.length ? 'primary' : 'ghost'} style={{ width: '100%', opacity: line.length === step.tiles.length ? 1 : 0.5 }}>
          Prüfen
        </Btn>
      ) : feedback}
    </div>
  )
}
