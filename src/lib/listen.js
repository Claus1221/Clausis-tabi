// ─── Spracheingabe (Web Speech API, ja-JP) ───────────────────────────────────
// Gegenstück zu speech.js (Ausgabe): der Nutzer SPRICHT seine Antwort in den
// Gesprächs-Szenen, statt sie anzutippen. Zielgerät ist Android/Chrome
// (webkitSpeechRecognition, braucht Internet); wo die API fehlt (z. B. Firefox),
// bleibt Antippen der einzige Weg – die UI blendet das Mikro dann aus.
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const SPEECH_INPUT_SUPPORTED = !!SR

let active = null
// Einmal zuhören (bis Sprechpause), Zwischenstände live melden. onFinal bekommt
// ALLE Erkennungs-Alternativen – der Abgleich prüft jede davon.
export function startListening({ onInterim, onFinal, onError, onEnd }) {
  if (!SR) { onError?.('unsupported'); return }
  stopListening()
  const rec = new SR()
  rec.lang = 'ja-JP'
  rec.interimResults = true
  rec.maxAlternatives = 5
  rec.continuous = false
  rec.onresult = (e) => {
    const res = e.results[e.results.length - 1]
    const alts = Array.from(res, a => a.transcript)
    if (res.isFinal) onFinal?.(alts)
    else onInterim?.(alts[0] || '')
  }
  rec.onerror = (e) => { if (e.error !== 'aborted') onError?.(e.error) }
  rec.onend = () => { if (active === rec) active = null; onEnd?.() }
  active = rec
  rec.start()
}

export function stopListening() {
  if (!active) return
  try { active.abort() } catch { /* schon beendet */ }
  active = null
}

// ─── Abgleich: Gesagtes ↔ Antwortoptionen ────────────────────────────────────
// Die Erkennung liefert Standard-Orthografie mit Kanji („ホテルまでお願いします"),
// die Dialoge stehen in Lern-Kana („ホテルまで おねがいします。"). Darum vor dem
// Vergleich: bekannte Kanji-Schreibweisen des Dialog-Wortschatzes → Kana
// (längste zuerst, damit 片道 vor 道 gewinnt), Satzzeichen/Leerraum weg,
// Katakana → Hiragana. Der Rest läuft über Bigramm-Ähnlichkeit, damit auch
// leicht abweichende Erkennungen (fehlende Partikel, andere Schreibung
// unbekannter Wörter) noch zugeordnet werden.
const KANJI_KANA = {
  'お願いします': 'おねがいします', 'お願い': 'おねがい',
  'お会計': 'おかいけい', '会計': 'かいけい',
  '分かりました': 'わかりました', '分かりません': 'わかりません', '分かり': 'わかり',
  'お休みなさい': 'おやすみなさい', 'お休み': 'おやすみ',
  '美味しい': 'おいしい', '大丈夫': 'だいじょうぶ',
  '食べません': 'たべません', '食べます': 'たべます',
  '助かります': 'たすかります', '助けて': 'たすけて',
  '行きましょう': 'いきましょう', '迷いました': 'まよいました',
  '着きました': 'つきました', '下さい': 'ください',
  '高い': 'たかい', '安い': 'やすい', '結構': 'けっこう', '以上': 'いじょう',
  '東京': 'とうきょう', '片道': 'かたみち', '往復': 'おうふく',
  '二千円': 'にせんえん', '千円': 'せんえん', '幾ら': 'いくら',
  '駅': 'えき', '道': 'みち', '水': 'みず', '右': 'みぎ', '左': 'ひだり',
}
const KANJI_KEYS = Object.keys(KANJI_KANA).sort((a, b) => b.length - a.length)

export function normalizeJa(s) {
  let t = s || ''
  for (const k of KANJI_KEYS) t = t.split(k).join(KANJI_KANA[k])
  t = t.replace(/[\s　。、．，！？!?・…「」『』〜~]/g, '')
  // Katakana → Hiragana (ー bleibt), damit beide Seiten gleich verglichen werden.
  return t.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

// Bigramm-Dice-Ähnlichkeit (0–1). Für kurze japanische Sätze robust genug und
// ohne Wörterbuch: geteilte Zeichenpaare zählen, egal wo sie stehen.
function similarity(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const counts = new Map()
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2)
    counts.set(g, (counts.get(g) || 0) + 1)
  }
  let hits = 0
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2)
    const n = counts.get(g) || 0
    if (n > 0) { hits++; counts.set(g, n - 1) }
  }
  return (2 * hits) / (a.length + b.length - 2)
}

// Welche Antwortoption hat der Nutzer gesagt? Prüft alle Erkennungs-Alternativen
// gegen alle Optionen. option = null heißt: nichts sicher zuordenbar – dann soll
// die UI zum Nochmal-Sprechen oder Antippen auffordern, statt zu raten.
// Schwellen: klar ähnlich (≥ 0.55) UND deutlich vor der zweitbesten Option –
// sonst würde bei kurzen Antworten („みぎです" vs „たかいです") das gemeinsame
// です-Ende falsche Treffer produzieren.
export function matchSpoken(transcripts, options) {
  const heard = (transcripts[0] || '').trim()
  const scored = options
    .map(option => {
      const n = normalizeJa(option)
      const score = Math.max(0, ...transcripts.map(t => similarity(normalizeJa(t), n)))
      return { option, score }
    })
    .sort((a, b) => b.score - a.score)
  const [top, second] = scored
  const ambiguous = second && top.score - second.score < 0.15 && top.score < 0.999
  if (!top || top.score < 0.55 || ambiguous) return { option: null, heard }
  return { option: top.option, heard }
}
