import { pickSource, pickVoice, deviceMode, watchdogMs } from './speechPick.js'

// ─── Sprachausgabe Nepali (ne-NP) ───────────────────────────────────────────
// Drei Stufen: Studio-MP3 (Azure, vorgeneriert, Manifest) → Nepali-Stimme des
// Geräts (bei leerer Stimmenliste nur per lang) → still. Wie das japanische Gegenstück gilt: JEDER Fehlerpfad löst das
// Versprechen von speak() auf – nie hängt ein Aufrufer an „NPC redet noch".
// Solange es keine MP3s gibt (kein Azure-Key), spricht in der Praxis die
// Gerätestimme oder es bleibt still; der Kurs ist auch ohne Ton benutzbar.
// Bewusst KEIN Ersatz durch Hindi o. Ä.: eine fremde Stimme lehrt falsche Aussprache.

const AUDIO_BASE = import.meta.env.BASE_URL + 'audio-ne/'
const hasSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// ─── Manifest ────────────────────────────────────────────────────────────────
// Flach { Text(NFC): "<hash>.mp3" }. Einmal pro Sitzung geladen; 404, Netzfehler,
// kaputtes JSON oder Zeitüberschreitung zählen als leer – und das Ergebnis wird
// auch gemerkt, damit es keinen Wiederhol-Sturm und keinen Konsolenlärm gibt.
let manifest = null            // geladenes Manifest (oder {}), null = noch offen
let manifestPromise = null
function loadManifest() {
  if (manifestPromise) return manifestPromise
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = setTimeout(() => ctrl?.abort(), 5000)
  manifestPromise = fetch(AUDIO_BASE + 'manifest.json', { signal: ctrl?.signal })
    .then(r => (r.ok ? r.json() : null))
    .then(m => (m && typeof m === 'object' && !Array.isArray(m) ? m : {}))
    .catch(() => ({}))
    .then(m => { clearTimeout(timer); manifest = m; return m })
  return manifestPromise
}

// ─── Gerätestimme ────────────────────────────────────────────────────────────
// Chrome liefert die Stimmenliste asynchron (erst nach `voiceschanged`) – vor einem
// „keine Stimme" kurz darauf warten. Nur ein positives Ergebnis wird gemerkt: eine
// Stimme kann später dazukommen (Sprachdaten installiert).
let deviceVoice = null
function refreshVoice() {
  if (!hasSynth()) return null
  try { deviceVoice = pickVoice(speechSynthesis.getVoices()) } catch { deviceVoice = null }
  return deviceVoice
}
function waitForVoice(timeoutMs = 1500) {
  if (refreshVoice() || !hasSynth()) return Promise.resolve(deviceVoice)
  return new Promise(resolve => {
    let done = false
    const finishWait = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      speechSynthesis.removeEventListener?.('voiceschanged', onChange)
      resolve(refreshVoice())
    }
    const onChange = () => { if (refreshVoice()) finishWait() }
    const timer = setTimeout(finishWait, timeoutMs)
    speechSynthesis.addEventListener?.('voiceschanged', onChange)
  })
}

let soundOk = false
// Gibt es überhaupt Ton? Aufgaben, die nur über das Hören lösbar wären, fragen das
// ab und zeigen ohne Ton das Geschriebene.
export async function soundAvailable() {
  if (soundOk) return true
  const m = await loadManifest()
  if (Object.keys(m).length > 0) return (soundOk = true)
  if (await waitForVoice()) return (soundOk = true)
  return false
}

// Synchron und nach bestem Wissen – nur, was schon geladen ist.
export function canSpeak(text) {
  refreshVoice()
  return pickSource({ text, manifest, hasDeviceVoice: !!deviceVoice }).kind !== 'none'
}

// ─── Sprech-Ereignisse ───────────────────────────────────────────────────────
// 'start' | 'end' – grob statt wortgenau (boundary ist auf Android unzuverlässig).
const speechListeners = new Set()
export function onSpeechState(cb) {
  speechListeners.add(cb)
  return () => speechListeners.delete(cb)
}

let speaking = false
// Laufende Nummer je speak(): Ereignisse einer abgelösten Ausgabe kommen nicht durch.
let speakSeq = 0
const finishers = new Map()   // seq → resolve
const timers = new Map()      // seq → Watchdog

function fire(state) {
  speaking = state === 'start'
  for (const cb of speechListeners) {
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

let audioEl = null
let pendingSpeak = 0

// Notbremse: kommt kein `end`/`ended`, gilt der Satz nach `ms` als zu Ende. Ein neuer
// Aufruf für dieselbe seq ersetzt den alten Zeitgeber (Gesamtdeckel → Quellen-Deckel).
function watchdog(seq, ms) {
  clearTimeout(timers.get(seq))
  timers.set(seq, setTimeout(() => {
    if (seq === speakSeq) {
      if (hasSynth()) { try { speechSynthesis.cancel() } catch { /* egal */ } }
      if (audioEl) { try { audioEl.pause() } catch { /* egal */ } }
    }
    finish(seq)
  }, ms))
}

export function stopSpeaking() {
  speakSeq++
  clearTimeout(pendingSpeak)
  if (hasSynth()) { try { speechSynthesis.cancel() } catch { /* egal */ } }
  if (audioEl) { try { audioEl.pause() } catch { /* egal */ } }
  if (speaking) fire('end')
  for (const seq of [...finishers.keys()]) settle(seq)
}

function playMp3(file, seq, text) {
  try {
    if (!audioEl) audioEl = new Audio()
    audioEl.onplaying = () => emit('start', seq)
    audioEl.onended = () => finish(seq)
    // Datei kaputt/fehlt → Gerätestimme, sonst still
    audioEl.onerror = () => {
      if (seq !== speakSeq) return
      emit('end', seq)
      deviceSpeak(text, seq)
    }
    audioEl.src = AUDIO_BASE + file
    watchdog(seq, 30000)   // hängender Ladevorgang darf nicht ewig blockieren
    // Abgelehnt = unterbrochen (seq dann ohnehin veraltet) oder Autoplay blockiert.
    audioEl.play()?.catch(() => finish(seq))
  } catch {
    finish(seq)
  }
}

async function deviceSpeak(text, seq) {
  try {
    const voice = await waitForVoice()
    if (seq !== speakSeq) return
    if (!hasSynth() || (!voice && !voiceListEmpty)) { finish(seq); return }   // sicher keine Nepali-Stimme: still
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ne-NP'
    if (voice) u.voice = voice   // leere Liste: nur über lang routen lassen
    u.rate = 0.85
    u.onstart = () => emit('start', seq)
    u.onend = () => finish(seq)
    u.onerror = () => finish(seq)   // auch „interrupted/canceled"
    watchdog(seq, watchdogMs(text))
    clearTimeout(pendingSpeak)
    speechSynthesis.cancel()
    // cancel() + speak() im selben Tick schneidet in Chrome den Wortanfang ab;
    // resume() löst den Chrome/Android-Hänger bei pausierter Synthese.
    pendingSpeak = setTimeout(() => {
      try { speechSynthesis.resume(); speechSynthesis.speak(u) } catch { finish(seq) }
    }, 60)
  } catch {
    finish(seq)
  }
}

async function run(text, seq) {
  try {
    const m = await loadManifest()
    if (seq !== speakSeq) return
    // Die Gerätestimme nur abwarten, wenn sie gebraucht wird (kein MP3-Treffer) –
    // und bei MP3-Treffer nur nachsehen, ob sie als Ersatz bereitstünde.
    const hit = pickSource({ text, manifest: m, hasDeviceVoice: false })
    if (hit.kind !== 'mp3') await waitForVoice()
    else refreshVoice()
    const hasVoice = !!deviceVoice || voiceListEmpty
    if (seq !== speakSeq) return
    const src = pickSource({ text, manifest: m, hasDeviceVoice: hasVoice })
    if (src.kind === 'mp3') playMp3(src.file, seq, text)
    else if (src.kind === 'device') deviceSpeak(text, seq)
    else finish(seq)
  } catch {
    finish(seq)
  }
}

// Einen Nepali-Text (Devanagari) vorlesen. Löst auf, wenn fertig gesprochen ODER
// feststeht, dass nicht gesprochen werden kann. Ein neuer Aufruf beendet den
// laufenden (dessen Versprechen löst dabei ebenfalls auf).
export function speak(text) {
  if (!text) return Promise.resolve()
  stopSpeaking()
  const seq = ++speakSeq
  const promise = new Promise(resolve => finishers.set(seq, resolve))
  watchdog(seq, 8000 + watchdogMs(text))   // Gesamtdeckel, falls ein Schritt davor hängt
  run(String(text), seq)
  return promise
}
