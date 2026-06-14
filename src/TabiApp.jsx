import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { useAuth } from './AuthGate.jsx'
import { useProgress, computeStats, weeklyXp, dueKana } from './useProgress.js'
import { KANA_STROKES, STROKE_VIEWBOX } from './kanaStrokes.js'

// Fortschritt (aus Firestore) für alle Screens verfügbar machen.
const ProgressCtx = createContext({
  progress: { completedLessons: [], completedWordBlocks: [], xpByDate: {}, srs: {} },
  awardXp: async () => {},
  completeLesson: async () => {},
  completeWordBlock: async () => {},
  reviewCard: async () => {},
  reset: async () => {},
})

// XP-Belohnungen
const XP_PER_KANA = 10  // pro Zeichen in einer abgeschlossenen Lektion
const XP_PER_CARD = 5   // pro wiederholter SRS-Karte / richtiger Übungsantwort
const XP_PER_WORD = 15  // pro gelerntem Wort

// Kana-Statistiken (als Funktionen, da LESSONS weiter unten definiert ist).
function totalKanaCount() {
  return new Set(LESSONS.flatMap(l => l.kana)).size
}
function completedKanaList(completedLessons) {
  const set = new Set()
  LESSONS.filter(l => completedLessons.includes(l.id)).forEach(l => l.kana.forEach(k => set.add(k)))
  return [...set]
}
function completedKanaCount(completedLessons) {
  return completedKanaList(completedLessons).length
}

// ─── Color tokens ───────────────────────────────────────────────────────────
const C = {
  sumi: '#211F1B',
  indigo: '#1E4368',
  shu: '#DA4A38',
  washi: '#EFEBE0',
  matcha: '#5E8A6A',
  washiDark: '#E0DAC8',
  indigoLight: '#2A5A8C',
  textMuted: '#6B6660',
}

// ─── Kana-Daten: echte Strichpfade (KanjiVG, CC BY-SA) + Merkhilfen ───────────
const TIPS = {
  あ: 'Wie ein Mensch, der winkt', い: 'Zwei parallele Linien', う: 'Ein Haken mit Dach',
  え: 'Kreuz mit Schwung', お: 'Wie え aber voller', か: 'Vertikale mit Kreuz',
  き: 'Zwei Querstriche mit Stiel', く: 'Ein Winkel nach links', け: 'Vertikale mit rechtem Arm',
  こ: 'Zwei Querstriche', さ: 'Querstrich und Schleife', し: 'Ein Haken nach rechts',
  す: 'Dach mit Haken', せ: 'Wie け gespiegelt', そ: 'Querstrich mit Schwung',
}

// char → { romaji, strokes, tip }  (strokes aus kanaStrokes.js, 109×109-Raster)
const KANA_DATA = Object.fromEntries(
  Object.entries(KANA_STROKES).map(([ch, v]) => [ch, { ...v, tip: TIPS[ch] }]),
)

// Lektionen = Gojūon-Zeilen, erst Hiragana, dann Katakana.
const HIRA_ROWS = [
  ['あ','い','う','え','お'], ['か','き','く','け','こ'], ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'], ['な','に','ぬ','ね','の'], ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'], ['や','ゆ','よ'], ['ら','り','る','れ','ろ'], ['わ','を','ん'],
]
const KATA_ROWS = [
  ['ア','イ','ウ','エ','オ'], ['カ','キ','ク','ケ','コ'], ['サ','シ','ス','セ','ソ'],
  ['タ','チ','ツ','テ','ト'], ['ナ','ニ','ヌ','ネ','ノ'], ['ハ','ヒ','フ','ヘ','ホ'],
  ['マ','ミ','ム','メ','モ'], ['ヤ','ユ','ヨ'], ['ラ','リ','ル','レ','ロ'], ['ワ','ヲ','ン'],
]
const LESSONS = [
  ...HIRA_ROWS.map((kana, i) => ({ id: `h${i + 1}`, title: kana.join(''), kana, script: 'Hiragana' })),
  ...KATA_ROWS.map((kana, i) => ({ id: `k${i + 1}`, title: kana.join(''), kana, script: 'Katakana' })),
]

const PHRASES = [
  { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', de: 'Vielen Dank' },
  { jp: 'すみません', romaji: 'sumimasen', de: 'Entschuldigung / Excuse me' },
  { jp: 'これをください', romaji: 'kore wo kudasai', de: 'Das hier, bitte' },
  { jp: 'いくらですか？', romaji: 'ikura desu ka?', de: 'Wie viel kostet das?' },
  { jp: 'どこですか？', romaji: 'doko desu ka?', de: 'Wo ist …?' },
  { jp: 'わかりません', romaji: 'wakarimasen', de: 'Ich verstehe nicht' },
  { jp: 'えいごはなせますか？', romaji: 'eigo hanasemasu ka?', de: 'Sprechen Sie Englisch?' },
  { jp: 'おねがいします', romaji: 'onegaishimasu', de: 'Bitte (höflich)' },
]

const VOCAB = [
  { jp: '駅', romaji: 'eki', de: 'Bahnhof', type: 'kanji' },
  { jp: '出口', romaji: 'deguchi', de: 'Ausgang', type: 'kanji' },
  { jp: '入口', romaji: 'iriguchi', de: 'Eingang', type: 'kanji' },
  { jp: '円', romaji: 'en', de: 'Yen', type: 'kanji' },
  { jp: 'お手洗い', romaji: 'otearai', de: 'Toilette', type: 'kanji' },
  { jp: '男', romaji: 'otoko', de: 'Mann / Herren', type: 'kanji' },
  { jp: '女', romaji: 'onna', de: 'Frau / Damen', type: 'kanji' },
  { jp: '水', romaji: 'mizu', de: 'Wasser', type: 'kanji' },
]

// Wörter-Blöcke: je 5 thematisch gruppierte Wörter mit Kanji, Hiragana,
// Übersetzung und Beispielsatz (mit Lesung, Übersetzung, Erklärung).
// Blöcke schalten der Reihe nach frei. Jedes Wort wird im SRS über sein Kanji abgefragt.
const WORD_BLOCKS = [
  {
    id: 'wb1', theme: '🏔️', title: 'Natur', words: [
      { kanji: '山', kana: 'やま', romaji: 'yama', de: 'Berg', ex: { jp: '山が高い。', kana: 'やまがたかい。', de: 'Der Berg ist hoch.', note: '„が" markiert das Subjekt · „高い (たかい)" = hoch' } },
      { kanji: '川', kana: 'かわ', romaji: 'kawa', de: 'Fluss', ex: { jp: '川を見る。', kana: 'かわをみる。', de: 'Ich sehe den Fluss.', note: '„を" markiert das Objekt · „見る (みる)" = sehen' } },
      { kanji: '空', kana: 'そら', romaji: 'sora', de: 'Himmel', ex: { jp: '空が青い。', kana: 'そらがあおい。', de: 'Der Himmel ist blau.', note: '„青い (あおい)" = blau' } },
      { kanji: '星', kana: 'ほし', romaji: 'hoshi', de: 'Stern', ex: { jp: '星がきれいだ。', kana: 'ほしがきれいだ。', de: 'Die Sterne sind schön.', note: '„きれい" = schön · „だ" = ist (einfache Form)' } },
      { kanji: '月', kana: 'つき', romaji: 'tsuki', de: 'Mond', ex: { jp: '月が出た。', kana: 'つきがでた。', de: 'Der Mond ist aufgegangen.', note: '„出た (でた)" = ging auf (Vergangenheit von 出る)' } },
    ],
  },
  {
    id: 'wb2', theme: '🐾', title: 'Tiere', words: [
      { kanji: '猫', kana: 'ねこ', romaji: 'neko', de: 'Katze', ex: { jp: '猫が好きだ。', kana: 'ねこがすきだ。', de: 'Ich mag Katzen.', note: '„好き (すき)" = mögen · „だ" = ist' } },
      { kanji: '犬', kana: 'いぬ', romaji: 'inu', de: 'Hund', ex: { jp: '犬が走る。', kana: 'いぬがはしる。', de: 'Der Hund rennt.', note: '„走る (はしる)" = rennen' } },
      { kanji: '鳥', kana: 'とり', romaji: 'tori', de: 'Vogel', ex: { jp: '鳥が鳴く。', kana: 'とりがなく。', de: 'Der Vogel zwitschert.', note: '„鳴く (なく)" = (Tier) Laut geben' } },
      { kanji: '魚', kana: 'さかな', romaji: 'sakana', de: 'Fisch', ex: { jp: '魚を食べる。', kana: 'さかなをたべる。', de: 'Ich esse Fisch.', note: '„食べる (たべる)" = essen' } },
      { kanji: '馬', kana: 'うま', romaji: 'uma', de: 'Pferd', ex: { jp: '馬が大きい。', kana: 'うまがおおきい。', de: 'Das Pferd ist groß.', note: '„大きい (おおきい)" = groß' } },
    ],
  },
  {
    id: 'wb3', theme: '👤', title: 'Körper', words: [
      { kanji: '目', kana: 'め', romaji: 'me', de: 'Auge', ex: { jp: '目が痛い。', kana: 'めがいたい。', de: 'Meine Augen tun weh.', note: '„痛い (いたい)" = schmerzen / weh tun' } },
      { kanji: '口', kana: 'くち', romaji: 'kuchi', de: 'Mund', ex: { jp: '口を開ける。', kana: 'くちをあける。', de: 'Ich öffne den Mund.', note: '„開ける (あける)" = öffnen' } },
      { kanji: '耳', kana: 'みみ', romaji: 'mimi', de: 'Ohr', ex: { jp: '耳が大きい。', kana: 'みみがおおきい。', de: 'Die Ohren sind groß.', note: '„大きい (おおきい)" = groß' } },
      { kanji: '手', kana: 'て', romaji: 'te', de: 'Hand', ex: { jp: '手を洗う。', kana: 'てをあらう。', de: 'Ich wasche die Hände.', note: '„洗う (あらう)" = waschen' } },
      { kanji: '足', kana: 'あし', romaji: 'ashi', de: 'Fuß / Bein', ex: { jp: '足が速い。', kana: 'あしがはやい。', de: 'Er ist schnell.', note: 'wörtl. „die Füße sind schnell" · „速い (はやい)" = schnell' } },
    ],
  },
  {
    id: 'wb4', theme: '🏠', title: 'Alltag', words: [
      { kanji: '人', kana: 'ひと', romaji: 'hito', de: 'Mensch', ex: { jp: '人が多い。', kana: 'ひとがおおい。', de: 'Es sind viele Menschen da.', note: '„多い (おおい)" = viel / zahlreich' } },
      { kanji: '家', kana: 'いえ', romaji: 'ie', de: 'Haus', ex: { jp: '家に帰る。', kana: 'いえにかえる。', de: 'Ich gehe nach Hause.', note: '„に" = Richtung · „帰る (かえる)" = zurückkehren' } },
      { kanji: '水', kana: 'みず', romaji: 'mizu', de: 'Wasser', ex: { jp: '水を飲む。', kana: 'みずをのむ。', de: 'Ich trinke Wasser.', note: '„飲む (のむ)" = trinken' } },
      { kanji: '車', kana: 'くるま', romaji: 'kuruma', de: 'Auto', ex: { jp: '車で行く。', kana: 'くるまでいく。', de: 'Ich fahre mit dem Auto.', note: '„で" = Mittel (mit) · „行く (いく)" = gehen / fahren' } },
      { kanji: '店', kana: 'みせ', romaji: 'mise', de: 'Laden', ex: { jp: '店が開く。', kana: 'みせがあく。', de: 'Der Laden öffnet.', note: '„開く (あく)" = sich öffnen' } },
    ],
  },
]
const ALL_WORDS = WORD_BLOCKS.flatMap(b => b.words)
const WORD_BY_KANJI = Object.fromEntries(ALL_WORDS.map(w => [w.kanji, w]))

// Kanji aller Wörter aus abgeschlossenen Blöcken (= fällige Wort-Karten fürs SRS).
function learnedWordKanji(completedBlocks) {
  return WORD_BLOCKS.filter(b => completedBlocks.includes(b.id)).flatMap(b => b.words.map(w => w.kanji))
}

// Japanisch vorlesen (Web Speech API).
function speak(text) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }
}

// Anzeige-Infos für eine SRS-Karte (Kana oder Wort-Kanji).
function srsItemInfo(key) {
  const w = WORD_BY_KANJI[key]
  if (w) return { reading: w.kana, sub: `${w.romaji} · ${w.de}`, isWord: true }
  const d = KANA_DATA[key]
  return { reading: d?.romaji, sub: d?.tip, isWord: false }
}

// ─── Tiny components ─────────────────────────────────────────────────────────

function TabBar({ active, setActive }) {
  const tabs = [
    { id: 'heute', label: '今日', sub: 'Heute' },
    { id: 'lernen', label: '学ぶ', sub: 'Lernen' },
    { id: 'ueben', label: '練習', sub: 'Üben' },
    { id: 'fortschritt', label: '進歩', sub: 'Fortschritt' },
  ]
  return (
    <nav style={{
      display: 'flex', borderTop: `2px solid ${C.washiDark}`,
      background: C.washi, position: 'fixed', bottom: 0, left: 0, right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50, boxShadow: '0 -2px 8px rgba(33,31,27,0.08)',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          flex: 1, padding: '10px 0 8px', border: 'none', background: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: active === t.id ? C.shu : C.textMuted,
          borderTop: active === t.id ? `2px solid ${C.shu}` : '2px solid transparent',
          marginTop: -2,
        }}>
          <span style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif" }}>{t.label}</span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.sub}</span>
        </button>
      ))}
    </nav>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px',
      boxShadow: '0 1px 4px rgba(33,31,27,0.08)', ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.shu : variant === 'secondary' ? C.indigo : C.washiDark
  const color = variant === 'ghost' ? C.sumi : '#fff'
  return (
    <button onClick={onClick} style={{
      background: bg, color, border: 'none', borderRadius: 8,
      padding: '12px 24px', fontSize: 15, fontWeight: 600,
      fontFamily: 'inherit', cursor: 'pointer', ...style,
    }}>{children}</button>
  )
}

// ─── Stroke animation (echte KanjiVG-Pfade, 109×109) ─────────────────────────

const STROKE_COLORS = ['#DA4A38', '#1E4368', '#5E8A6A', '#8B6914', '#7B3FA0', '#1A7A6E', '#B5651D']

function strokeStart(d) {
  const m = d.match(/^M\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)/)
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null
}

function StrokeDisplay({ char }) {
  const data = KANA_DATA[char]
  const strokes = data?.strokes || []
  const len = strokes.length
  const V = STROKE_VIEWBOX

  const [drawn, setDrawn] = useState(0)       // vollständig gezeichnete Striche
  const [animating, setAnimating] = useState(true)

  // Bei neuem Zeichen automatisch von vorn animieren.
  useEffect(() => { setDrawn(0); setAnimating(true) }, [char])

  const activeIdx = animating && drawn < len ? drawn : -1   // dieser Strich wird gerade gezeichnet
  const showCount = animating ? Math.min(drawn + 1, len) : drawn

  return (
    <div style={{ textAlign: 'center' }}>
      <style>{`@keyframes tabiDraw { to { stroke-dashoffset: 0; } }`}</style>
      <svg width="180" height="180" viewBox={`0 0 ${V} ${V}`} style={{
        background: '#fafaf8', borderRadius: 8, border: `1px solid ${C.washiDark}`,
      }}>
        {/* Raster */}
        <line x1={V / 2} y1="0" x2={V / 2} y2={V} stroke={C.washiDark} strokeWidth="0.6" strokeDasharray="3,3" />
        <line x1="0" y1={V / 2} x2={V} y2={V / 2} stroke={C.washiDark} strokeWidth="0.6" strokeDasharray="3,3" />
        {/* Geist-Zeichen */}
        <text x={V / 2} y={V * 0.8} textAnchor="middle" fontSize={V * 0.85}
          fontFamily="'Noto Serif JP', serif" fill="#EFEBE0" style={{ userSelect: 'none' }}>{char}</text>

        {/* Striche bis showCount */}
        {strokes.slice(0, showCount).map((d, i) => {
          const isActive = i === activeIdx
          return (
            <path
              key={`${char}-${i}-${isActive ? 'a' : 's'}`}
              d={d} stroke={STROKE_COLORS[i % STROKE_COLORS.length]}
              strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"
              pathLength="1"
              style={isActive ? {
                strokeDasharray: 1, strokeDashoffset: 1,
                animation: 'tabiDraw 0.75s linear forwards',
              } : undefined}
              onAnimationEnd={isActive ? () => setDrawn(d2 => d2 + 1) : undefined}
            />
          )
        })}

        {/* Start-Nummern */}
        {strokes.slice(0, showCount).map((d, i) => {
          const p = strokeStart(d)
          if (!p) return null
          const col = STROKE_COLORS[i % STROKE_COLORS.length]
          return (
            <g key={`n-${i}`}>
              <circle cx={p.x} cy={p.y} r="7" fill="#fff" stroke={col} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 3.2} textAnchor="middle" fontSize="9" fontWeight="700" fill={col}>{i + 1}</text>
            </g>
          )
        })}
      </svg>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {strokes.map((_, i) => (
          <button key={i} onClick={() => { setAnimating(false); setDrawn(i + 1) }}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: showCount > i ? STROKE_COLORS[i % STROKE_COLORS.length] : C.washiDark,
              color: showCount > i ? '#fff' : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{i + 1}</button>
        ))}
        <button onClick={() => { setDrawn(0); setAnimating(true) }}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.indigo, color: '#fff', fontSize: 12, cursor: 'pointer',
          }}>▶ Abspielen</button>
        <button onClick={() => { setAnimating(false); setDrawn(0) }}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.washiDark, color: C.sumi, fontSize: 12, cursor: 'pointer',
          }}>↺</button>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
        Strich {showCount} von {len} · Oben → Unten, Links → Rechts
      </p>
    </div>
  )
}

// ─── Drawing canvas ───────────────────────────────────────────────────────────

function DrawCanvas({ char }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPos = useRef(null)

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
  }

  const move = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = C.sumi
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const end = () => { drawing.current = false }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const size = 160

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Ghost character */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.7, fontFamily: "'Noto Serif JP', serif",
          color: C.washiDark, pointerEvents: 'none', userSelect: 'none',
          lineHeight: 1,
        }}>{char}</div>
        {/* Grid lines */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <line x1={size/2} y1="0" x2={size/2} y2={size} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
          <line x1="0" y1={size/2} x2={size} y2={size/2} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
        </svg>
        <canvas ref={canvasRef} width={size} height={size}
          style={{
            border: `2px solid ${C.washiDark}`, borderRadius: 8,
            background: 'rgba(255,255,255,0.85)', display: 'block', touchAction: 'none',
          }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={clear} style={{
          background: C.washiDark, border: 'none', borderRadius: 8,
          padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: C.sumi,
        }}>Löschen ↺</button>
      </div>
    </div>
  )
}

// ─── Lesson player ────────────────────────────────────────────────────────────

function QuizStep({ kana, onFinish }) {
  // Quiz einmalig aufbauen: jedes Kana einmal, gemischt, mit stabilen Optionen.
  const [quiz] = useState(() => {
    const pool = [...new Set(kana)]
    const allRomaji = [...new Set(Object.values(KANA_DATA).map(v => v.romaji))]
    return [...pool].sort(() => Math.random() - 0.5).map(ch => {
      const correct = KANA_DATA[ch]?.romaji
      let distractors = [...new Set(pool.filter(k => k !== ch).map(k => KANA_DATA[k]?.romaji))]
        .filter(r => r && r !== correct)
      for (const r of allRomaji.sort(() => Math.random() - 0.5)) {
        if (distractors.length >= 2) break
        if (r !== correct && !distractors.includes(r)) distractors.push(r)
      }
      distractors = distractors.sort(() => Math.random() - 0.5).slice(0, 2)
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5)
      return { char: ch, correct, options }
    })
  })

  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLastQ = qi === quiz.length - 1
  const revealed = answer !== null

  const next = () => {
    if (isLastQ) { onFinish(); return }
    setQi(qi + 1)
    setAnswer(null)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>
        Kurzer Check · {qi + 1} / {quiz.length}
      </p>
      <div style={{ fontSize: 72, fontFamily: "'Noto Serif JP', serif", marginBottom: 20, color: C.sumi }}>
        {cur.char}
      </div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Welche Lesung ist richtig?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: 18, fontWeight: 600, color: C.sumi,
                cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig wäre: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLastQ ? 'Quiz abschließen →' : 'Nächstes Zeichen →'}
          </Btn>
        </>
      )}
    </div>
  )
}

function LessonPlayer({ lesson, onComplete, onClose }) {
  const kana = lesson.kana
  const totalSteps = kana.length * 3 + 2 // intro + (explain+stroke+draw) * n + quiz + done
  const [step, setStep] = useState(0)

  const progress = Math.round((step / totalSteps) * 100)
  const isQuiz = step === totalSteps - 2

  // Determine what to show
  let content = null

  if (step === 0) {
    // Intro
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗾</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 8 }}>
          {lesson.title}
        </h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In dieser Lektion lernst du {kana.length} {lesson.script || 'Hiragana'}-Zeichen.
          Jedes Zeichen wird erklärt, du siehst die Strichreihenfolge
          und übst es selbst zu schreiben.
        </p>
        <div style={{ background: `${C.indigo}15`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: C.indigo }}>
            💡 <strong>Lerntipp:</strong> Strichreihenfolge ist wichtig –
            sie macht das Schreiben schneller und natürlicher.
          </p>
        </div>
      </div>
    )
  } else if (step === totalSteps - 1) {
    // Done
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.matcha, marginBottom: 8 }}>
          よくできました！
        </h2>
        <p style={{ color: C.textMuted, marginBottom: 4 }}>Sehr gut gemacht!</p>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{kana.length} Zeichen</strong> gelernt und geübt.
          Diese kommen in deinen Wiederholungen wieder.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kana.map(k => (
            <span key={k} style={{
              fontSize: 28, fontFamily: "'Noto Serif JP', serif",
              background: `${C.matcha}20`, borderRadius: 8, padding: '4px 12px',
            }}>{k}</span>
          ))}
        </div>
      </div>
    )
  } else {
    // Determine which kana and which phase
    const innerStep = step - 1
    const kanaIdx = Math.floor(innerStep / 3)
    const phase = innerStep % 3

    // Quiz step comes before done
    if (step === totalSteps - 2) {
      content = <QuizStep kana={kana} onFinish={() => setStep(s => s + 1)} />
    } else {
      const char = kana[kanaIdx]
      const data = KANA_DATA[char]

      if (phase === 0) {
        // Explain
        content = (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 88, fontFamily: "'Noto Serif JP', serif",
              color: C.sumi, lineHeight: 1, marginBottom: 12 }}>{char}</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Lesung</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.indigo }}>{data?.romaji}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Aussprache</div>
                <div style={{ fontSize: 14, color: C.sumi }}>wie „{data?.romaji}" im Deutschen</div>
              </div>
            </div>
            <button onClick={() => {
              if ('speechSynthesis' in window) {
                const u = new SpeechSynthesisUtterance(char)
                u.lang = 'ja-JP'
                speechSynthesis.speak(u)
              }
            }} style={{
              background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
              color: C.indigo, marginBottom: 16,
            }}>🔊 Aussprechen</button>
            {data?.tip && (
              <div style={{ background: `${C.shu}10`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 13, color: C.shu }}>💡 Merkhilfe: {data.tip}</p>
              </div>
            )}
          </div>
        )
      } else if (phase === 1) {
        // Stroke order
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Strichreihenfolge für <strong style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20 }}>{char}</strong>
            </p>
            <StrokeDisplay char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 10 }}>
              Strichpfade: KanjiVG (CC BY-SA)
            </p>
          </div>
        )
      } else {
        // Draw
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Schreibe <strong style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20 }}>{char}</strong> nach
            </p>
            <DrawCanvas char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 8 }}>
              Mit dem Finger oder Stift nachzeichnen
            </p>
          </div>
        )
      }
    }
  }

  const isLast = step === totalSteps - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.washi,
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
          }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: C.shu,
                borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>
          {lesson.title}
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {content}
      </div>

      {/* Footer – beim Quiz ausgeblendet, da QuizStep eigene Knöpfe hat */}
      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isLast ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>
              Lektion abschließen ✓
            </Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {step === 0 ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SRS Quiz ────────────────────────────────────────────────────────────────

// Bewertungsknöpfe → SM-2-Qualität
const SRS_RATINGS = [
  ['Nochmal', C.shu, 1],
  ['Schwer', '#E8A020', 3],
  ['Gut', C.matcha, 4],
  ['Leicht', C.indigo, 5],
]

function SRSQuiz({ onClose }) {
  const { progress, awardXp, reviewCard } = useContext(ProgressCtx)
  // Fällige Karten = heute fällige gelernte Kana UND gelernte Wörter.
  const [deck] = useState(() => {
    const learned = [
      ...completedKanaList(progress.completedLessons || []),
      ...learnedWordKanji(progress.completedWordBlocks || []),
    ]
    return dueKana(progress, learned)
  })
  const [queue, setQueue] = useState(deck)   // Arbeits-Warteschlange (kann wachsen)
  const [flipped, setFlipped] = useState(false)
  const [passed, setPassed] = useState(0)    // endgültig gekonnte Karten
  const [lapses, setLapses] = useState(0)    // wie oft „Nochmal"
  const [repeats, setRepeats] = useState(() => new Set()) // welche Karten schon mal daneben

  // Nichts fällig (oder noch nichts gelernt)
  if (deck.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Nichts fällig</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          Aktuell sind keine Wiederholungen fällig. Lerne neue Kana oder Wörter
          oder komm später wieder – fällige Karten erscheinen automatisch.
        </p>
        <Btn onClick={onClose}>Zurück</Btn>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Alle fälligen Karten gemeistert!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {passed} Karten · +{passed * XP_PER_CARD} XP
          {lapses > 0 && ` · ${lapses}× wiederholt`}
        </p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const item = queue[0]
  const info = srsItemInfo(item)
  const isRepeat = repeats.has(item)

  const rate = (quality) => {
    if (quality < 3) {
      // „Nochmal": Karte ans Ende der Warteschlange – kommt in dieser Sitzung wieder.
      setRepeats(prev => new Set(prev).add(item))
      setQueue(prev => [...prev.slice(1), prev[0]])
      setLapses(l => l + 1)
    } else {
      // gekonnt: Plan speichern, XP, aus der Warteschlange nehmen.
      reviewCard(item, quality)
      awardXp(XP_PER_CARD)
      setPassed(p => p + 1)
      setQueue(prev => prev.slice(1))
    }
    setFlipped(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {passed} / {deck.length} gekonnt · noch {queue.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        {isRepeat && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <button onClick={() => speak(item)} title="Anhören"
          style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        <div style={{ fontSize: item.length > 1 ? 52 : 80, fontFamily: "'Noto Serif JP', serif", marginBottom: 12 }}>{item}</div>
        {flipped ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{info.reading}</div>
            {info.sub && <div style={{ fontSize: 13, color: C.textMuted }}>{info.sub}</div>}
          </>
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14 }}>Tippen zum Aufdecken</div>
        )}
      </Card>

      {!flipped ? (
        <Btn onClick={() => setFlipped(true)} style={{ width: '100%' }} variant="secondary">
          Aufdecken
        </Btn>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {SRS_RATINGS.map(([label, color, q]) => (
            <button key={label} onClick={() => rate(q)}
              style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${color}`,
                background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Erkennen & Hören (Übungen) ──────────────────────────────────────────────

// Mischt ein Array (neue Kopie).
function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Baut Multiple-Choice-Runden über die gelernten Kana.
function buildRounds(learnedKana) {
  const pool = [...new Set(learnedKana)]
  return shuffled(pool).map(ch => {
    const distractors = shuffled(pool.filter(k => k !== ch)).slice(0, 3)
    const options = shuffled([ch, ...distractors])
    return { char: ch, options }
  })
}

function PracticeQuiz({ mode, onClose }) {
  // mode: 'erkennen' (Zeichen → Lesung) | 'hoeren' (Audio → Zeichen)
  const { progress, awardXp } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => buildRounds(learned).slice(0, 12))
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  // Bei „Hören" automatisch vorlesen, sobald eine neue Runde erscheint.
  const cur = rounds[idx]
  useEffect(() => {
    if (mode === 'hoeren' && cur) speak(cur.char)
  }, [mode, idx]) // eslint-disable-line

  if (learned.length < 4) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Noch zu wenig gelernt</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          Lerne zuerst ein paar Kana im „Lernen"-Tab – dann kannst du sie hier üben.
        </p>
        <Btn onClick={onClose}>Zurück</Btn>
      </div>
    )
  }

  if (idx >= rounds.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Übung fertig!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {correctCount} / {rounds.length} richtig · +{correctCount * XP_PER_CARD} XP
        </p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const revealed = answer !== null
  const choose = (opt) => {
    if (revealed) return
    setAnswer(opt)
    if (opt === cur.char) { awardXp(XP_PER_CARD); setCorrectCount(c => c + 1) }
  }
  const next = () => { setAnswer(null); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {mode === 'erkennen' ? 'Erkennen' : 'Hören'} · {idx + 1} / {rounds.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Aufgabe */}
      <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        {mode === 'erkennen' ? (
          <>
            <div style={{ fontSize: 80, fontFamily: "'Noto Serif JP', serif", marginBottom: 4 }}>{cur.char}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welche Lesung?</div>
          </>
        ) : (
          <>
            <button onClick={() => speak(cur.char)}
              style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40,
                width: 80, height: 80, fontSize: 36, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
          </>
        )}
      </Card>

      {/* Optionen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(opt => {
          const isCorrect = opt === cur.char
          const isChosen = opt === answer
          // Erkennen: Optionen sind Lesungen; Hören: Optionen sind Zeichen.
          const label = mode === 'erkennen' ? KANA_DATA[opt]?.romaji : opt
          return (
            <button key={opt} onClick={() => choose(opt)} disabled={revealed}
              style={{
                padding: '16px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: mode === 'erkennen' ? 18 : 28,
                fontFamily: mode === 'erkennen' ? 'inherit' : "'Noto Serif JP', serif",
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{label}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ textAlign: 'center', marginTop: 12, color: answer === cur.char ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.char ? '✓ Richtig!' : `✗ Richtig: ${cur.char} (${KANA_DATA[cur.char]?.romaji})`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {idx === rounds.length - 1 ? 'Übung abschließen →' : 'Weiter →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function HeuteScreen() {
  const { progress } = useContext(ProgressCtx)
  const { streak, xpToday: xp, goal } = computeStats(progress)
  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const due = dueKana(progress, learnedAll).length
  const charOfDay = 'あ'
  const data = KANA_DATA[charOfDay]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>
          おはようございます 👋
        </h1>
        <p style={{ color: C.textMuted, fontSize: 13 }}>Guten Morgen! Bereit zum Lernen?</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Streak', value: `${streak} 🔥`, color: C.shu },
          { label: 'XP heute', value: `${xp}`, color: C.indigo },
          { label: 'Zu üben', value: `${due}`, color: C.matcha },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Goal ring */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="56" height="56">
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.washiDark} strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.shu} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22 * Math.min(xp / goal, 1)} ${2 * Math.PI * 22}`}
              strokeLinecap="round" transform="rotate(-90 28 28)" />
            <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.shu}>
              {Math.min(Math.round(xp / goal * 100), 100)}%
            </text>
          </svg>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Tagesziel</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{xp} / {goal} XP</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {xp >= goal ? 'Tagesziel erreicht 🎉' : `noch ${goal - xp} XP bis zum Ziel`}
            </div>
          </div>
        </div>
      </Card>

      {/* Zeichen des Tages */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
          ZEICHEN DES TAGES
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 70, height: 70, background: '#fafaf8',
            border: `1px solid ${C.washiDark}`, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52, fontFamily: "'Noto Serif JP', serif",
          }}>{charOfDay}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{data.romaji}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Hiragana</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>💡 {data.tip}</div>
          </div>
        </div>
      </Card>

      {/* Phrases preview */}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontWeight: 600, letterSpacing: 1 }}>
          ÜBERLEBENSPHRASEN
        </div>
        {PHRASES.slice(0, 3).map((p, i) => (
          <div key={i} style={{
            padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.washiDark}` : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15 }}>{p.jp}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
            </div>
            <div style={{ fontSize: 12, color: C.indigo, textAlign: 'right', flexShrink: 0 }}>{p.de}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Wörter: Block-Lernkurse (5 Wörter pro Block) ────────────────────────────

// Quiz am Ende eines Blocks: Kanji → Bedeutung wählen.
function BlockQuiz({ words, onFinish }) {
  const [quiz] = useState(() => {
    const allDe = [...new Set(ALL_WORDS.map(w => w.de))]
    return shuffled(words).map(w => {
      const distractors = shuffled(allDe.filter(d => d !== w.de)).slice(0, 3)
      return { kanji: w.kanji, kana: w.kana, correct: w.de, options: shuffled([w.de, ...distractors]) }
    })
  })
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLast = qi === quiz.length - 1
  const revealed = answer !== null
  const next = () => { if (isLast) onFinish(); else { setQi(qi + 1); setAnswer(null) } }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Quiz · {qi + 1} / {quiz.length}</p>
      <div style={{ fontSize: 72, fontFamily: "'Noto Serif JP', serif", marginBottom: 4, color: C.sumi }}>{cur.kanji}</div>
      <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>{cur.kana}</div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Was bedeutet das?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: 15, fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLast ? 'Quiz abschließen →' : 'Nächstes →'}
          </Btn>
        </>
      )}
    </div>
  )
}

function WordDetail({ word }) {
  return (
    <div>
      {/* Kanji + Lesung + Übersetzung */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: "'Noto Serif JP', serif", color: C.sumi, lineHeight: 1 }}>{word.kanji}</div>
        <button onClick={() => speak(word.kanji)}
          style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo, margin: '10px 0 6px' }}>
          🔊 Anhören
        </button>
        <div style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>{word.kana}
          <span style={{ fontSize: 14, color: C.textMuted, fontFamily: 'inherit' }}> · {word.romaji}</span>
        </div>
        <div style={{ fontSize: 18, color: C.sumi, marginTop: 4 }}>{word.de}</div>
      </div>

      {/* Beispielsatz */}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>BEISPIELSATZ</span>
          <button onClick={() => speak(word.ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🔊</button>
        </div>
        <div style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", marginBottom: 4 }}>{word.ex.jp}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>{word.ex.kana}</div>
        <div style={{ fontSize: 15, color: C.indigo, marginBottom: 10 }}>„{word.ex.de}"</div>
        <div style={{ background: `${C.shu}10`, borderRadius: 8, padding: 10 }}>
          <p style={{ fontSize: 12, color: C.shu }}>💡 {word.ex.note}</p>
        </div>
      </Card>
    </div>
  )
}

function BlockCourse({ block, onComplete, onClose }) {
  const words = block.words
  const totalSteps = words.length + 3 // intro + Wörter + Quiz + Abschluss
  const [step, setStep] = useState(0)

  const isIntro = step === 0
  const isQuiz = step === words.length + 1
  const isDone = step === words.length + 2
  const progress = Math.round((step / totalSteps) * 100)

  let content = null
  if (isIntro) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{block.theme}</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 8 }}>{block.title}</h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In diesem Block lernst du {words.length} Wörter mit Kanji, Lesung und je einem Beispielsatz.
          Am Ende gibt es ein kurzes Quiz.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {words.map(w => (
            <span key={w.kanji} style={{ fontSize: 28, fontFamily: "'Noto Serif JP', serif", background: `${C.indigo}12`, borderRadius: 8, padding: '4px 12px' }}>{w.kanji}</span>
          ))}
        </div>
      </div>
    )
  } else if (isQuiz) {
    content = <BlockQuiz words={words} onFinish={() => setStep(s => s + 1)} />
  } else if (isDone) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.matcha, marginBottom: 8 }}>Block geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{words.length} Wörter</strong> gelernt. Die Kanji kommen ab jetzt in deinen Wiederholungen vor.
        </p>
      </div>
    )
  } else {
    content = <WordDetail word={words[step - 1]} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>{block.theme} {block.title}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isDone ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>Block abschließen ✓</Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {isIntro ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

function BlockPath() {
  const { progress, completeWordBlock } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const done = progress.completedWordBlocks || []

  if (active) {
    const block = WORD_BLOCKS.find(b => b.id === active)
    return (
      <BlockCourse
        block={block}
        onComplete={() => {
          if (!done.includes(active)) completeWordBlock(active, block.words.length * XP_PER_WORD)
          setActive(null)
        }}
        onClose={() => setActive(null)}
      />
    )
  }

  const blocks = WORD_BLOCKS.map((b, i) => ({
    ...b,
    done: done.includes(b.id),
    locked: i === 0 ? false : !done.includes(WORD_BLOCKS[i - 1].id),
  }))

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18 }}>
        Wörter in 5er-Blöcken: Kanji, Hiragana, Bedeutung und Beispielsätze – mit Quiz am Schluss.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 28, top: 28, bottom: 28, width: 2, background: C.washiDark, zIndex: 0 }} />
        {blocks.map((b, i) => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: i < blocks.length - 1 ? 16 : 0, position: 'relative', zIndex: 1,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: b.done ? C.matcha : b.locked ? C.washiDark : C.shu,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#fff',
              boxShadow: !b.locked && !b.done ? `0 0 0 4px ${C.shu}30` : 'none',
            }}>
              {b.done ? '✓' : b.locked ? '🔒' : b.theme}
            </div>
            <button onClick={() => !b.locked && setActive(b.id)} disabled={b.locked}
              style={{
                flex: 1, background: '#fff', border: '2px solid',
                borderColor: b.done ? C.matcha : b.locked ? C.washiDark : C.shu,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left',
                cursor: b.locked ? 'not-allowed' : 'pointer', opacity: b.locked ? 0.6 : 1,
              }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {b.done ? 'Abgeschlossen ✓'
                  : b.locked ? 'Noch gesperrt'
                    : `${b.words.length} Wörter · ${b.words.map(w => w.kanji).join(' ')}`}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LernenScreen() {
  const { progress, completeLesson } = useContext(ProgressCtx)
  const [activeLesson, setActiveLesson] = useState(null)
  const [view, setView] = useState('kana') // 'kana' | 'woerter'

  // Lektionen aus dem gespeicherten Fortschritt ableiten:
  // - done  = ID ist in completedLessons
  // - locked = die vorherige Lektion ist noch nicht abgeschlossen
  const completed = progress.completedLessons || []
  const lessons = LESSONS.map((l, i) => ({
    ...l,
    done: completed.includes(l.id),
    locked: i === 0 ? false : !completed.includes(LESSONS[i - 1].id),
  }))

  const handleComplete = (id) => {
    if (!completed.includes(id)) {
      const lesson = LESSONS.find(l => l.id === id)
      completeLesson(id, (lesson?.kana.length || 0) * XP_PER_KANA)
    }
    setActiveLesson(null)
  }

  if (activeLesson) {
    const lesson = lessons.find(l => l.id === activeLesson)
    return (
      <LessonPlayer
        lesson={lesson}
        onComplete={() => handleComplete(activeLesson)}
        onClose={() => setActiveLesson(null)}
      />
    )
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
        Lernen
      </h2>

      {/* Umschalter Kana / Wörter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['kana', 'あ Kana'], ['woerter', '語 Wörter']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${view === id ? C.shu : C.washiDark}`,
              background: view === id ? `${C.shu}15` : '#fff',
              color: view === id ? C.shu : C.textMuted, fontWeight: 600, fontSize: 14,
            }}>{label}</button>
        ))}
      </div>

      {view === 'woerter' && <BlockPath />}

      {view === 'kana' && (
      <>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
        Schritt für Schritt durch Hiragana & Katakana
      </p>

      {/* Lesson path */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute', left: 28, top: 28, bottom: 28,
          width: 2, background: C.washiDark, zIndex: 0,
        }} />

        {lessons.map((lesson, i) => (
          <div key={lesson.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: i < lessons.length - 1 ? 16 : 0,
            position: 'relative', zIndex: 1,
          }}>
            {/* Node */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: lesson.done ? C.matcha : lesson.locked ? C.washiDark : C.shu,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: lesson.done ? 22 : lesson.locked ? 18 : 24,
              color: '#fff', fontFamily: "'Noto Serif JP', serif",
              boxShadow: !lesson.locked && !lesson.done ? `0 0 0 4px ${C.shu}30` : 'none',
            }}>
              {lesson.done ? '✓' : lesson.locked ? '🔒' : lesson.kana[0]}
            </div>

            {/* Card */}
            <button onClick={() => !lesson.locked && setActiveLesson(lesson.id)}
              disabled={lesson.locked}
              style={{
                flex: 1, background: '#fff', border: `2px solid`,
                borderColor: lesson.done ? C.matcha : lesson.locked ? C.washiDark : C.shu,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left',
                cursor: lesson.locked ? 'not-allowed' : 'pointer',
                opacity: lesson.locked ? 0.6 : 1,
              }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 18, marginBottom: 2 }}>
                {lesson.title}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {lesson.done ? 'Abgeschlossen ✓' :
                  lesson.locked ? 'Noch gesperrt' :
                    `${lesson.kana.length} Zeichen · Jetzt starten`}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Phrases section */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 16, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
          Überlebensphrasen
        </h3>
        {PHRASES.map((p, i) => (
          <Card key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 17, marginBottom: 2 }}>{p.jp}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: C.indigo, textAlign: 'right' }}>{p.de}</div>
                <button onClick={() => {
                  if ('speechSynthesis' in window) {
                    const u = new SpeechSynthesisUtterance(p.jp)
                    u.lang = 'ja-JP'
                    speechSynthesis.speak(u)
                  }
                }} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>🔊</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </>
      )}
    </div>
  )
}

function UebenScreen() {
  const { progress } = useContext(ProgressCtx)
  const [mode, setMode] = useState(null)

  if (mode === 'srs') return <SRSQuiz onClose={() => setMode(null)} />
  if (mode === 'erkennen' || mode === 'hoeren') return <PracticeQuiz mode={mode} onClose={() => setMode(null)} />

  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const dueCount = dueKana(progress, learnedAll).length
  const exercises = [
    { id: 'srs', icon: '🗂', title: 'SRS-Wiederholungen', sub: dueCount > 0 ? `${dueCount} Karten fällig` : 'Nichts fällig', color: C.shu },
    { id: 'erkennen', icon: '👁', title: 'Erkennen', sub: 'Zeichen → Lesung', color: C.indigo },
    { id: 'hoeren', icon: '👂', title: 'Hören', sub: 'Was hast du gehört?', color: C.matcha },
    { id: 'tippen', icon: '⌨️', title: 'Tippen', sub: 'Kana per Tastatur', color: '#8B6914' },
    { id: 'satzbau', icon: '🧩', title: 'Satzbau', sub: 'Wörter sortieren', color: '#7B3FA0' },
    { id: 'konversation', icon: '💬', title: 'Rollenspiel', sub: 'Im Restaurant', color: '#1A7A6E' },
  ]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 4 }}>
        Üben
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Wähle einen Übungstyp</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {exercises.map(e => (
          <button key={e.id} onClick={() => setMode(e.id)}
            style={{
              background: '#fff', border: `2px solid ${e.color}20`,
              borderRadius: 12, padding: '14px 12px', textAlign: 'left',
              cursor: 'pointer',
            }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{e.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi, marginBottom: 2 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{e.sub}</div>
          </button>
        ))}
      </div>

      {/* Vocab preview */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
          Überlebens-Kanji
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VOCAB.map((v, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 24, color: C.sumi, marginBottom: 4 }}>{v.jp}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{v.romaji}</div>
              <div style={{ fontSize: 13, color: C.indigo, fontWeight: 500 }}>{v.de}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function FortschrittScreen() {
  const { progress, reset } = useContext(ProgressCtx)
  const stats = computeStats(progress)
  const completed = progress.completedLessons || []
  const kanaDone = completedKanaCount(completed)
  const kanaTotal = totalKanaCount()
  const kanaPct = kanaTotal ? Math.round(kanaDone / kanaTotal * 100) : 0

  const week = weeklyXp(progress)
  const weekTotal = week.reduce((a, d) => a + d.xp, 0)
  const maxXP = Math.max(stats.goal, ...week.map(d => d.xp))

  // Fertigkeiten aus echtem Fortschritt abgeleitet (0, solange nichts gelernt).
  // Lesen/Schreiben hängen am Kana-Fortschritt; übrige Bereiche kommen später.
  const skills = [
    { label: 'Lesen', value: kanaPct, color: C.shu },
    { label: 'Schreiben', value: kanaPct, color: C.matcha },
    { label: 'Hören', value: 0, color: C.indigo },
    { label: 'Wortschatz', value: 0, color: '#8B6914' },
    { label: 'Grammatik', value: 0, color: '#7B3FA0' },
  ]

  // Errungenschaften mit echten Bedingungen.
  const achievements = [
    { icon: '🔥', label: '3-Tage-Streak', sub: 'Bleib dran!', earned: stats.streak >= 3 },
    { icon: '✍️', label: 'Erste Lektion', sub: 'Hiragana あいうえお', earned: completed.length >= 1 },
    { icon: '🎓', label: 'Alle Hiragana', sub: `${kanaDone}/${kanaTotal} Zeichen`, earned: kanaDone >= kanaTotal && kanaTotal > 0 },
  ]

  const handleReset = () => {
    if (window.confirm('Wirklich den gesamten Fortschritt auf 0 zurücksetzen? Das kann nicht rückgängig gemacht werden.')) {
      reset()
    }
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 16 }}>
        Fortschritt
      </h2>

      {/* Gesamt-XP / Level */}
      <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.shu }}>{stats.totalXp}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>XP gesamt</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{stats.level}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Level</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.matcha }}>{stats.streak} 🔥</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Streak</div>
        </div>
      </Card>

      {/* XP Bar chart */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          XP DIESE WOCHE
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {week.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', background: d.xp > 0 ? C.shu : C.washiDark,
                borderRadius: '3px 3px 0 0',
                height: `${Math.round(d.xp / maxXP * 60)}px`,
                minHeight: d.xp > 0 ? 4 : 2,
              }} />
              <span style={{ fontSize: 10, color: C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Gesamt diese Woche: <strong style={{ color: C.sumi }}>{weekTotal} XP</strong>
        </div>
      </Card>

      {/* Skills */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          FERTIGKEITEN
        </div>
        {skills.map(s => (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{s.value}%</span>
            </div>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </Card>

      {/* Achievements */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ERRUNGENSCHAFTEN
        </div>
        {achievements.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: i < achievements.length - 1 ? `1px solid ${C.washiDark}` : 'none',
            opacity: a.earned ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 24, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.earned ? a.icon : '🔒'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{a.earned ? a.sub : 'Noch nicht erreicht'}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button onClick={handleReset}
          style={{
            background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 8,
            padding: '8px 16px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
          }}>
          Fortschritt zurücksetzen
        </button>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function TabiApp() {
  const [tab, setTab] = useState('heute')
  const { user, logout } = useAuth()
  const { progress, awardXp, completeLesson, completeWordBlock, reviewCard, reset } = useProgress(user?.uid)
  const { level } = computeStats(progress)

  const screens = {
    heute: <HeuteScreen />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen />,
    fortschritt: <FortschrittScreen />,
  }

  return (
    <ProgressCtx.Provider value={{ progress, awardXp, completeLesson, completeWordBlock, reviewCard, reset }}>
    <div style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', position: 'relative',
      background: C.washi,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        background: '#fff',
        borderBottom: `2px solid ${C.washiDark}`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, background: C.shu, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontFamily: "'Noto Serif JP', serif", color: '#fff',
        }}>旅</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Noto Serif JP', serif", color: C.sumi, lineHeight: 1 }}>Tabi</div>
          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1 }}>旅 · Japanisch für Reisende</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ background: `${C.shu}15`, borderRadius: 12, padding: '3px 10px', fontSize: 12, color: C.shu, fontWeight: 600 }}>
            Level {level}
          </div>
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`}
            style={{
              background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 12,
              padding: '3px 10px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
            }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {screens[tab]}
      </div>

      <TabBar active={tab} setActive={setTab} />
    </div>
    </ProgressCtx.Provider>
  )
}
