// Mehrere Texte nacheinander sprechen (z. B. ein Laut-Paar ख/क), abbrechbar.
// Warum eigene Funktion: stopSpeaking() lässt das laufende speak() normal AUFLÖSEN –
// eine nackte Kette speak(a).then(() => speak(b)) startete b dann trotzdem, auch nach
// dem Verlassen des Schritts. Darum vor JEDEM Text isCancelled() fragen.
// Lehnt nie ab: ein Fehler in speakFn oder isCancelled beendet die Folge still.
export async function playSequence(texts, speakFn, isCancelled) {
  try {
    for (const t of texts) {
      if (isCancelled()) return
      await speakFn(t)
    }
  } catch { /* still beenden – Ton ist nie kritisch */ }
}
