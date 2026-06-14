import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from './firebase'

// Standard-Fortschritt für einen neuen Nutzer: alles bei 0.
const DEFAULT = {
  completedLessons: [], // IDs abgeschlossener Lektionen, z.B. ['l1','l2']
  xpByDate: {},         // { 'YYYY-MM-DD': XP }  → XP heute, Streak, Wochenchart
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

  // Kompletter Reset auf 0 (überschreibt das Dokument).
  const reset = async () => {
    if (!uid || !db) return
    await setDoc(ref(), { completedLessons: [], xpByDate: {} })
  }

  return { progress, loading, awardXp, completeLesson, reset }
}
