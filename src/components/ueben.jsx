import { C } from '../theme.js'
import { Btn } from './ui.jsx'
import { XP_PER_CARD } from '../lib/xp.js'

// closeSize (optional, px): feste Tippfläche für das ✕ (z. B. 44 im Nepali-Kurs), dazu
// ein aria-label. Ohne Angabe bleibt die Ausgabe exakt wie bisher.
export function UebenHead({ title, idx, total, onClose, closeSize }) {
  const big = closeSize ? {
    width: closeSize, height: closeSize, marginRight: -Math.round((closeSize - 20) / 2), fontSize: 18,
  } : null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ color: C.textMuted, fontSize: 13 }}>{title}{total ? ` · ${idx + 1} / ${total}` : ''}</span>
      <button onClick={onClose} {...(big ? { 'aria-label': 'Schließen' } : {})}
        style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16, ...big }}>✕</button>
    </div>
  )
}
export function UebenEmpty({ onClose, text }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Noch zu wenig gelernt</h3>
      <p style={{ color: C.textMuted, marginBottom: 16 }}>{text || 'Lerne zuerst etwas im Lernen-Tab oder auf der Reise.'}</p>
      <Btn onClick={onClose}>Zurück</Btn>
    </div>
  )
}
export function UebenDone({ correct, total, onClose }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Übung fertig!</h3>
      <p style={{ color: C.textMuted, marginBottom: 16 }}>
        {correct != null ? `${correct} / ${total} richtig · +${correct * XP_PER_CARD} XP` : 'Gut gemacht!'}
      </p>
      <Btn onClick={onClose}>Fertig</Btn>
    </div>
  )
}
