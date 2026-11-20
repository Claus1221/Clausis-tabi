import { C, NE } from '../../theme.js'
import { feedbackColor } from '../lib/srs.js'
import { useShowRoman } from './text.jsx'

// ─── Antwort-Option zum Antippen ──────────────────────────────────────────────
// Ein Knopf für jede Stelle, an der man eine von mehreren Möglichkeiten antippt (Quiz in
// Schrift- und Wort-Lektionen, Kapitel-Aufgaben, Szenen, Lückensätze, Erkennen im Üben).
// Eine Regel für alle:
//   • Nepali (dev) steht immer in Devanagari; die Umschrift (roman) nur mit dem Schalter
//     settings.showRoman – nie ist etwas NUR in Umschrift zu sehen.
//   • Die Bedeutung (de) einer Nepali-Option erst, wenn der Aufrufer showDe setzt (nach der
//     Auflösung bzw. bei einer falschen Wahl) – vorher wäre sie die Lösung.
//   • Rückmeldung über feedbackColor (lib/srs.js): state 'correct' | 'wrong' | 'neutral',
//     wie choiceState (lib/choice.js) sie aus Wahl und Lösung bestimmt.
//   • Mindestens 52 px hoch (Tippfläche ≥ 44 px), volle Zellenbreite.
// Unterschiede der Stellen sind Props: text (Klartext-Option – deutsche Bedeutung oder die
// Lesung im Schrift-Quiz, textSize), size (Devanagari-Größe; 30 für einzelne Zeichen), align
// (Sätze links, kurze Optionen mittig), ariaLabel.
export function Choice({
  dev, roman, text, de, showDe = false, state = 'neutral', disabled = false, onClick,
  size = 21, textSize = 15, align = 'center', ariaLabel,
}) {
  const showRoman = useShowRoman()
  const fb = feedbackColor(state)
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} aria-label={ariaLabel}
      style={{
        width: '100%', minHeight: 52, padding: '8px 10px', borderRadius: 10, border: `2px solid ${fb.border}`, background: fb.bg,
        color: C.sumi, cursor: disabled ? 'default' : 'pointer', textAlign: align,
      }}>
      {dev != null && <span style={{ display: 'block', fontFamily: NE, fontSize: size, lineHeight: 1.3 }}>{dev}</span>}
      {dev != null && showRoman && roman && <span style={{ display: 'block', fontSize: 12, color: C.indigo }}>{roman}</span>}
      {text != null && <span style={{ display: 'block', fontSize: textSize, fontWeight: 600, lineHeight: 1.35 }}>{text}</span>}
      {showDe && de && <span style={{ display: 'block', fontSize: 13, color: C.textMuted, marginTop: 2 }}>„{de}“</span>}
    </button>
  )
}

// Raster der Optionen (Abstand 8 px). columns: '1fr' für lange Optionen (Sätze, Bedeutungen),
// mehrere Spalten für kurze.
export function ChoiceGrid({ columns = '1fr', children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8 }}>{children}</div>
}
