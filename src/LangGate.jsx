import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthGate.jsx'
import { useProfile } from './useProfile.js'
import { LANGS, selectableLangs } from './lib/lang.js'
import { C, JP, NE } from './theme.js'

// Beide Apps werden lazy geladen: Wer Japanisch lernt, lädt nie den Nepali-Code
// (und umgekehrt). Jede Sprache ist ein eigener Chunk.
const TabiApp = lazy(() => import('./TabiApp.jsx'))
const NepaliApp = lazy(() => import('./ne/NepaliApp.jsx'))
const APPS = { ja: TabiApp, ne: NepaliApp }

// ─── Sprach-Context (für die Apps: aktuelle Sprache + Wechseln) ───────────────
// error: Schreibfehler der Sprachwahl (deutscher Text) oder null.
const LangContext = createContext(null)
export const useLang = () => useContext(LangContext)

function Splash({ text }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.washi }}>
      <p style={{ color: C.textMuted }}>{text}</p>
    </div>
  )
}

// ─── Auswahlbildschirm: nur für Personen ohne Lernstand und ohne Wahl ────────
function Chooser({ langs, onPick }) {
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: C.washi, padding: 24, textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 22, color: C.indigo, margin: '0 0 24px' }}>Was möchtest du lernen?</h1>
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        {langs.map(id => {
          const l = LANGS[id]
          return (
            <button key={id} onClick={() => onPick(id)}
              style={{
                flex: 1, minWidth: 0, background: '#fff', color: C.sumi,
                border: `1px solid ${C.washiDark}`, borderRadius: 14, padding: '20px 8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
              <span style={{ fontSize: 36, lineHeight: 1.2, fontFamily: id === 'ne' ? NE : JP, color: C.shu }}>{l.glyph}</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{l.name}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{l.app} · {l.sub}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Die Wand nach dem Login: entscheidet, welche App geladen wird ───────────
export function LangGate() {
  const { user, isAdmin, recheckAccess } = useAuth()
  const { lang, loading, setLang, error } = useProfile(user?.uid, isAdmin, recheckAccess)
  const langs = selectableLangs(isAdmin)
  // Schreibfehler der Sprachwahl hier zeigen, nicht in den Apps: Nach der
  // Wahl ersetzt die App den Auswahlbildschirm, und TabiApp kennt den Fehler nicht.
  const [dismissed, setDismissed] = useState(null)
  useEffect(() => { if (!error) setDismissed(null) }, [error])
  const showError = error && dismissed !== error

  if (loading) return <Splash text="Lädt…" />
  if (lang === null) return <Chooser langs={langs} onPick={setLang} />

  const App = APPS[lang]
  return (
    <LangContext.Provider value={{ lang, setLang, langs, error }}>
      {showError && (
        <div role="alert" style={{
          maxWidth: 480, margin: '0 auto', padding: '8px 16px',
          background: '#f7e3df', borderBottom: `1px solid ${C.shu}40`,
          fontSize: 12, color: C.shu, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ flex: 1 }}>⚠ {error} Die Wahl gilt nur bis zum Neuladen.</span>
          <button onClick={() => setDismissed(error)} aria-label="Hinweis schließen"
            style={{ background: 'none', border: 'none', color: C.shu, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}
      <Suspense fallback={<Splash text="Lädt…" />}>
        {/* key: beim Wechsel wird die App neu aufgebaut, nichts bleibt im Speicher */}
        <App key={lang} />
      </Suspense>
    </LangContext.Provider>
  )
}
