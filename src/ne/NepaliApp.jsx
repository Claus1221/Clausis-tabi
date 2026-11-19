import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../AuthGate.jsx'
import { useProgress, computeStats } from '../useProgress.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { C, NE } from '../theme.js'
import { TabBar } from '../components/ui.jsx'
import { LANGS } from '../lib/lang.js'
import { learnedItems } from './lib/learned.js'
import { neSettings } from './lib/settings.js'

// Nepali-Hülle (Yatra): Kopfzeile, Tabs wie TabiApp, ProgressCtx für Sprache `ne`.
// Screens lazy → je Tab ein eigener Code-Chunk. Einstellungen (⚙) tragen Sprache,
// Umschrift, Übungs-Parameter, Abmelden und Zurücksetzen.
const ReiseScreen = lazy(() => import('./screens/reise.jsx'))
const LernenScreen = lazy(() => import('./screens/lernen.jsx'))
const UebenScreen = lazy(() => import('./screens/ueben.jsx'))
const FortschrittScreen = lazy(() => import('./screens/fortschritt.jsx'))
const SettingsScreen = lazy(() => import('./screens/settings.jsx'))

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

export default function NepaliApp() {
  const { user, recheckAccess } = useAuth()
  const progressApi = useProgress(user?.uid, 'ne', { onDenied: recheckAccess })
  const { progress, saveError, scheduleNew } = progressApi
  const { level } = computeStats(progress)
  const [tab, setTab] = useState('reise')
  const [prevTab, setPrevTab] = useState('reise') // Rücksprung aus den Einstellungen
  const [uebenMode, setUebenMode] = useState(null) // gewünschter Übungsmodus beim Tab-Wechsel

  // Gelerntes in den Wiederholungsplan einplanen (wie TabiApp): auch bereits gelernte,
  // aber noch ungeplante Karten – etwa wenn ein Lektionsabschluss offline nur halb
  // ankam. scheduleNew ist idempotent und schreibt nichts vor dem ersten Snapshot.
  useEffect(() => {
    scheduleNew(learnedItems(progress))
  }, [progress.completedLessons, progress.completedWordBlocks, progress.srs]) // eslint-disable-line

  // Wiederholungen leben im Üben-Tab; andere Screens springen dorthin.
  const goToReview = () => { setUebenMode('srs'); setTab('ueben') }

  const toggleSettings = () => {
    if (tab === 'einstellungen') setTab(prevTab)
    else { setPrevTab(tab); setTab('einstellungen') }
  }

  const screens = {
    reise: <ReiseScreen />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen initialMode={uebenMode} onConsumeInitial={() => setUebenMode(null)} />,
    fortschritt: <FortschrittScreen onReview={goToReview} />,
    einstellungen: <SettingsScreen onClose={() => setTab(prevTab)} />,
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
    <ProgressCtx.Provider value={{ ...progressApi, settings: neSettings(progress) }}>
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
          {/* Sprachwechsel und Abmelden stehen in den Einstellungen: in der Kopfzeile
              brach die Leiste bei 360 px auf drei Zeilen um. */}
          <button onClick={toggleSettings} title="Einstellungen" aria-label="Einstellungen"
            aria-pressed={tab === 'einstellungen'}
            style={{
              ...pill, padding: 0, width: 44, height: 44, fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tab === 'einstellungen' ? `${C.indigo}12` : 'none',
              color: tab === 'einstellungen' ? C.indigo : C.textMuted,
            }}>⚙</button>
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
