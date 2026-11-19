import { C } from '../../theme.js'
import { SRS_STAGE_BOUNDS } from '../../useProgress.js'

// SRS-Anzeige für den Nepali-Zweig. Bewusst dieselben Werte wie src/lib/srs.js
// (SRS_RATINGS, SRS_STAGES) – die Datei darf hier nicht importiert werden (sie zieht
// japanische Daten mit). Ändert sich dort etwas, hier nachziehen: beide Kurse sollen
// sich gleich bewerten und dieselben Stufen zeigen. Die Stufengrenzen selbst kommen
// aus SRS_STAGE_BOUNDS (useProgress.js), damit Anzeige und sm2 nicht auseinanderlaufen.

// Bewertungsknöpfe → SM-2-Qualität
export const SRS_RATINGS = [
  ['Nochmal', C.shu, 1],
  ['Schwer', '#E8A020', 3],
  ['Gut', C.matcha, 4],
  ['Leicht', C.indigo, 5],
]

// Kenntnisstufen nach SRS-Intervall (Tage).
export const SRS_STAGES = [
  { label: 'Neu', color: '#B3AA92', test: e => (e.interval || 0) < SRS_STAGE_BOUNDS[0] },
  { label: 'Lernphase', color: '#DA4A38', test: e => e.interval >= SRS_STAGE_BOUNDS[0] && e.interval < SRS_STAGE_BOUNDS[1] },
  { label: 'Vertraut', color: '#E8A020', test: e => e.interval >= SRS_STAGE_BOUNDS[1] && e.interval < SRS_STAGE_BOUNDS[2] },
  { label: 'Gefestigt', color: '#5E8A6A', test: e => e.interval >= SRS_STAGE_BOUNDS[2] && e.interval < SRS_STAGE_BOUNDS[3] },
  { label: 'Gemeistert', color: '#1E4368', test: e => e.interval >= SRS_STAGE_BOUNDS[3] },
]

// Rand/Hintergrund einer Antwortoption: 'correct' | 'wrong' | 'neutral' (wie im Japanischen).
export function feedbackColor(state) {
  const color = state === 'correct' ? C.matcha : state === 'wrong' ? C.shu : C.washiDark
  return { border: color, bg: state === 'neutral' ? '#fff' : `${color}20` }
}
