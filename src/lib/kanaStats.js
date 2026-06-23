import { LESSONS } from '../data/kana.js'

export function totalKanaCount() {
  return new Set(LESSONS.flatMap(l => l.kana)).size
}
export function completedKanaList(completedLessons) {
  const set = new Set()
  LESSONS.filter(l => completedLessons.includes(l.id)).forEach(l => l.kana.forEach(k => set.add(k)))
  return [...set]
}
export function completedKanaCount(completedLessons) {
  return completedKanaList(completedLessons).length
}
