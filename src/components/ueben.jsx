import { C } from '../theme.js'
import { Btn } from './ui.jsx'
import { XP_PER_CARD } from '../lib/xp.js'

export function UebenHead({ title, idx, total, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ color: C.textMuted, fontSize: 13 }}>{title}{total ? ` · ${idx + 1} / ${total}` : ''}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
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
