import { shuffled } from './srs.js'

// Verschränkt mehrere Übungsformen in einer Session (Interleaving fördert das
// Lernen mehr als „Blocken" einer Form). Pro Aufgabe wechselt zufällig das
// Format aus dem, was du schon gelernt hast.
export const MIX_LABEL = {
  erkennen: '👁 Erkennen', hoeren: '👂 Hören', tippen: '⌨️ Tippen',
  karte: '🗂 Karteikarte', satzbau: '🧩 Satzbau',
}

export function buildMixTasks({ kana, learnedAll, sentencePool, settings }) {
  const types = []
  if (kana.length >= 2) types.push('erkennen', 'hoeren')
  if (kana.length >= 1) types.push('tippen')
  if (learnedAll.length >= 1) types.push('karte')
  if (sentencePool.length >= 1) types.push('satzbau')
  if (!types.length) return []

  const rand = arr => arr[Math.floor(Math.random() * arr.length)]
  const mkOptions = (ch) => {
    const n = Math.min(settings.options - 1, kana.length - 1)
    return shuffled([ch, ...shuffled(kana.filter(k => k !== ch)).slice(0, n)])
  }
  const out = []
  for (let i = 0; i < settings.roundSize; i++) {
    const type = rand(types)
    if (type === 'erkennen' || type === 'hoeren') {
      const ch = rand(kana); out.push({ type, char: ch, options: mkOptions(ch) })
    } else if (type === 'tippen') {
      out.push({ type, char: rand(kana) })
    } else if (type === 'karte') {
      out.push({ type, item: rand(learnedAll) })
    } else {
      const e = rand(sentencePool)
      const ans = e.tokens.map(t => t.t).filter(t => t !== '。' && t !== '！')
      out.push({ type, step: { prompt: `Bilde: „${e.de}"`, tiles: ans, answer: ans, tr: e.de } })
    }
  }
  return out
}
