import { useState, useEffect, useRef } from 'react'
import { C } from '../../theme.js'
import { speak, soundAvailable } from '../lib/speech.js'
import { playSequence } from '../lib/sequence.js'

// Ton-Bausteine für alle Yatra-Screens (Lektion, Lernen, Üben) – eine einzige Fassung.
// Grundsatz: heute gibt es auf den meisten Geräten keinen Nepali-Ton (kein Studio-Audio,
// selten eine Nepali-Stimme) – jeder Anhören-Knopf ist dann ausgeblendet bzw. durch ein
// stummes 🔇 ersetzt, nie ein Knopf, der nichts tut. Gelesen wird über die Umschrift.

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

// Der ganze Satz steht je Screen einmal ausgeschrieben (Lektions-Einleitung, Kopf der
// Bibliothek); an den einzelnen Stellen nur das stumme Zeichen.
export const NO_SOUND_HINT = 'Auf diesem Gerät gibt es noch keinen Nepali-Ton – die Umschrift zeigt dir die Aussprache.'

export function NoSoundMark() {
  return (
    <span role="img" aria-label="kein Ton" title="kein Ton"
      style={{ fontSize: 15, color: C.textMuted, opacity: 0.6 }}>🔇</span>
  )
}

// Abspiel-Zustand eines Bausteins. Jeder Klick bekommt eine eigene Nummer (token):
// nur die JÜNGSTE Wiedergabe darf `busy` zurücksetzen – sonst schaltete das späte
// Auflösen einer abgelösten Ausgabe (stopSpeaking/überlappendes speak lösen normal
// auf) die Anzeige der gerade laufenden ab. Beim Unmount (Schrittwechsel, Schließen)
// wird die Nummer verbraucht: laufende Folgen brechen vor dem nächsten Text ab, und
// es wird kein State mehr gesetzt.
export function usePlayback() {
  const [busy, setBusy] = useState(null)
  const token = useRef(0)
  useEffect(() => () => { token.current++ }, [])
  const play = (key, texts) => {
    const my = ++token.current
    setBusy(key)
    playSequence(texts, speak, () => token.current !== my)
      .then(() => { if (token.current === my) setBusy(null) })
  }
  return [busy, play]
}

// Anhören-Knopf mit drei Zuständen: prüfen (gesperrt), kein Ton (nur stummes Zeichen,
// mit `quiet` gar nichts – z. B. auf der Rückseite einer Karteikarte), Ton (44-px-Knopf,
// solange gesprochen wird als „spricht…“ markiert).
export function ListenButton({ text, sound, label = 'Anhören', quiet = false }) {
  const [busy, play] = usePlayback()
  if (sound === false) return quiet ? null : <NoSoundMark />
  const checking = sound === null
  return (
    <button disabled={checking || busy !== null}
      onClick={() => play('x', [text])}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
        background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo,
        borderRadius: 22, padding: '8px 18px', fontSize: 14, cursor: checking ? 'default' : 'pointer',
        opacity: checking ? 0.55 : 1,
      }}>
      🔊 {checking ? 'Ton wird geprüft…' : busy !== null ? 'spricht…' : label}
    </button>
  )
}
