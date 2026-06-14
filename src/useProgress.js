import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from './firebase'

// Standard-Fortschritt für einen neuen Nutzer: alles bei 0.
const DEFAULT = {
  completedLessons: [],    // IDs abgeschlossener Kana-Lektionen, z.B. ['h1','h2']
  completedWordBlocks: [], // IDs abgeschlossener Wort-Blöcke, z.B. ['wb1']
  completedGrammar: [],    // IDs gelesener Grammatik-Themen, z.B. ['g1']
  xpByDate: {},            // { 'YYYY-MM-DD': XP }  → XP heute, Streak, Wochenchart
  srs: {},                 // { '山': { ease, interval, reps, due } }  → Wiederholungsplan
}

const DAILY_GOAL = 200      // XP-Ziel pro Tag
const XP_PER_LEVEL = 1000   // XP für ein Level

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

// ─── SRS (SM-2-Algorithmus) ───────────────────────────────────────────────────
// quality: 1 = Nochmal (vergessen), 3 = Schwer, 4 = Gut, 5 = Leicht.
export function sm2(prev, quality) {
  let ease = prev?.ease ?? 2.5
  let interval = prev?.interval ?? 0
  let reps = prev?.reps ?? 0

  if (quality < 3) {
    reps = 0
    interval = 1 // morgen wieder
  } else {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 6
    else interval = Math.round(interval * ease)
  }
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease < 1.3) ease = 1.3

  return { ease: Math.round(ease * 100) / 100, interval, reps, due: addDays(interval) }
}

// Welche der gelernten Kana sind heute fällig (oder neu/noch nie wiederholt)?
export function dueKana(progress, learnedKana) {
  const srs = progress.srs || {}
  const today = localDate()
  return learnedKana.filter(k => {
    const e = srs[k]
    return !e || !e.due || e.due <= today
  })
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

  return { xpToday, totalXp, level, streak, goal: DAILY_GOAL }
}

// Letzte 7 Tage (alt → neu) mit Wochentags-Label und XP.
export function weeklyXp(progress) {
  const xpByDate = progress.xpByDate || {}
  const names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const out = []
  for (let o = -6; o <= 0; o++) {
    const d = dateWithOffset(o)
    out.push({ label: names[d.getDay()], xp: xpByDate[localDate(d)] || 0 })
  }
  return out
}

// ─── Hook: lädt live aus Firestore und liefert Schreib-Funktionen ─────────────
export function useProgress(uid) {
  const [progress, setProgress] = useState(DEFAULT)
  const [loading, setLoading] = useState(true)

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

  // XP für heute gutschreiben (atomar per increment, auch geräteübergreifend korrekt).
  const awardXp = async (amount) => {
    if (!uid || !db || !amount) return
    await setDoc(ref(), { xpByDate: { [localDate()]: increment(amount) } }, { merge: true })
  }

  // Lektion abschließen: als erledigt markieren UND XP gutschreiben.
  const completeLesson = async (id, xp = 0) => {
    if (!uid || !db) return
    await setDoc(
      ref(),
      { completedLessons: arrayUnion(id), xpByDate: { [localDate()]: increment(xp) } },
      { merge: true },
    )
  }

  // Einen Wort-Block als abgeschlossen markieren + XP gutschreiben.
  const completeWordBlock = async (blockId, xp = 0) => {
    if (!uid || !db) return
    await setDoc(
      ref(),
      { completedWordBlocks: arrayUnion(blockId), xpByDate: { [localDate()]: increment(xp) } },
      { merge: true },
    )
  }

  // Ein Grammatik-Thema als gelernt markieren + XP gutschreiben.
  const completeGrammar = async (grammarId, xp = 0) => {
    if (!uid || !db) return
    await setDoc(
      ref(),
      { completedGrammar: arrayUnion(grammarId), xpByDate: { [localDate()]: increment(xp) } },
      { merge: true },
    )
  }

  // Eine SRS-Karte bewerten → nächste Fälligkeit per SM-2 berechnen & speichern.
  const reviewCard = async (key, quality) => {
    if (!uid || !db) return
    const next = sm2((progress.srs || {})[key], quality)
    await setDoc(ref(), { srs: { [key]: next } }, { merge: true })
  }

  // Kompletter Reset auf 0 (überschreibt das Dokument).
  const reset = async () => {
    if (!uid || !db) return
    await setDoc(ref(), { completedLessons: [], completedWordBlocks: [], completedGrammar: [], xpByDate: {}, srs: {} })
  }

  return { progress, loading, awardXp, completeLesson, completeWordBlock, completeGrammar, reviewCard, reset }
}
