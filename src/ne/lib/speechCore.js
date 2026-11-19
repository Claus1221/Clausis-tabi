import { pickSource, pickVoice, deviceMode, watchdogMs } from './speechPick.js'

// ─── Sprachausgabe Nepali (ne-NP): Zustandsmaschine ─────────────────────────
// Drei Stufen: Studio-MP3 (Azure, vorgeneriert, Manifest) → Nepali-Stimme des
// Geräts (bei leerer Stimmenliste nur per lang) → still. Wie das japanische
// Gegenstück gilt: JEDER Fehlerpfad löst das Versprechen von speak() auf – nie
// hängt ein Aufrufer an „NPC redet noch". Bewusst KEIN Ersatz durch Hindi o. Ä.
//
// Alle Browser-Abhängigkeiten kommen von außen (`deps`), damit die Abläufe in Node
// mit Attrappen testbar sind; speech.js verdrahtet nur die echten Objekte:
//   fetchManifest()      → Promise<{Text: Datei}> (darf werfen/ablehnen = leer)
//   getVoices()          → Stimmenliste des Geräts (leer, solange sie lädt)
//   onVoicesChanged(cb)  → meldet an, gibt die Abmelde-Funktion zurück
//   makeAudio()          → Audio-Element;  makeUtterance(text) → Utterance
//   synth                → speechSynthesis (cancel/resume/speak) oder undefined
//   audioBase            → URL-Präfix der MP3s
export function createSpeech(deps) {
  const { fetchManifest, getVoices, onVoicesChanged, makeAudio, makeUtterance, synth, audioBase } = deps
  const VOICE_WAIT_MS = 1500

  // ─── Manifest ──────────────────────────────────────────────────────────────
  // Einmal pro Sitzung; jeder Fehler (404, Netz, JSON, Wurf) zählt als leer, und auch
  // das wird gemerkt – kein Wiederhol-Sturm.
  let manifest = null
  let manifestPromise = null
  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = (async () => {
        try {
          const m = await fetchManifest()
          return m && typeof m === 'object' && !Array.isArray(m) ? m : {}
        } catch { return {} }
      })().then(m => { manifest = m; return m })
    }
    return manifestPromise
  }

  // ─── Gerätestimmen ─────────────────────────────────────────────────────────
  const currentVoices = () => {
    if (!synth) return []
    try { return getVoices() || [] } catch { return [] }
  }
  // Chrome liefert die Liste asynchron. Gewartet wird höchstens EINMAL pro Seite und nur
  // solange sie leer ist; danach nie wieder (sonst verzögert sich jede Ausgabe). Eine
  // nicht-leere Liste ohne Nepali-Stimme ist eine endgültige Antwort ('none').
  let voiceWait = null
  function waitForVoices() {
    if (!synth || currentVoices().length > 0) return Promise.resolve(currentVoices())
    if (!voiceWait) {
      voiceWait = new Promise(resolve => {
        let off = () => {}
        let timer = 0
        const done = () => { clearTimeout(timer); off(); resolve(currentVoices()) }
        timer = setTimeout(done, VOICE_WAIT_MS)
        try {
          off = onVoicesChanged(() => { if (currentVoices().length > 0) done() }) || off
        } catch { /* nur Zeitablauf */ }
      })
    }
    return voiceWait
  }

  let soundOk = false
  // Gibt es sicher Ton? Aufgaben, die nur über das Hören lösbar wären, zeigen sonst das
  // Geschriebene. Konservativ: eine leere Stimmenliste zählt als „kein Ton bekannt" –
  // auch wenn speak() es dort per lang-only versucht (Zugabe, nie Voraussetzung).
  async function soundAvailable() {
    try {
      if (soundOk) return true
      const m = await loadManifest()
      if (Object.keys(m).length > 0) return (soundOk = true)
      if (pickVoice(await waitForVoices())) return (soundOk = true)
    } catch { /* unten: false */ }
    return false
  }

  // Synchron, nach bestem Wissen: nur was schon geladen ist, und nur echte Nepali-Stimmen.
  function canSpeak(text) {
    return pickSource({ text, manifest, hasDeviceVoice: !!pickVoice(currentVoices()) }).kind !== 'none'
  }

  // ─── Sprech-Ereignisse ─────────────────────────────────────────────────────
  const listeners = new Set()
  function onSpeechState(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }

  let speaking = false
  let speakSeq = 0                 // je speak(): Ereignisse abgelöster Ausgaben fallen weg
  const finishers = new Map()      // seq → resolve
  const timers = new Map()         // seq → Watchdog
  let audioEl = null
  let pendingSpeak = 0

  function fire(state) {
    speaking = state === 'start'
    for (const cb of listeners) {
      try { cb(state) } catch { /* ein Zuhörer darf die Ausgabe nie kippen */ }
    }
  }
  function emit(state, seq) {
    if (seq !== speakSeq) return
    if ((state === 'start') === speaking) return
    fire(state)
  }
  function settle(seq) {
    clearTimeout(timers.get(seq))
    timers.delete(seq)
    const done = finishers.get(seq)
    if (!done) return
    finishers.delete(seq)
    done()
  }
  function finish(seq) {
    emit('end', seq)
    settle(seq)
  }
  function silence() {
    if (synth) { try { synth.cancel() } catch { /* egal */ } }
    if (audioEl) { try { audioEl.pause() } catch { /* egal */ } }
  }
  // Notbremse: kommt kein `end`/`ended`, gilt der Satz nach `ms` als zu Ende. Ein neuer
  // Aufruf für dieselbe seq ersetzt den alten Zeitgeber (Gesamtdeckel → Quellen-Deckel).
  function watchdog(seq, ms) {
    clearTimeout(timers.get(seq))
    timers.set(seq, setTimeout(() => {
      if (seq === speakSeq) silence()
      finish(seq)
    }, ms))
  }

  function stopSpeaking() {
    speakSeq++
    clearTimeout(pendingSpeak)
    silence()
    if (speaking) fire('end')
    for (const seq of [...finishers.keys()]) settle(seq)
  }

  // `mode` = deviceMode der Liste ('voice' | 'lang-only' | 'none'), `voice` die gewählte
  // Stimme; beides kommt fertig herein, hier wird nicht noch einmal gewartet.
  function deviceSpeak(text, seq, mode, voice) {
    try {
      if (!synth || mode === 'none') { finish(seq); return }   // sicher keine Nepali-Stimme: still
      const u = makeUtterance(text)
      u.lang = 'ne-NP'
      if (mode === 'voice' && voice) u.voice = voice   // 'lang-only': Systemstimme über lang routen lassen
      u.rate = 0.85
      u.onstart = () => emit('start', seq)
      u.onend = () => finish(seq)
      u.onerror = () => finish(seq)   // auch „interrupted/canceled"
      watchdog(seq, watchdogMs(text))
      clearTimeout(pendingSpeak)
      synth.cancel()
      // cancel() + speak() im selben Tick schneidet in Chrome den Wortanfang ab;
      // resume() löst den Chrome/Android-Hänger bei pausierter Synthese.
      pendingSpeak = setTimeout(() => {
        try { synth.resume(); synth.speak(u) } catch { finish(seq) }
      }, 60)
    } catch {
      finish(seq)
    }
  }

  function playMp3(file, seq, text) {
    try {
      if (!audioEl) audioEl = makeAudio()
      audioEl.onplaying = () => emit('start', seq)
      audioEl.onended = () => finish(seq)
      // Datei kaputt/fehlt → Gerätestimme (soweit eine in Frage kommt), sonst still
      audioEl.onerror = () => {
        if (seq !== speakSeq) return
        emit('end', seq)
        const list = currentVoices()
        deviceSpeak(text, seq, deviceMode(list), pickVoice(list))
      }
      audioEl.src = audioBase + file
      watchdog(seq, 30000)   // hängender Ladevorgang darf nicht ewig blockieren
      // Abgelehnt = unterbrochen (seq dann ohnehin veraltet) oder Autoplay blockiert. Kein
      // Gerätestimmen-Ersatz: ohne Nutzergeste würde der Browser auch die Synthese sperren,
      // der Versuch verschöbe das Ende nur.
      Promise.resolve(audioEl.play()).catch(() => finish(seq))
    } catch {
      finish(seq)
    }
  }

  async function run(text, seq) {
    try {
      const m = await loadManifest()
      if (seq !== speakSeq) return
      const hit = pickSource({ text, manifest: m, hasDeviceVoice: false }).kind === 'mp3'
      // Bei MP3-Treffer nicht auf Stimmen warten (nur Ersatz); sonst höchstens einmal pro Seite.
      const list = hit ? currentVoices() : await waitForVoices()
      if (seq !== speakSeq) return
      const mode = synth ? deviceMode(list) : 'none'
      const voice = pickVoice(list)
      const src = pickSource({ text, manifest: m, hasDeviceVoice: mode !== 'none' })
      if (src.kind === 'mp3') playMp3(src.file, seq, text)
      else if (src.kind === 'device') deviceSpeak(text, seq, mode, voice)
      else finish(seq)
    } catch {
      finish(seq)
    }
  }

  // Einen Nepali-Text (Devanagari) vorlesen. Löst auf, wenn fertig gesprochen ODER
  // feststeht, dass nicht gesprochen werden kann – lehnt nie ab. Ein neuer Aufruf beendet
  // den laufenden (dessen Versprechen löst dabei ebenfalls auf).
  function speak(text) {
    if (!text) return Promise.resolve()
    stopSpeaking()
    const seq = ++speakSeq
    const promise = new Promise(resolve => finishers.set(seq, resolve))
    watchdog(seq, 8000 + watchdogMs(text))   // Gesamtdeckel, falls ein Schritt davor hängt
    run(String(text), seq)
    return promise
  }

  return { speak, stopSpeaking, onSpeechState, canSpeak, soundAvailable }
}
