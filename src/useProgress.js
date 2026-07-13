import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from './firebase'

// Standard-Fortschritt für einen neuen Nutzer: alles bei 0.
const DEFAULT = {
  completedLessons: [],    // IDs abgeschlossener Kana-Lektionen, z.B. ['h1','h2']
  completedWordBlocks: [], // IDs abgeschlossener Wort-Blöcke, z.B. ['wb1']
  completedGrammar: [],    // IDs gelesener Grammatik-Themen, z.B. ['g1']
  completedChapters: [],   // IDs abgeschlossener Geschichts-Kapitel, z.B. ['c1']
  completedDialogs: [],    // IDs abgeschlossener Gesprächs-Szenen, z.B. ['d1']
  chapterStars: {},        // { 'c1': 3 }  → höchster je erreichter Sterne-Stand je Kapitel (1–5)
  xpByDate: {},            // { 'YYYY-MM-DD': XP }  → XP heute, Streak, Wochenchart
  history: {},             // { 'YYYY-MM-DD': { kana, words, grammar, chapters, scenes } } → Wochen-Rückblick
  srs: {},                 // { '山': { ease, interval, reps, due } }  → Wiederholungsplan
  settings: {},            // Nutzer-Einstellungen (s. SETTINGS_DEFAULTS)
}

const DAILY_GOAL = 200      // XP-Ziel pro Tag (Standard, per Einstellungen änderbar)
const XP_PER_LEVEL = 1000   // XP für ein Level

// Einstellbare Parameter mit ihren Standardwerten. Was der Nutzer ändert, landet
// unter progress.settings; fehlende Werte fallen auf diese Defaults zurück.
export const SETTINGS_DEFAULTS = {
  options: 6,             // Antwortmöglichkeiten bei Erkennen/Hören (4–8)
  dailyGoal: DAILY_GOAL,  // XP-Tagesziel
  roundSize: 12,          // Aufgaben pro Übungsrunde
  freeSize: 20,           // Karten je Fleiß-Session
  standardReview: 'mix',  // was „Wiederholen" startet: 'mix' | 'srs'
  audioOnlyDialogs: false, // Gesprächs-Szenen: NPC-Zeile erst als Text nach der Antwort (echtes Hörverstehen)
  speakDialogs: false,     // Gesprächs-Szenen: Antwort sprechen statt antippen (Spracherkennung, Chrome/Android)
}

// Einstellungen mit Defaults zusammenführen (eine Quelle für alle Screens).
export function getSettings(progress) {
  return { ...SETTINGS_DEFAULTS, ...(progress.settings || {}) }
}

// ─── Datums-Helfer (lokale Zeitzone) ─────────────────────────────────────────
export function localDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function dateWithOffset(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d
}
export function addDays(n) {
  return localDate(dateWithOffset(n))
}

// Lokaler Zeitstempel 'YYYY-MM-DDTHH:mm' – für untertägige Fälligkeiten.
// Sortiert per String-Vergleich korrekt MIT reinen Tages-Strings gemischt:
// '2026-07-07' <= '2026-07-07T09:00' (Tages-Fälligkeit gilt ab Tagesbeginn).
export function localDateTime(d = new Date()) {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${localDate(d)}T${h}:${min}`
}
export function addHours(n) {
  const d = new Date()
  d.setHours(d.getHours() + n)
  return localDateTime(d)
}

// Ist eine SRS-Karte jetzt fällig? `due` ist entweder ein Tages-String
// (fällig ab Tagesbeginn) oder ein Zeitstempel (fällig ab dieser Uhrzeit).
export function isDue(entry) {
  return !entry || !entry.due || entry.due <= localDateTime()
}

// ─── Kenntnisstufen ───────────────────────────────────────────────────────────
// Intervall-Grenzen (in Tagen) zwischen den 5 Stufen:
//   Neu <1 · Lernphase <7 · Vertraut <30 · Gefestigt <120 · Gemeistert ≥120
// Einzige Quelle der Wahrheit – der Fortschritt-Screen (SRS_STAGES) baut darauf auf.
export const SRS_STAGE_BOUNDS = [1, 7, 30, 120]

// Beim Vergessen nur EINE Kenntnisstufe zurück: neues Intervall = Untergrenze der
// nächst-niedrigeren Stufe (mind. 1 Tag, damit der SM-2-Multiplikator weiter greift).
function relaxedLapseInterval(interval) {
  const floors = [0, ...SRS_STAGE_BOUNDS] // Untergrenze je Stufe
  let idx = 0
  for (let i = floors.length - 1; i >= 0; i--) {
    if ((interval || 0) >= floors[i]) { idx = i; break }
  }
  return Math.max(1, floors[Math.max(0, idx - 1)])
}

// Nach „Nochmal" kommt die Karte nach so vielen Stunden erneut – lernwirksamer
// Abruf noch am selben Tag statt erst morgen (untertägiger Wiederholungsschritt).
export const LAPSE_RETRY_HOURS = 4

// ─── SRS (SM-2-Algorithmus) ───────────────────────────────────────────────────
// quality: 1 = Nochmal (vergessen), 3 = Schwer, 4 = Gut, 5 = Leicht.
export function sm2(prev, quality) {
  let ease = prev?.ease ?? 2.5
  let interval = prev?.interval ?? 0
  let reps = prev?.reps ?? 0
  let due

  if (quality < 3) {
    // Entspannter Rückfall: Kenntnisstand nur eine Stufe zurück, der Lernfortschritt
    // bleibt großteils erhalten – die Karte wird aber schon nach ein paar Stunden
    // wieder fällig (Auffrischung noch am selben Tag, z. B. in der Abend-Session).
    interval = relaxedLapseInterval(interval)
    reps = Math.max(2, reps - 1) // Multiplikator-Pfad halten, nicht wieder von vorn lernen
    due = addHours(LAPSE_RETRY_HOURS)
  } else {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 6
    else interval = Math.round(interval * ease)
    due = addDays(interval)
  }
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease < 1.3) ease = 1.3

  return { ease: Math.round(ease * 100) / 100, interval, reps, due }
}

// Welche der gelernten Kana sind jetzt fällig (oder neu/noch nie wiederholt)?
export function dueKana(progress, learnedKana) {
  const srs = progress.srs || {}
  return learnedKana.filter(k => isDue(srs[k]))
}

// ─── Abgeleitete Statistiken aus dem gespeicherten Fortschritt ────────────────
export function computeStats(progress) {
  const xpByDate = progress.xpByDate || {}
  const today = localDate()
  const xpToday = xpByDate[today] || 0
  const totalXp = Object.values(xpByDate).reduce((a, b) => a + (b || 0), 0)
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1

  // Streak = aufeinanderfolgende Tage mit XP > 0.
  // Startet heute (falls heute schon XP) oder gestern (heute noch offen).
  let streak = 0
  const startOffset = xpToday > 0 ? 0 : -1
  for (let o = startOffset; o > -400; o--) {
    const key = localDate(dateWithOffset(o))
    if ((xpByDate[key] || 0) > 0) streak++
    else break
  }

  const goal = progress.settings?.dailyGoal ?? DAILY_GOAL
  return { xpToday, totalXp, level, streak, goal }
}

// ─── Hook: lädt live aus Firestore und liefert Schreib-Funktionen ─────────────
export function useProgress(uid) {
  const [progress, setProgress] = useState(DEFAULT)
  const [loading, setLoading] = useState(true)
  // Echter Schreibfehler (z. B. von Firestore-Regeln verweigert) – NICHT bloßes
  // Offline-Sein: das fängt der lokale Cache (firebase.js) unsichtbar ab und
  // synchronisiert automatisch, sobald wieder Netz da ist.
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!uid || !db) { setLoading(false); return }
    const ref = doc(db, 'users', uid)
    const unsub = onSnapshot(
      ref,
      snap => {
        setProgress(snap.exists() ? { ...DEFAULT, ...snap.data() } : DEFAULT)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [uid])

  const ref = () => doc(db, 'users', uid)

  // Schreibt sicher: fängt echte Fehler ab (Firestore-Regel verweigert, Quota,
  // korrupte Daten) und macht sie über `saveError` sichtbar, statt den
  // Fortschritt kommentarlos verschwinden zu lassen.
  const safeWrite = async (data, opts) => {
    try {
      await setDoc(ref(), data, opts)
      setSaveError(null)
    } catch (err) {
      setSaveError(err?.message || 'Speichern fehlgeschlagen')
    }
  }

  // XP für heute gutschreiben (atomar per increment, auch geräteübergreifend korrekt).
  const awardXp = async (amount) => {
    if (!uid || !db || !amount) return
    await safeWrite({ xpByDate: { [localDate()]: increment(amount) } }, { merge: true })
  }

  // Tages-Journal für den Wochen-Rückblick: kleine Zähler je Datum (z. B.
  // { kana: 5 } oder { chapters: 1, words: 5 }). Läuft atomar im selben
  // Schreibvorgang wie der Abschluss mit.
  const histPatch = (stats) => {
    const inc = {}
    for (const [k, v] of Object.entries(stats || {})) if (v) inc[k] = increment(v)
    return Object.keys(inc).length ? { history: { [localDate()]: inc } } : {}
  }

  // Lektion abschließen: als erledigt markieren UND XP gutschreiben.
  const completeLesson = async (id, xp = 0, stats) => {
    if (!uid || !db) return
    await safeWrite(
      { completedLessons: arrayUnion(id), xpByDate: { [localDate()]: increment(xp) }, ...histPatch(stats) },
      { merge: true },
    )
  }

  // Einen Wort-Block als abgeschlossen markieren + XP gutschreiben.
  const completeWordBlock = async (blockId, xp = 0, stats) => {
    if (!uid || !db) return
    await safeWrite(
      { completedWordBlocks: arrayUnion(blockId), xpByDate: { [localDate()]: increment(xp) }, ...histPatch(stats) },
      { merge: true },
    )
  }

  // Ein Grammatik-Thema als gelernt markieren + XP gutschreiben.
  const completeGrammar = async (grammarId, xp = 0, stats = { grammar: 1 }) => {
    if (!uid || !db) return
    await safeWrite(
      { completedGrammar: arrayUnion(grammarId), xpByDate: { [localDate()]: increment(xp) }, ...histPatch(stats) },
      { merge: true },
    )
  }

  // Ein Geschichts-Kapitel als abgeschlossen markieren + XP gutschreiben.
  const completeChapter = async (chapterId, xp = 0, stats = { chapters: 1 }) => {
    if (!uid || !db) return
    await safeWrite(
      { completedChapters: arrayUnion(chapterId), xpByDate: { [localDate()]: increment(xp) }, ...histPatch(stats) },
      { merge: true },
    )
  }

  // Eine Gesprächs-Szene als abgeschlossen markieren + XP gutschreiben.
  const completeDialog = async (dialogId, xp = 0, stats = { scenes: 1 }) => {
    if (!uid || !db) return
    await safeWrite(
      { completedDialogs: arrayUnion(dialogId), xpByDate: { [localDate()]: increment(xp) }, ...histPatch(stats) },
      { merge: true },
    )
  }

  // Eine SRS-Karte bewerten → nächste Fälligkeit per SM-2 berechnen & speichern.
  const reviewCard = async (key, quality) => {
    if (!uid || !db) return
    const next = sm2((progress.srs || {})[key], quality)
    await safeWrite({ srs: { [key]: next } }, { merge: true })
  }

  // Neu gelernte Items in den Wiederholungsplan aufnehmen: Fälligkeit in der
  // ZUKUNFT (gestaffelt ~8/Tag ab morgen), statt sie sofort als „fällig" zu
  // zählen. So zeigt „fällig" echte anstehende Reviews und wächst nicht einfach
  // mit jedem gelernten Zeichen. Idempotent: plant nur noch nicht geplante Keys.
  const scheduleNew = async (keys) => {
    if (!uid || !db || !keys || !keys.length) return
    const srs = progress.srs || {}
    // Noch ungeplante Keys: kein Eintrag ODER nur eine Notiz ohne Fälligkeit
    // (z. B. wenn vor dem ersten Review schon eine Merkhilfe gespeichert wurde).
    const fresh = keys.filter(k => !srs[k] || srs[k].due == null)
    if (!fresh.length) return
    const updates = {}
    fresh.forEach((k, i) => {
      updates[k] = { ease: 2.5, interval: 0, reps: 0, due: addDays(1 + Math.floor(i / 8)) }
    })
    await safeWrite({ srs: updates }, { merge: true })
  }

  // Sterne-Höchststand je Kapitel anheben (monoton: nur Anstiege werden gespeichert,
  // damit einmal erreichte Sterne nie wieder verloren gehen). `updates` = { c1: 3, … }.
  const bumpChapterStars = async (updates) => {
    if (!uid || !db || !updates) return
    const cur = progress.chapterStars || {}
    const patch = {}
    for (const [id, n] of Object.entries(updates)) {
      if ((n || 0) > (cur[id] || 0)) patch[id] = n
    }
    if (!Object.keys(patch).length) return
    await safeWrite({ chapterStars: patch }, { merge: true })
  }

  // Merkhilfe/Notiz zu einer SRS-Karte speichern (leerer Text löscht sie). Wird
  // beim nächsten Aufdecken wieder angezeigt. Deep-Merge lässt ease/interval/due
  // unberührt; reviewCard wiederum lässt die Notiz unberührt.
  const saveNote = async (key, note) => {
    if (!uid || !db || !key) return
    await safeWrite({ srs: { [key]: { note: (note || '').trim() } } }, { merge: true })
  }

  // Einstellungen (teil-)speichern. Merge lässt unveränderte Werte unberührt.
  const saveSettings = async (patch) => {
    if (!uid || !db || !patch) return
    await safeWrite({ settings: patch }, { merge: true })
  }

  // Kompletter Reset auf 0 (überschreibt das Dokument). Einstellungen bleiben erhalten:
  // volles Überschreiben (löscht srs/xpByDate sicher), aber settings werden mitgenommen.
  const reset = async () => {
    if (!uid || !db) return
    await safeWrite({ completedLessons: [], completedWordBlocks: [], completedGrammar: [], completedChapters: [], completedDialogs: [], chapterStars: {}, xpByDate: {}, history: {}, srs: {}, settings: progress.settings || {} })
  }

  return { progress, loading, saveError, awardXp, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, reviewCard, scheduleNew, saveNote, saveSettings, bumpChapterStars, reset }
}
