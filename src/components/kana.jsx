import { useState, useEffect, useRef } from 'react'
import { C, JP } from '../theme.js'
import { KANA_DATA } from '../data/kana.js'
import { STROKE_VIEWBOX } from '../kanaStrokes.js'

// ─── Stroke animation (echte KanjiVG-Pfade, 109×109) ─────────────────────────

const STROKE_COLORS = ['#DA4A38', '#1E4368', '#5E8A6A', '#8B6914', '#7B3FA0', '#1A7A6E', '#B5651D']

function strokeStart(d) {
  const m = d.match(/^M\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)/)
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null
}

export function StrokeDisplay({ char }) {
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
          fontFamily={JP} fill="#EFEBE0" style={{ userSelect: 'none' }}>{char}</text>

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

export function DrawCanvas({ char }) {
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
          fontSize: size * 0.7, fontFamily: JP,
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
