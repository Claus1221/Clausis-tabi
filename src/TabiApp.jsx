import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from './AuthGate.jsx'
import { useProgress, computeStats, getSettings } from './useProgress.js'
import { ProgressCtx } from './state/ProgressContext.js'
import { C, JP } from './theme.js'
import { TabBar } from './components/ui.jsx'
import { completedKanaList } from './lib/kanaStats.js'
import { learnedWordKanji } from './data/words.js'

// Die fuenf Screens werden lazy geladen → jeder Tab ist ein eigener Code-Chunk
// (kleinerer Erst-Download, schnellerer Start). Aufbau-Doku: ARCHITECTURE.md.
const ReiseScreen = lazy(() => import('./screens/reise.jsx'))
const LernenScreen = lazy(() => import('./screens/lernen.jsx'))
const UebenScreen = lazy(() => import('./screens/ueben.jsx'))
const FortschrittScreen = lazy(() => import('./screens/fortschritt.jsx'))
const SettingsScreen = lazy(() => import('./screens/settings.jsx'))

function ScreenFallback() {
  return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Lädt…</div>
}

export default function TabiApp() {
  const [tab, setTab] = useState('reise')
  const [prevTab, setPrevTab] = useState('reise')   // Rücksprung aus den Einstellungen
  const [uebenMode, setUebenMode] = useState(null)  // gewünschter Übungsmodus beim Tab-Wechsel
  const { user, logout } = useAuth()
  const { progress, saveError, awardXp, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, reviewCard, scheduleNew, saveNote, saveSettings, bumpChapterStars, reset } = useProgress(user?.uid)
  const { level } = computeStats(progress)
  const settings = getSettings(progress)

  // Neu gelernte Kana/Wörter in den Wiederholungsplan einplanen (und bereits
  // gelernte, aber noch ungeplante migrieren). Hält die „fällig"-Zahl sinnvoll.
  useEffect(() => {
    const learned = [
      ...completedKanaList(progress.completedLessons || []),
      ...learnedWordKanji(progress.completedWordBlocks || []),
    ]
    scheduleNew(learned)
  }, [progress.completedLessons, progress.completedWordBlocks, progress.srs])

  // Wiederholungen leben an einem Ort (Üben). Andere Screens verlinken hierher;
  // gestartet wird die in den Einstellungen gewählte Standard-Wiederholung.
  const goToReview = () => { setUebenMode(settings.standardReview); setTab('ueben') }

  // Einstellungen öffnen/schließen (merkt sich den vorherigen Tab für den Rücksprung).
  const openSettings = () => { setPrevTab(tab); setTab('einstellungen') }

  const screens = {
    reise: <ReiseScreen onReview={goToReview} />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen initialMode={uebenMode} onConsumeInitial={() => setUebenMode(null)} />,
    fortschritt: <FortschrittScreen onReview={goToReview} />,
    einstellungen: <SettingsScreen onClose={() => setTab(prevTab)} />,
  }

  return (
    <ProgressCtx.Provider value={{ progress, settings, awardXp, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, reviewCard, scheduleNew, saveNote, saveSettings, bumpChapterStars, reset }}>
    <div className="app-shell" style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Header — Tagebuch-Titelkopf mit Hanko-Siegel */}
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
          fontSize: 19, fontFamily: JP, color: '#fff', fontWeight: 600, lineHeight: 1,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 -2px 5px rgba(120,20,10,0.32), 0 2px 6px rgba(218,74,56,0.34)',
        }}>旅</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: JP, color: C.sumi, lineHeight: 1, letterSpacing: 0.4 }}>Tabi</div>
          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.3, marginTop: 3, letterSpacing: 0.3 }}>旅 · Japanisch für Reisende</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${C.shu}14`, border: `1px solid ${C.shu}33`, borderRadius: 999, padding: '3px 10px 3px 8px', fontSize: 12, color: C.shu, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: C.shu, display: 'inline-block' }} />
            Level {level}
          </div>
          <button onClick={openSettings} title="Einstellungen" aria-label="Einstellungen"
            style={{
              background: tab === 'einstellungen' ? `${C.indigo}12` : 'none',
              border: `1px solid ${C.washiDark}`, borderRadius: 999,
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: tab === 'einstellungen' ? C.indigo : C.textMuted, cursor: 'pointer', lineHeight: 1,
            }}>
            ⚙
          </button>
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`}
            style={{
              background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 999,
              padding: '4px 11px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
            }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Speicherfehler-Banner: echte Schreibfehler (nicht bloß offline, das fängt
          der lokale Cache ab) sichtbar machen statt Fortschritt still zu verlieren. */}
      {saveError && (
        <div style={{
          padding: '8px 16px', background: `${C.shu}14`, borderBottom: `1px solid ${C.shu}40`,
          fontSize: 12, color: C.shu, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚠ Speichern fehlgeschlagen – Fortschritt wird lokal gehalten, bitte Verbindung prüfen.</span>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <div key={tab} className="screen-enter">
          <Suspense fallback={<ScreenFallback />}>
            {screens[tab]}
          </Suspense>
        </div>
      </div>

      <TabBar active={tab} setActive={setTab} />
    </div>
    </ProgressCtx.Provider>
  )
}
