import { useState, useEffect, useRef } from 'react'
import { C } from '../../theme.js'
import { speak, stopSpeaking, soundAvailable } from '../lib/speech.js'
import { playSequence } from '../lib/sequence.js'
import { noSoundHint, PROBE_START, probeResult, offerReveal } from '../lib/soundRules.js'
// Kreis-Import mit text.jsx (das ListenButton nutzt) ist unschädlich: beide Seiten nutzen
// das andere Modul erst beim Rendern, nie beim Laden.
import { useShowRoman } from './text.jsx'

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

// Der ganze Hinweis steht je Screen einmal ausgeschrieben (Lektions-Einleitung, Kopf der
// Bibliothek …); an den einzelnen Stellen nur das stumme Zeichen. Nur wenn sicher kein Ton
// da ist (sound === false). Der Text folgt dem Umschrift-Schalter (lib/soundRules.js):
// ist sie aus, sagt er, wo man sie einschaltet. extra = Satz dazu (z. B. was Hör-Aufgaben
// dann tun), style = Abstände der jeweiligen Stelle.
export function NoSoundBanner({ sound, extra = '', style }) {
  const showRoman = useShowRoman()
  if (sound !== false) return null
  return (
    <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5, ...style }}>
      🔇 {noSoundHint(showRoman)}{extra ? ` ${extra}` : ''}
    </div>
  )
}

// Hör-Aufgabe (Kapitel „Was wurde gesagt?“, Hörfrage im Wort-Quiz): beim Zeigen den Ton
// prüfen, mit Ton einmal vorlesen, ohne Ton das Geschriebene sofort einblenden (die Aufgabe
// wird zur Leseaufgabe). text = null → keine Hör-Aufgabe, nichts wird geprüft. key = neue
// Aufgabe (Standard: der Text) – dann beginnt die Probe von vorn. Beim Wechsel/Schließen
// verstummen; eine späte Antwort der Prüfung wirkt nicht mehr.
// → { sound: null|true|false, shown, reveal, canReveal(answered) } – Regeln in lib/soundRules.js.
export function useListenProbe(text, key = text) {
  const [probe, setProbe] = useState(PROBE_START)
  useEffect(() => {
    let live = true
    setProbe(PROBE_START)
    if (text) {
      soundAvailable().then(ok => {
        if (!live) return
        setProbe(s => probeResult(s, ok))
        if (ok) speak(text)
      })
    }
    return () => { live = false; stopSpeaking() }
  }, [key]) // eslint-disable-line
  return {
    sound: probe.sound,
    shown: probe.shown,
    reveal: () => setProbe(s => ({ ...s, shown: true })),
    canReveal: answered => offerReveal(probe, answered),
  }
}

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
// solange gesprochen wird als „spricht…“ markiert). ariaLabel: Name für Vorleser, nötig,
// wenn label leer ist (nur 🔊 sichtbar) – z. B. „Anhören: पानी“.
export function ListenButton({ text, sound, label = 'Anhören', quiet = false, ariaLabel }) {
  const [busy, play] = usePlayback()
  if (sound === false) return quiet ? null : <NoSoundMark />
  const checking = sound === null
  return (
    <button disabled={checking || busy !== null} aria-label={ariaLabel}
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
