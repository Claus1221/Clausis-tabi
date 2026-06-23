import { C } from '../theme.js'
import { KANA_DATA } from '../data/kana.js'
import { WORD_BY_KANJI } from '../data/words.js'
import { CHAPTER_WORD } from '../data/chapters.js'
import { SRS_STAGE_BOUNDS } from '../useProgress.js'

// Anzeige-Infos für eine SRS-Karte (Kana oder Wort-Kanji).
export function srsItemInfo(key) {
  const w = WORD_BY_KANJI[key]
  if (w) return { reading: w.kana, sub: `${w.romaji} · ${w.de}`, isWord: true }
  const cw = CHAPTER_WORD[key]   // Kapitel-Vokabel (nicht im Wort-Lexikon)
  if (cw) return { reading: cw.reading, sub: cw.de, isWord: true }
  const d = KANA_DATA[key]
  return { reading: d?.romaji, sub: d?.tip, isWord: false }
}

// Bewertungsknöpfe → SM-2-Qualität
export const SRS_RATINGS = [
  ['Nochmal', C.shu, 1],
  ['Schwer', '#E8A020', 3],
  ['Gut', C.matcha, 4],
  ['Leicht', C.indigo, 5],
]

// Mischt ein Array (neue Kopie).
export function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Antwortmöglichkeiten pro Multiple-Choice-Runde. Mehr Optionen = weniger
// Treffer per Ausschlussprinzip (Raten durch Wegstreichen der offensichtlich
// Falschen).
export const OPTIONS_PER_ROUND = 6

// Baut Multiple-Choice-Runden über die gelernten Kana. Die Zahl der Ablenker
// passt sich an, falls noch nicht genug Zeichen gelernt sind.
export function buildRounds(learnedKana, optionCount = OPTIONS_PER_ROUND) {
  const pool = [...new Set(learnedKana)]
  const nDistract = Math.min(optionCount - 1, pool.length - 1)
  return shuffled(pool).map(ch => {
    const distractors = shuffled(pool.filter(k => k !== ch)).slice(0, nDistract)
    const options = shuffled([ch, ...distractors])
    return { char: ch, options }
  })
}

// Vokabel-Kenntnisstufen nach SRS-Intervall (Tage). Grenzen aus SRS_STAGE_BOUNDS,
// damit Anzeige und Rückstufungs-Logik (sm2) nicht auseinanderlaufen.
export const SRS_STAGES = [
  { label: 'Neu', color: '#B3AA92', test: e => (e.interval || 0) < SRS_STAGE_BOUNDS[0] },
  { label: 'Lernphase', color: '#DA4A38', test: e => e.interval >= SRS_STAGE_BOUNDS[0] && e.interval < SRS_STAGE_BOUNDS[1] },
  { label: 'Vertraut', color: '#E8A020', test: e => e.interval >= SRS_STAGE_BOUNDS[1] && e.interval < SRS_STAGE_BOUNDS[2] },
  { label: 'Gefestigt', color: '#5E8A6A', test: e => e.interval >= SRS_STAGE_BOUNDS[2] && e.interval < SRS_STAGE_BOUNDS[3] },
  { label: 'Gemeistert', color: '#1E4368', test: e => e.interval >= SRS_STAGE_BOUNDS[3] },
]

// Kenntnisstufe (0 = Neu … 4 = Gemeistert) einer SRS-Karte – aus denselben Tests
// wie SRS_STAGES, damit Anzeige und Sterne-Berechnung nicht auseinanderlaufen.
export function srsStageIndex(entry) {
  if (!entry) return 0
  for (let i = SRS_STAGES.length - 1; i >= 0; i--) if (SRS_STAGES[i].test(entry)) return i
  return 0
}
