import { useState, lazy, Suspense } from 'react'
import { useAuth } from '../AuthGate.jsx'
import { useLang } from '../LangGate.jsx'
import { useProgress, computeStats, getSettings } from '../useProgress.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { C, NE } from '../theme.js'
import { Card, TabBar } from '../components/ui.jsx'
import { LANGS } from '../lib/lang.js'

// Nepali-Hülle (Yatra): Kopfzeile, Tabs wie TabiApp, ProgressCtx für Sprache `ne`.
// Screens lazy → je Tab ein eigener Code-Chunk. Tabs ohne Screen zeigen „Kommt bald“.
// Wechseln/Abmelden stehen in der Kopfzeile, bis es einen Einstellungs-Screen gibt.
const ReiseScreen = lazy(() => import('./screens/reise.jsx'))

// Tab-Zeichen auf Nepali, Unterzeile Deutsch (wie 旅/Reise im japanischen Kurs).
const NE_TABS = [
  { id: 'reise', label: 'यात्रा', sub: 'Reise' },
  { id: 'lernen', label: 'पढाइ', sub: 'Lernen' },
  { id: 'ueben', label: 'अभ्यास', sub: 'Üben' },
  { id: 'fortschritt', label: 'प्रगति', sub: 'Fortschritt' },
]

function ScreenFallback() {
  return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Lädt…</div>
}

function ComingSoon({ title }) {
  return (
    <div style={{ padding: 16 }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: C.textMuted }}>Kommt bald.</div>
      </Card>
    </div>
  )
}

export default function NepaliApp() {
  const { user, logout, recheckAccess } = useAuth()
  const { setLang, langs } = useLang()
  const progressApi = useProgress(user?.uid, 'ne', { onDenied: recheckAccess })
  const { progress, saveError } = progressApi
  const { level } = computeStats(progress)
  const [tab, setTab] = useState('reise')
  const [prevTab, setPrevTab] = useState('reise') // Rücksprung aus den Einstellungen
  // Mit zwei Sprachen ist "wechseln" ein Umschalten zur jeweils anderen.
  const other = langs.find(l => l !== 'ne')

  const toggleSettings = () => {
    if (tab === 'einstellungen') setTab(prevTab)
    else { setPrevTab(tab); setTab('einstellungen') }
  }

  const screens = {
    reise: <ReiseScreen />,
    lernen: <ComingSoon title="Lernen" />,
    ueben: <ComingSoon title="Üben" />,
    fortschritt: <ComingSoon title="Fortschritt" />,
    einstellungen: <ComingSoon title="Einstellungen" />,
  }

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
          width: 34, height: 34, background: C.shu, borderRadius: 9, flexShrink: 0,
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
          <button onClick={toggleSettings} title="Einstellungen" aria-label="Einstellungen"
            style={{
              ...pill, padding: 0, width: 28, height: 28, fontSize: 14, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tab === 'einstellungen' ? `${C.indigo}12` : 'none',
              color: tab === 'einstellungen' ? C.indigo : C.textMuted,
            }}>⚙</button>
          {other && (
            <button onClick={() => setLang(other)} style={pill}>
              Zu {LANGS[other].name} wechseln
            </button>
          )}
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`} style={pill}>Abmelden</button>
        </div>
      </div>

      {saveError && <div style={banner}>⚠ Speichern fehlgeschlagen – Fortschritt wird lokal gehalten, bitte Verbindung prüfen.</div>}

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <div key={tab} className="screen-enter">
          <Suspense fallback={<ScreenFallback />}>
            {screens[tab]}
          </Suspense>
        </div>
      </div>

      <TabBar active={tab} setActive={setTab} tabs={NE_TABS} font={NE} />
    </div>
    </ProgressCtx.Provider>
  )
}
