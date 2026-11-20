import { useState, useEffect, useRef } from 'react'
import { C, NE } from '../../theme.js'

// ─── Gemeinsamer Rahmen aller Yatra-Lektionen ────────────────────────────────
// Rahmen (LessonFrame), Abschluss-Muster (useFinishOnce), Einmal-Sperre der Weiter-Knöpfe
// (useOnce), Abschluss-Bildschirm (LessonDone) und Schritt-Überschrift (stepLabel) – je nur
// einmal, für Schrift, Wörter, Grammatik (screens/players.jsx), Kapitel und Ziel
// (screens/chapter.jsx) und Szenen (screens/dialog.jsx).

// Abschluss-Muster für jede Lektion:
// „… abschließen“ liegt genau dort, wo nach dem Schließen die TabBar erscheint. Ein
// Doppeltipp träfe mit dem zweiten Tipp einen Tab. Daher: erster Tipp sperrt den Knopf,
// geschlossen wird erst nach einer Doppeltipp-Spanne (~350 ms) – bis dahin fängt das noch
// stehende Overlay den zweiten Tipp ab.
// Gebucht wird dagegen SOFORT beim ersten Tipp (onComplete), verzögert ist nur das
// Schließen (onClose): verschwindet die Lektion in der Spanne (Abmelden, Sprachwechsel,
// ✕), geht kein Abschluss verloren – der Timer wird dann nur verworfen.
// → [finishing (für disabled), finish].
export function useFinishOnce(onComplete, onClose) {
  const [finishing, setFinishing] = useState(false)
  const finishTimer = useRef(null)
  useEffect(() => () => clearTimeout(finishTimer.current), [])
  // Sperre über die Ref, nicht über den State: zwei Klicks im selben Render-Durchgang
  // sähen beide noch finishing = false und riefen onComplete (XP!) doppelt.
  const locked = useRef(false)
  const finish = () => {
    if (locked.current) return
    locked.current = true
    setFinishing(true)
    onComplete()
    finishTimer.current = setTimeout(onClose, 350)
  }
  return [finishing, finish]
}

// Ein Aufruf je Erscheinen, auch bei Doppeltipp: der erste Aufruf gewinnt, jeder weitere
// verpufft (Ref, nicht State – zwei Tipps im selben Render sähen sonst beide „frei“). Für
// die Weiter-Knöpfe einmal beantworteter Aufgaben (chapter.jsx, dialog.jsx).
export function useOnce(fn) {
  const done = useRef(false)
  return (...a) => { if (done.current) return; done.current = true; fn(...a) }
}

// Vollbild-Overlay: Kopf (✕ mit 44 px, Fortschrittsbalken, Schrittzähler, Titel),
// scrollbarer Inhalt, Fußleiste (footer = null → keine, z. B. beim Quiz).
export function LessonFrame({ title, step, total, onClose, footer, children }) {
  // Ein einziger Schritt (Ziel-Station) ist schon das Ende → voller Balken.
  const pct = total <= 1 ? 100 : Math.round((step / (total - 1)) * 100)
  // Neuer Schritt beginnt oben – sonst bliebe nach einer langen Erklärung die Scroll-
  // Position stehen und der nächste Schritt öffnete mitten im Inhalt.
  const bodyRef = useRef(null)
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [step])
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '8px 16px 10px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onClose} aria-label="Lektion schließen" style={{
            width: 44, height: 44, marginLeft: -10, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
          }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted, minWidth: 40, textAlign: 'right' }}>{step + 1}/{total}</span>
        </div>
        <h3 style={{ fontSize: 14, color: C.indigo, margin: 0 }}>{title}</h3>
      </div>

      <div ref={bodyRef} style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>

      {footer && (
        <div style={{ padding: '14px 20px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// Kleine Überschrift über einem Schritt („NEUES WORT“, „HÖREN“, „LÜCKE“ …).
export const stepLabel = text => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textAlign: 'center', marginBottom: 6 }}>{text}</div>
)

const ALREADY_DONE = 'Schon abgeschlossen – diese Runde bringt keine neuen XP.'

// Abschluss-Bildschirm aller Lektionen: 🎉, धेरै राम्रो!, Unterzeile, dann +XP – oder bei
// einer Wiederholung (alreadyDone) der Hinweis ohne XP-Versprechen. before steht zwischen
// Kopf und XP (Sterne, Trefferzahl), children danach (Check-Ergebnis, was wiederkommt).
export function LessonDone({ xp, alreadyDone = false, sub = 'Sehr gut gemacht!', alreadyNote = ALREADY_DONE, before = null, children }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
      <h2 style={{ fontSize: 26, fontFamily: NE, color: C.matcha, marginBottom: 4 }}>धेरै राम्रो!</h2>
      <p style={{ color: C.textMuted, marginBottom: 12 }}>{sub}</p>
      {before}
      {alreadyDone ? (
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{alreadyNote}</p>
      ) : (
        <p style={{ fontSize: 22, fontWeight: 700, color: C.shu, marginBottom: 12 }}>+{xp} XP</p>
      )}
      {children}
    </div>
  )
}
