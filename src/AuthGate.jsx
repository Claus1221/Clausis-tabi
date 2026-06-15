import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, isConfigured, ALLOWED_EMAILS } from './firebase'

// ─── Theme (passend zur App) ─────────────────────────────────────────────────
const C = {
  sumi: '#211F1B', indigo: '#1E4368', shu: '#DA4A38',
  washi: '#EFEBE0', matcha: '#5E8A6A', washiDark: '#E0DAC8', textMuted: '#6B6660',
}

// ─── Auth-Context (für TabiApp: aktueller Nutzer + Abmelden) ──────────────────
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function isAllowed(user) {
  if (!user) return false
  if (ALLOWED_EMAILS.length === 0) return true
  const email = (user.email || '').toLowerCase()
  return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)
}

// ─── Layout-Hülle für die Vollbild-Screens ───────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: C.washi, padding: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, background: C.shu, borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38, fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif", color: '#fff', marginBottom: 18,
      }}>旅</div>
      {children}
    </div>
  )
}

// ─── Einzelne Screens ─────────────────────────────────────────────────────────
function Splash({ text }) {
  return <Shell><p style={{ color: C.textMuted }}>{text}</p></Shell>
}

function LoginScreen({ onLogin, error, busy }) {
  return (
    <Shell>
      <h1 style={{ fontSize: 26, fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif", color: C.indigo, margin: '0 0 4px' }}>
        Tabi 旅
      </h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 28px' }}>
        Japanisch für Reisende
      </p>
      <button onClick={onLogin} disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', color: C.sumi, border: `1px solid ${C.washiDark}`,
          borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.1C12.3 13.3 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"/>
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.9-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.3 0-11.7-3.8-13.5-9.3l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        Mit Google anmelden
      </button>
      {error && (
        <p style={{ color: C.shu, fontSize: 12, marginTop: 16, maxWidth: 300 }}>{error}</p>
      )}
      <p style={{ color: C.textMuted, fontSize: 11, marginTop: 28, maxWidth: 300 }}>
        Anmeldung nötig, um deinen Lernerfolg zu speichern und zwischen Geräten zu synchronisieren.
      </p>
    </Shell>
  )
}

function NoAccessScreen({ user, onLogout }) {
  return (
    <Shell>
      <h1 style={{ fontSize: 20, color: C.indigo, margin: '0 0 8px' }}>Kein Zugang</h1>
      <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 320 }}>
        Das Konto <strong>{user.email}</strong> ist für diese App nicht freigeschaltet.
      </p>
      <button onClick={onLogout}
        style={{
          marginTop: 22, background: C.shu, color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
        Abmelden
      </button>
    </Shell>
  )
}

function SetupScreen() {
  return (
    <Shell>
      <h1 style={{ fontSize: 20, color: C.indigo, margin: '0 0 8px' }}>Firebase noch nicht konfiguriert</h1>
      <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 340 }}>
        Trage deine Firebase-Werte in <code>src/firebase.js</code> ein, dann erscheint hier
        die Google-Anmeldung. Eine Schritt-für-Schritt-Anleitung steht in der Datei
        <code> FIREBASE-SETUP.md</code>.
      </p>
    </Shell>
  )
}

// ─── Die Wand: entscheidet, was angezeigt wird ───────────────────────────────
export function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false) })
  }, [])

  const login = async () => {
    setError(null); setBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setError('Anmeldung fehlgeschlagen: ' + (e.code || e.message))
      }
    } finally {
      setBusy(false)
    }
  }
  const logout = () => signOut(auth)

  if (!isConfigured) return <SetupScreen />
  if (loading) return <Splash text="Lädt…" />
  if (!user) return <LoginScreen onLogin={login} error={error} busy={busy} />
  if (!isAllowed(user)) return <NoAccessScreen user={user} onLogout={logout} />

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
