import { useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { Card } from '../components/ui.jsx'

// ─── Einstellungen ───────────────────────────────────────────────────────────

// Zahlen-Einsteller (− Wert +) für einen Parameter.
function NumberSetting({ label, hint, value, min, max, step, suffix, onChange }) {
  const StepBtn = ({ dir, disabled }) => (
    <button onClick={() => onChange(Math.min(max, Math.max(min, value + dir * step)))} disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.washiDark}`,
        background: disabled ? C.washi : '#fff', color: disabled ? C.washiDark : C.indigo,
        fontSize: 20, fontWeight: 700, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
      }}>{dir < 0 ? '−' : '+'}</button>
  )
  return (
    <Card style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <StepBtn dir={-1} disabled={value <= min} />
        <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 700, fontSize: 16, color: C.indigo }}>{value}{suffix || ''}</span>
        <StepBtn dir={1} disabled={value >= max} />
      </div>
    </Card>
  )
}

export default function SettingsScreen({ onClose }) {
  const { settings, saveSettings } = useContext(ProgressCtx)
  const set = (patch) => saveSettings(patch)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}>←</button>
        <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, margin: 0 }}>Einstellungen</h2>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, marginLeft: 30 }}>Übungen nach deinem Geschmack einstellen</p>

      {/* Standard-Wiederholung */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>STANDARD-WIEDERHOLUNG</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Was startet, wenn du „Wiederholen" antippst:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['mix', '🎲 Gemischt'], ['srs', '🗂 SRS-Karten']].map(([id, lbl]) => {
            const on = settings.standardReview === id
            return (
              <button key={id} onClick={() => set({ standardReview: id })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
      </Card>

      {/* Übungs-Parameter */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>PARAMETER</div>
      <NumberSetting label="Antwortmöglichkeiten" hint="Optionen bei Erkennen/Hören — mehr = weniger Raten"
        value={settings.options} min={4} max={8} step={1} onChange={v => set({ options: v })} />
      <NumberSetting label="Tagesziel" hint="XP, die du pro Tag schaffen möchtest" suffix=" XP"
        value={settings.dailyGoal} min={50} max={600} step={50} onChange={v => set({ dailyGoal: v })} />
      <NumberSetting label="Aufgaben pro Runde" hint="Fragen je Übung (Erkennen, Hören, Tippen, Gemischt)"
        value={settings.roundSize} min={5} max={30} step={1} onChange={v => set({ roundSize: v })} />
      <NumberSetting label="Fleiß-Session" hint="Karten je Fleiß-Übung"
        value={settings.freeSize} min={10} max={60} step={5} onChange={v => set({ freeSize: v })} />

      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 16, lineHeight: 1.5 }}>
        Änderungen werden sofort gespeichert und gelten beim nächsten Start einer Übung.
      </p>

      {/* Versionsanzeige — hilft zu erkennen, ob die neueste Version geladen ist. */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.washiDark}`, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
          Tabi v{__APP_VERSION__} · {__BUILD_HASH__}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          Build: {__BUILD_TIME__.slice(0, 16).replace('T', ' ')} UTC
        </div>
      </div>
    </div>
  )
}
