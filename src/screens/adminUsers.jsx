import { useEffect, useState } from 'react'
import { C } from '../theme.js'
import { Card, Btn } from '../components/ui.jsx'
import { watchAllowed, addAllowed, removeAllowed } from '../accessStore.js'
import { normalizeEmail, isValidEmail, isAdminEmail } from '../lib/access.js'
import { ADMIN_EMAILS } from '../firebase.js'

// ─── Nutzer verwalten (nur für Admins) ───────────────────────────────────────
// Der Aufrufer (settings.jsx) rendert diese Komponente nur für Admins, damit für
// alle anderen gar kein Listener auf `allowed` startet.

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14,
  borderRadius: 8, border: `1.5px solid ${C.washiDark}`,
}

export default function AdminUsers() {
  const [rows, setRows] = useState(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => watchAllowed(setRows, setError), [])

  const add = async () => {
    setError('')
    if (!isValidEmail(email)) return setHint('Das ist keine gültige E-Mail-Adresse.')
    if (isAdminEmail(email, ADMIN_EMAILS)) return setHint('Diese Adresse ist Admin und braucht keinen Eintrag.')
    // Gegen die Live-Liste prüfen, damit ein Doppeleintrag nicht still den Namen überschreibt.
    if ((rows || []).some(r => r.email === normalizeEmail(email))) return setHint('Schon freigeschaltet.')
    setHint(''); setBusy(true)
    try {
      await addAllowed(email, name)
      setEmail(''); setName('')
    } catch (e) {
      setError(e.message || String(e))
    }
    setBusy(false)
  }

  const remove = async (addr) => {
    if (!window.confirm(`Zugang für ${addr} sperren? Der Lernstand bleibt erhalten.`)) return
    setError(''); setBusy(true)
    try {
      await removeAllowed(addr)
    } catch (e) {
      setError(e.message || String(e))
    }
    setBusy(false)
  }

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>NUTZER VERWALTEN</div>
      <Card style={{ marginBottom: 12 }}>
        {rows === null && !error && <div style={{ fontSize: 12, color: C.textMuted }}>Lade …</div>}
        {rows && rows.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>Noch niemand freigeschaltet.</div>}
        {(rows || []).map(r => (
          <div key={r.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
            <div style={{ fontSize: 13, color: C.sumi, minWidth: 0, overflowWrap: 'anywhere' }}>
              {r.email}{r.name && <span style={{ color: C.textMuted }}> · {r.name}</span>}
            </div>
            <Btn onClick={() => remove(r.email)} disabled={busy} variant="ghost" style={{ padding: '6px 12px', fontSize: 13, flexShrink: 0 }}>Entfernen</Btn>
          </div>
        ))}
        <div style={{ fontSize: 12, color: C.textMuted, margin: '8px 0 12px', lineHeight: 1.5 }}>
          Die Person meldet sich mit genau diesem Google-Konto an.
        </div>
        <div style={{ borderTop: `1px solid ${C.washiDark}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setHint('') }}
            placeholder="E-Mail" autoCapitalize="none" autoCorrect="off" spellCheck={false} style={inputStyle} />
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Name (optional)" style={inputStyle} />
          <Btn onClick={add} disabled={busy}>Freischalten</Btn>
        </div>
        {hint && <div style={{ fontSize: 12, color: C.shu, marginTop: 8 }}>{hint}</div>}
        {error && <div style={{ fontSize: 12, color: C.shu, marginTop: 8, lineHeight: 1.5 }}>✗ {error}</div>}
      </Card>
    </>
  )
}
