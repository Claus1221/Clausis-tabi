import { useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { Card, Btn } from '../../components/ui.jsx'
import { useAuth } from '../../AuthGate.jsx'
import { useLang } from '../../LangGate.jsx'
import { LANGS } from '../../lib/lang.js'
import AdminUsers from '../../screens/adminUsers.jsx'

// ─── Einstellungen (Yatra) ────────────────────────────────────────────────────
// Gegenstück zu src/screens/settings.jsx, nur mit dem, was der Nepali-Kurs heute
// benutzt. Keine API-Keys: im Nepali-Zweig gibt es noch keine KI-Funktionen. Werte
// landen über saveSettings im Nepali-Dokument; gelesen wird über neSettings (NepaliApp).

const section = { fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }

// Zahlen-Einsteller (− Wert +), Knöpfe 44 px.
function NumberSetting({ label, hint, value, min, max, step, suffix, onChange }) {
  const stepBtn = (dir, disabled) => (
    <button onClick={() => onChange(Math.min(max, Math.max(min, value + dir * step)))} disabled={disabled}
      aria-label={`${label} ${dir < 0 ? 'verringern' : 'erhöhen'}`}
      style={{
        width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${C.washiDark}`,
        background: disabled ? C.washi : '#fff', color: disabled ? C.washiDark : C.indigo,
        fontSize: 20, fontWeight: 700, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
      }}>{dir < 0 ? '−' : '+'}</button>
  )
  return (
    <Card style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {stepBtn(-1, value <= min)}
        <span style={{ minWidth: 44, textAlign: 'center', fontWeight: 700, fontSize: 15, color: C.indigo }}>{value}{suffix || ''}</span>
        {stepBtn(1, value >= max)}
      </div>
    </Card>
  )
}

export default function SettingsScreen({ onClose }) {
  const { settings, saveSettings, reset } = useContext(ProgressCtx)
  const { isAdmin, logout, user } = useAuth()
  const { lang, setLang, langs } = useLang()
  const otherLangs = langs.filter(id => id !== lang)

  const handleReset = () => {
    // Nur das Nepali-Dokument: reset() schreibt in den Lernstand der aktiven Sprache.
    if (window.confirm('Wirklich den Nepali-Lernstand auf 0 zurücksetzen? Gelernte Zeichen, Wiederholungsplan und XP im Nepali-Kurs gehen verloren; dein Japanisch-Lernstand bleibt unberührt. Das kann nicht rückgängig gemacht werden.')) reset()
  }

  const choice = (on) => ({
    flex: 1, minHeight: 44, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    border: `2px solid ${on ? C.indigo : C.washiDark}`,
    background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
  })

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <button onClick={onClose} aria-label="Zurück" style={{
          width: 44, height: 44, marginLeft: -10, background: 'none', border: 'none', fontSize: 20, color: C.textMuted, cursor: 'pointer', lineHeight: 1,
        }}>←</button>
        <h2 style={{ fontSize: 20, color: C.indigo, margin: 0 }}>Einstellungen</h2>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 8px 34px' }}>Übungen nach deinem Geschmack einstellen</p>

      {/* Sprache – nur wer mehr als eine Sprache wählen darf. */}
      {otherLangs.length > 0 && (
        <>
          <div style={section}>SPRACHE</div>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: C.sumi, marginBottom: 10 }}>
              Du lernst gerade: {LANGS[lang].name} ({LANGS[lang].app})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {otherLangs.map(id => (
                <Btn key={id} onClick={() => setLang(id)} variant="ghost" style={{ flex: 1, minHeight: 44 }}>
                  Zu {LANGS[id].name} wechseln
                </Btn>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Dein Lernstand bleibt für jede Sprache erhalten.</div>
          </Card>
        </>
      )}

      {/* Umschrift */}
      <div style={section}>UMSCHRIFT</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          Lateinische Umschrift unter dem Devanagari (z. B. <span style={{ fontFamily: NE, color: C.sumi }}>क</span> ka):
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[[true, 'An'], [false, 'Aus']].map(([val, lbl]) => (
            <button key={lbl} onClick={() => saveSettings({ showRoman: val })} aria-pressed={settings.showRoman === val}
              style={choice(settings.showRoman === val)}>{lbl}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
          Gilt für die Zeichentafel unter Lernen. Wo die Umschrift die Lösung ist – Lektionen,
          beim Aufdecken einer Karte, im Nachschlage-Blatt –, steht sie immer.
        </div>
      </Card>

      {/* Übungs-Parameter */}
      <div style={section}>ÜBEN</div>
      <NumberSetting label="Tagesziel" hint="XP, die du pro Tag schaffen möchtest" suffix=" XP"
        value={settings.dailyGoal} min={50} max={600} step={50} onChange={v => saveSettings({ dailyGoal: v })} />
      <NumberSetting label="Rundengröße" hint="Fragen je Erkennen-Übung"
        value={settings.roundSize} min={5} max={30} step={1} onChange={v => saveSettings({ roundSize: v })} />
      <NumberSetting label="Antwortmöglichkeiten" hint="Optionen beim Erkennen – mehr = weniger Raten"
        value={settings.options} min={4} max={8} step={1} onChange={v => saveSettings({ options: v })} />
      <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0', lineHeight: 1.5 }}>
        Änderungen werden sofort gespeichert und gelten beim nächsten Start einer Übung.
      </p>

      {/* Konto */}
      <div style={section}>KONTO</div>
      <Card style={{ marginBottom: 12 }}>
        {user?.email && <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, overflowWrap: 'anywhere' }}>Angemeldet als {user.email}</div>}
        <Btn onClick={logout} variant="ghost" style={{ width: '100%', minHeight: 44 }}>Abmelden</Btn>
      </Card>

      {/* Zurücksetzen */}
      <div style={section}>LERNSTAND</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sumi, lineHeight: 1.5, marginBottom: 10 }}>
          Setzt nur den <strong>Nepali</strong>-Lernstand auf 0 (Stationen, Wiederholungsplan, XP).
          Einstellungen und dein Japanisch-Lernstand bleiben erhalten.
        </div>
        <button onClick={handleReset} style={{
          width: '100%', minHeight: 44, background: '#fff', border: `1.5px solid ${C.shu}66`, borderRadius: 10,
          fontSize: 14, fontWeight: 600, color: C.shu, cursor: 'pointer',
        }}>Nepali-Lernstand zurücksetzen</button>
      </Card>

      {/* Freigabeliste – nur Admin; für andere startet auch kein Listener */}
      {isAdmin && <AdminUsers />}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.washiDark}`, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
          {LANGS.ne.app} · Tabi v{__APP_VERSION__} · {__BUILD_HASH__}
        </div>
      </div>
    </div>
  )
}
