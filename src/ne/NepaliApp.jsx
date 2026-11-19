import { useAuth } from '../AuthGate.jsx'
import { useLang } from '../LangGate.jsx'
import { useProgress, computeStats, getSettings } from '../useProgress.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { C, NE } from '../theme.js'
import { Card } from '../components/ui.jsx'
import { LANGS } from '../lib/lang.js'

// Nepali-Hülle (Yatra): Kopfzeile, Level, Wechseln/Abmelden und ein Platzhalter.
// ProgressCtx steht schon, damit die Kursinhalte (Plan B) direkt aufsetzen.
export default function NepaliApp() {
  const { user, logout, recheckAccess } = useAuth()
  const { setLang, langs, error } = useLang()
  const progressApi = useProgress(user?.uid, 'ne', { onDenied: recheckAccess })
  const { progress, saveError } = progressApi
  const { level } = computeStats(progress)
  // Mit zwei Sprachen ist "wechseln" ein Umschalten zur jeweils anderen.
  const other = langs.find(l => l !== 'ne')

  const pill = {
    background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 999,
    padding: '4px 11px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
  }
  const banner = {
    padding: '8px 16px', background: `${C.shu}14`, borderBottom: `1px solid ${C.shu}40`,
    fontSize: 12, color: C.shu, flexShrink: 0,
  }

  return (
    <ProgressCtx.Provider value={{ ...progressApi, settings: getSettings(progress) }}>
    <div className="app-shell" style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{
        padding: '13px 16px 11px',
        background: 'rgba(252,250,245,0.88)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.washiDark}`,
        boxShadow: '0 8px 20px -18px rgba(33,31,27,0.55)',
        display: 'flex', alignItems: 'center', gap: 11,
        flexShrink: 0, position: 'relative', zIndex: 10,
      }}>
        <div className="hanko-in" style={{
          width: 34, height: 34, background: C.shu, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, fontFamily: NE, color: '#fff', fontWeight: 600, lineHeight: 1,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 -2px 5px rgba(120,20,10,0.32), 0 2px 6px rgba(218,74,56,0.34)',
        }}>य</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.sumi, lineHeight: 1, letterSpacing: 0.4 }}>{LANGS.ne.app}</div>
          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.3, marginTop: 3, letterSpacing: 0.3 }}>
            <span style={{ fontFamily: NE }}>यात्रा</span> · Nepali für Reisende
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${C.shu}14`, border: `1px solid ${C.shu}33`, borderRadius: 999, padding: '3px 10px 3px 8px', fontSize: 12, color: C.shu, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: C.shu, display: 'inline-block' }} />
            Level {level}
          </div>
          {other && (
            <button onClick={() => setLang(other)} style={pill}>
              Zu {LANGS[other].name} wechseln
            </button>
          )}
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`} style={pill}>Abmelden</button>
        </div>
      </div>

      {saveError && <div style={banner}>⚠ Speichern fehlgeschlagen – Fortschritt wird lokal gehalten, bitte Verbindung prüfen.</div>}
      {error && <div style={banner}>⚠ {error}</div>}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <Card>
          <div style={{ fontSize: 15, color: C.sumi }}>Der Nepali-Kurs ist im Aufbau.</div>
        </Card>
      </div>
    </div>
    </ProgressCtx.Provider>
  )
}
