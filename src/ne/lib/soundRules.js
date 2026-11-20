// ─── Ton-Regeln ohne React (für components/sound.jsx) ─────────────────────────
// Rein und getestet: der Hinweis ohne Ton und der Zustand einer Hör-Probe (useListenProbe).

// Hinweis „kein Ton“: Er verweist auf die Umschrift – aber nur, wenn sie auch zu sehen ist.
// Ist sie abgeschaltet, sagt er, wo man sie einschaltet (sonst verwiese er ins Leere).
export function noSoundHint(showRoman) {
  return showRoman
    ? 'Auf diesem Gerät gibt es noch keinen Nepali-Ton – die Umschrift zeigt dir die Aussprache.'
    : 'Auf diesem Gerät gibt es noch keinen Nepali-Ton. Die Umschrift, die dir die Aussprache zeigt, kannst du in den Einstellungen einschalten.'
}

// Hör-Probe einer Hör-Aufgabe: sound = null (wird geprüft) | true | false; shown = das
// Geschriebene (Satz bzw. Bedeutung) ist eingeblendet.
export const PROBE_START = { sound: null, shown: false }

// Ergebnis der Prüfung: ohne Ton steht das Geschriebene sofort da (die Aufgabe wird zur
// Leseaufgabe); mit Ton bleibt es, wie es ist – wer schon eingeblendet hat, behält es.
export function probeResult(state, ok) {
  return { sound: !!ok, shown: state.shown || !ok }
}

// „Nichts gehört? … zeigen“ steht, solange nichts eingeblendet und noch nicht geantwortet
// ist – auch während der Prüfung: kommt sie spät, ist man nie festgehalten.
export const offerReveal = (state, answered) => !state.shown && !answered
