import { useState, useRef, useEffect } from 'react'

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

// ─── Stroke data (KanjiVG, CC BY-SA) ────────────────────────────────────────
const KANA_DATA = {
  あ: { romaji: 'a', strokes: ['M20,15 C20,15 22,20 22,35 C22,55 15,70 10,80','M40,10 C40,10 45,25 45,45 C45,65 35,78 20,85','M15,45 C15,45 30,42 45,45 C60,48 70,55 75,70'], tip: 'Wie ein Mensch, der winkt' },
  い: { romaji: 'i', strokes: ['M30,15 C30,15 28,35 25,55 C23,68 20,75 18,82','M55,15 C55,15 58,30 58,50 C58,65 52,75 45,82'], tip: 'Zwei parallele Linien' },
  う: { romaji: 'u', strokes: ['M45,12 C45,12 45,18 44,22','M25,28 C35,22 55,22 65,28','M45,28 C45,28 45,50 40,65 C36,75 28,82 20,85'], tip: 'Ein Haken mit Dach' },
  え: { romaji: 'e', strokes: ['M45,10 C45,10 45,20 44,30','M15,35 C30,28 55,28 72,35','M45,35 C45,35 50,50 48,62 C44,75 30,85 15,88','M55,50 C60,55 68,62 72,75'], tip: 'Kreuz mit Schwung' },
  お: { romaji: 'o', strokes: ['M45,10 C45,10 45,20 44,28','M15,32 C30,25 55,25 72,32','M45,32 C45,32 48,48 45,60 C40,75 28,85 15,90','M58,45 C62,50 68,58 65,72'], tip: 'Wie え aber voller' },
  か: { romaji: 'ka', strokes: ['M25,15 C25,15 28,35 28,55 C28,70 25,80 22,88','M15,38 C25,32 55,32 70,38','M55,38 C55,38 62,52 62,65 C62,75 55,85 45,90'], tip: 'Vertikale mit Kreuz' },
  き: { romaji: 'ki', strokes: ['M20,22 C35,18 55,18 68,22','M20,40 C35,35 55,35 68,40','M44,15 C44,15 45,35 45,55 C45,68 40,78 35,85','M55,50 C60,58 65,68 62,80'], tip: 'Zwei Querstriche mit Stiel' },
  く: { romaji: 'ku', strokes: ['M65,15 C65,15 45,40 25,55 C35,65 55,75 68,85'], tip: 'Ein Winkel nach links' },
  け: { romaji: 'ke', strokes: ['M25,15 C25,15 28,38 28,58 C28,72 25,82 22,90','M28,35 C40,28 58,28 68,35','M68,35 C68,35 68,55 65,70 C62,80 55,88 45,92'], tip: 'Vertikale mit rechtem Arm' },
  こ: { romaji: 'ko', strokes: ['M18,28 C35,22 58,22 72,28','M18,62 C35,55 58,55 72,62'], tip: 'Zwei Querstriche' },
  さ: { romaji: 'sa', strokes: ['M20,25 C35,18 55,18 70,25','M44,18 C44,18 45,38 44,52','M15,55 C25,48 45,52 55,58 C62,65 58,78 45,85 C35,90 22,88 15,82'], tip: 'Querstrich und Schleife' },
  し: { romaji: 'shi', strokes: ['M45,12 C45,12 48,35 48,58 C48,72 42,82 30,88 C22,92 14,88 12,82'], tip: 'Ein Haken nach rechts' },
  す: { romaji: 'su', strokes: ['M44,10 C44,10 45,22 44,32','M15,32 C30,25 55,25 72,32','M44,32 C44,32 48,50 46,62 C40,78 25,88 14,85'], tip: 'Dach mit Haken' },
  せ: { romaji: 'se', strokes: ['M30,18 C30,18 32,38 32,58 C32,72 28,82 24,88','M15,35 C30,28 55,28 68,35','M68,35 C68,35 68,55 65,72 C62,82 55,90 45,92'], tip: 'Wie け gespiegelt' },
  そ: { romaji: 'so', strokes: ['M18,22 C35,16 58,16 72,22','M44,22 C44,22 48,38 45,52 C38,68 22,80 12,85'], tip: 'Querstrich mit Schwung' },
}

const LESSONS = [
  { id: 'l1', title: 'あいうえお', kana: ['あ','い','う','え','お'], done: false },
  { id: 'l2', title: 'かきくけこ', kana: ['か','き','く','け','こ'], done: false, locked: true },
  { id: 'l3', title: 'さしすせそ', kana: ['さ','し','す','せ','そ'], done: false, locked: true },
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

// ─── Stroke animation ─────────────────────────────────────────────────────────

function StrokeDisplay({ char }) {
  const data = KANA_DATA[char]
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => { setStep(0); setPlaying(false) }, [char])

  useEffect(() => {
    if (!playing) return
    if (step >= data.strokes.length) { setPlaying(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 700)
    return () => clearTimeout(t)
  }, [playing, step, data.strokes.length])

  const colors = ['#DA4A38', '#1E4368', '#5E8A6A', '#8B6914', '#7B3FA0']

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 90 100" style={{
        background: '#fafaf8',
        borderRadius: 8,
        border: `1px solid ${C.washiDark}`,
      }}>
        {/* Genkou grid */}
        <line x1="45" y1="0" x2="45" y2="100" stroke={C.washiDark} strokeWidth="0.5" />
        <line x1="0" y1="50" x2="90" y2="50" stroke={C.washiDark} strokeWidth="0.5" />
        {/* Ghost */}
        <text x="45" y="78" textAnchor="middle" fontSize="64"
          fontFamily="'Noto Serif JP', serif"
          fill={C.washiDark} style={{ userSelect: 'none' }}>{char}</text>
        {/* Animated strokes */}
        {data.strokes.slice(0, step).map((d, i) => (
          <path key={i} d={d} stroke={colors[i % colors.length]}
            strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Stroke start dots */}
        {data.strokes.slice(0, step).map((d, i) => {
          const m = d.match(/M([\d.]+),([\d.]+)/)
          if (!m) return null
          return <circle key={i} cx={m[1]} cy={m[2]} r="4"
            fill={colors[i % colors.length]} opacity="0.7" />
        })}
      </svg>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {data.strokes.map((_, i) => (
          <button key={i} onClick={() => { setPlaying(false); setStep(i + 1) }}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: step > i ? colors[i % colors.length] : C.washiDark,
              color: step > i ? '#fff' : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{i + 1}</button>
        ))}
        <button onClick={() => { setStep(0); setPlaying(true) }}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.indigo, color: '#fff', fontSize: 12, cursor: 'pointer',
          }}>▶ Abspielen</button>
        <button onClick={() => setStep(0)}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.washiDark, color: C.sumi, fontSize: 12, cursor: 'pointer',
          }}>↺</button>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
        Strich {Math.min(step, data.strokes.length)} von {data.strokes.length}
        {step > 0 && ` · Oben → Unten, Links → Rechts`}
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

function LessonPlayer({ lesson, onComplete, onClose }) {
  const kana = lesson.kana
  const totalSteps = kana.length * 3 + 2 // intro + (explain+stroke+draw) * n + quiz + done
  const [step, setStep] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizCorrect, setQuizCorrect] = useState(null)

  const progress = Math.round((step / totalSteps) * 100)

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
          In dieser Lektion lernst du {kana.length} Hiragana-Zeichen.
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
      // Quick quiz
      const question = kana[Math.floor(Math.random() * kana.length)]
      const correct = KANA_DATA[question]?.romaji
      const wrong = kana.filter(k => k !== question).slice(0, 2).map(k => KANA_DATA[k]?.romaji)
      const options = [correct, ...wrong].sort(() => Math.random() - 0.5)

      content = (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>Kurzer Check</p>
          <div style={{ fontSize: 72, fontFamily: "'Noto Serif JP', serif", marginBottom: 20, color: C.sumi }}>
            {question}
          </div>
          <p style={{ marginBottom: 16, fontWeight: 500 }}>Welche Lesung ist richtig?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {options.map(o => (
              <button key={o} onClick={() => {
                setQuizAnswer(o)
                setQuizCorrect(o === correct)
              }}
                style={{
                  padding: '14px 8px', borderRadius: 8, border: `2px solid`,
                  borderColor: quizAnswer === null ? C.washiDark :
                    o === correct ? C.matcha : o === quizAnswer ? C.shu : C.washiDark,
                  background: quizAnswer === null ? '#fff' :
                    o === correct ? `${C.matcha}20` : o === quizAnswer ? `${C.shu}20` : '#fff',
                  fontSize: 18, fontWeight: 600, cursor: 'pointer',
                  color: C.sumi,
                }}>{o}</button>
            ))}
          </div>
          {quizAnswer !== null && (
            <p style={{ marginTop: 12, color: quizCorrect ? C.matcha : C.shu, fontWeight: 600 }}>
              {quizCorrect ? '✓ Richtig!' : `✗ Es war: ${correct}`}
            </p>
          )}
        </div>
      )
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

      {/* Footer */}
      <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
        {isLast ? (
          <Btn onClick={onComplete} style={{ width: '100%' }}>
            Lektion abschließen ✓
          </Btn>
        ) : (
          <Btn onClick={() => {
            setQuizAnswer(null)
            setQuizCorrect(null)
            setStep(s => s + 1)
          }} style={{ width: '100%' }}
            variant={step === totalSteps - 2 && quizAnswer === null ? 'ghost' : 'primary'}
          >
            {step === 0 ? 'Los geht\'s →' : 'Weiter →'}
          </Btn>
        )}
      </div>
    </div>
  )
}

// ─── SRS Quiz ────────────────────────────────────────────────────────────────

function SRSQuiz({ onClose }) {
  const cards = Object.entries(KANA_DATA).map(([k, v]) => ({ char: k, ...v }))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)

  if (idx >= cards.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Alle Karten geschafft!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>{done} Karten wiederholt.</p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const card = cards[idx]

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>{idx + 1} / {cards.length}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>✕</button>
      </div>

      <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: "'Noto Serif JP', serif", marginBottom: 12 }}>{card.char}</div>
        {flipped ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{card.romaji}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{card.tip}</div>
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
          {[['Nochmal', C.shu], ['Schwer', '#E8A020'], ['Gut', C.matcha], ['Leicht', C.indigo]].map(([label, color]) => (
            <button key={label} onClick={() => { setFlipped(false); setIdx(i => i + 1); setDone(d => d + 1) }}
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

// ─── Screens ─────────────────────────────────────────────────────────────────

function HeuteScreen() {
  const charOfDay = 'あ'
  const data = KANA_DATA[charOfDay]
  const streak = 3
  const xp = 180
  const goal = 200

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
          { label: 'Fällig', value: '12', color: C.matcha },
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
              strokeDasharray={`${2 * Math.PI * 22 * xp / goal} ${2 * Math.PI * 22}`}
              strokeLinecap="round" transform="rotate(-90 28 28)" />
            <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.shu}>
              {Math.round(xp / goal * 100)}%
            </text>
          </svg>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Tagesziel</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{xp} / {goal} XP</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>noch {goal - xp} XP bis zum Ziel</div>
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

function LernenScreen() {
  const [lessons, setLessons] = useState(LESSONS)
  const [activeLesson, setActiveLesson] = useState(null)

  const handleComplete = (id) => {
    setLessons(prev => {
      const idx = prev.findIndex(l => l.id === id)
      return prev.map((l, i) => {
        if (l.id === id) return { ...l, done: true }
        if (i === idx + 1) return { ...l, locked: false }
        return l
      })
    })
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
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 4 }}>
        Lernpfad
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
        Schritt für Schritt durch Hiragana
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
    </div>
  )
}

function UebenScreen() {
  const [mode, setMode] = useState(null)

  if (mode === 'srs') return <SRSQuiz onClose={() => setMode(null)} />

  const exercises = [
    { id: 'srs', icon: '🗂', title: 'SRS-Wiederholungen', sub: '12 Karten fällig', color: C.shu },
    { id: 'erkennen', icon: '👁', title: 'Erkennen', sub: 'Zeichen → Bedeutung', color: C.indigo },
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
  const skills = [
    { label: 'Lesen', value: 35, color: C.shu },
    { label: 'Hören', value: 20, color: C.indigo },
    { label: 'Schreiben', value: 15, color: C.matcha },
    { label: 'Wortschatz', value: 25, color: '#8B6914' },
    { label: 'Grammatik', value: 10, color: '#7B3FA0' },
  ]

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const xpPerDay = [120, 180, 0, 200, 150, 80, 180]
  const maxXP = 200

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 16 }}>
        Fortschritt
      </h2>

      {/* XP Bar chart */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          XP DIESE WOCHE
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {days.map((d, i) => (
            <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', background: xpPerDay[i] > 0 ? C.shu : C.washiDark,
                borderRadius: '3px 3px 0 0',
                height: `${Math.round(xpPerDay[i] / maxXP * 60)}px`,
                minHeight: xpPerDay[i] > 0 ? 4 : 2,
              }} />
              <span style={{ fontSize: 10, color: C.textMuted }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Gesamt diese Woche: <strong style={{ color: C.sumi }}>910 XP</strong>
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
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ERRUNGENSCHAFTEN
        </div>
        {[
          { icon: '🔥', label: '3-Tage-Streak', sub: 'Bleib dran!' },
          { icon: '✍️', label: 'Erste Lektion', sub: 'Hiragana あいうえお' },
          { icon: '📚', label: '8 Vokabeln', sub: 'Überlebens-Kanji' },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.washiDark}` : 'none',
          }}>
            <div style={{ fontSize: 24 }}>{a.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{a.sub}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function TabiApp() {
  const [tab, setTab] = useState('heute')

  const screens = {
    heute: <HeuteScreen />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen />,
    fortschritt: <FortschrittScreen />,
  }

  return (
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <div style={{ background: `${C.shu}15`, borderRadius: 12, padding: '3px 10px', fontSize: 12, color: C.shu, fontWeight: 600 }}>
            Level 2
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {screens[tab]}
      </div>

      <TabBar active={tab} setActive={setTab} />
    </div>
  )
}
