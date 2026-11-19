import { useState, useEffect, useRef } from 'react'
import { C } from '../../theme.js'
import { speak, soundAvailable } from '../lib/speech.js'

// Ton-Bausteine für Lernen und Üben – dasselbe Verhalten wie in screens/players.jsx
// (dort noch eigene Kopie), hier eigenständig, damit diese Screens den Lektions-Spieler
// samt Mal-Fläche nicht mitladen. Grundsatz: heute
// gibt es auf den meisten Geräten keinen Nepali-Ton – jeder Anhören-Knopf ist dann
// ausgeblendet bzw. sichtbar gesperrt mit kurzem Hinweis, nie ein Knopf, der nichts tut.

// null = wird noch geprüft, dann true/false. soundAvailable lehnt nie ab und hängt nie.
export function useSound() {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    let live = true
    soundAvailable().then(v => { if (live) setOk(!!v) })
    return () => { live = false }
  }, [])
  return ok
}

export const NO_SOUND_HINT = 'Auf diesem Gerät gibt es noch keinen Nepali-Ton – die Umschrift zeigt dir die Aussprache.'

// Anhören-Knopf mit drei Zuständen: prüfen (gesperrt), kein Ton (Hinweis statt Knopf,
// mit `quiet` ganz ausgeblendet – für Stellen, an denen der Hinweis schon steht),
// Ton (Knopf, solange gesprochen wird als „spricht…“ markiert).
// Jeder Klick bekommt eine eigene Nummer: nur die jüngste Wiedergabe setzt „spricht…“
// zurück, und nach dem Unmount (Kartenwechsel, Blatt zu) wird kein State mehr gesetzt
// (wie usePlayback in screens/players.jsx).
export function ListenButton({ text, sound, label = 'Anhören', quiet = false }) {
  const [busy, setBusy] = useState(false)
  const token = useRef(0)
  useEffect(() => () => { token.current++ }, [])
  if (sound === false) {
    return quiet ? null : <p style={{ fontSize: 12, color: C.textMuted, margin: '0 auto', maxWidth: 280, lineHeight: 1.5 }}>🔇 {NO_SOUND_HINT}</p>
  }
  const checking = sound === null
  const play = () => {
    const my = ++token.current
    setBusy(true)
    speak(text).then(() => { if (token.current === my) setBusy(false) })
  }
  return (
    <button disabled={checking || busy} onClick={play}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
        background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo,
        borderRadius: 22, padding: '8px 18px', fontSize: 14, cursor: checking ? 'default' : 'pointer',
        opacity: checking ? 0.55 : 1,
      }}>
      🔊 {checking ? 'Ton wird geprüft…' : busy ? 'spricht…' : label}
    </button>
  )
}
