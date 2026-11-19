import { useEffect, useRef } from 'react'
import { C, NE } from '../../theme.js'
import { aksharas } from '../lib/deva.js'

// Mal-Fläche zum Nachmalen eines Devanagari-Zeichens: das Zeichen steht blass dahinter,
// darüber malt man mit Maus, Finger oder Stift. Gegenstück zu DrawCanvas (components/
// kana.jsx), aber mit Pointer-Events statt getrennter Maus-/Touch-Handler – so geht
// auch der Stift, und setPointerCapture hält den Strich, wenn er über den Rand rutscht.
// Kein Strichfolge-Bild: für Devanagari gibt es keine freien Strichdaten wie KanjiVG.

const SIZE = 220 // passt bei 360 px Breite mit 20 px Rand

export default function TraceCanvas({ char }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  // Nur der Zeiger, der den Strich begonnen hat, zählt: ein zweiter Finger mitten im
  // Strich darf ihn weder fortsetzen noch beenden.
  const activeId = useRef(null)

  // Scharf auf hochauflösenden Displays: Pixelpuffer × devicePixelRatio, Zeichnen in
  // CSS-Pixeln. Bei neuem Zeichen leer beginnen.
  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 5
    ctx.strokeStyle = C.sumi
    ctx.fillStyle = C.sumi
  }, [char])

  // touch-action: none verhindert das Scrollen schon; ältere iOS-Safaris ignorieren es
  // aber teilweise. Ein nicht-passiver Touch-Listener ist die zweite Sicherung (React
  // hängt Touch-Handler passiv an, preventDefault würde dort nichts bewirken).
  useEffect(() => {
    const canvas = canvasRef.current
    const stop = e => e.preventDefault()
    canvas.addEventListener('touchstart', stop, { passive: false })
    canvas.addEventListener('touchmove', stop, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', stop)
      canvas.removeEventListener('touchmove', stop)
    }
  }, [])

  const pos = e => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = e => {
    if (e.button != null && e.button > 0) return // nur Haupttaste / Finger / Stiftspitze
    e.preventDefault()
    if (drawing.current) return // schon ein Strich im Gange (zweiter Finger)
    activeId.current = e.pointerId
    try { canvasRef.current.setPointerCapture(e.pointerId) } catch { /* ältere Browser */ }
    drawing.current = true
    const p = pos(e)
    last.current = p
    // Ein Tipp ohne Bewegung hinterlässt einen Punkt (für ं, ः, den Punkt in ङ …).
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const move = e => {
    if (!drawing.current || e.pointerId !== activeId.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    // Zwischenpunkte des Browsers mitnehmen, sonst wird ein schneller Strich eckig.
    const evts = e.nativeEvent.getCoalescedEvents?.() || [e]
    for (const ev of evts.length ? evts : [e]) {
      const p = pos(ev)
      ctx.beginPath()
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      last.current = p
    }
  }

  const up = e => {
    if (e.pointerId !== activeId.current) return
    drawing.current = false
    last.current = null
    activeId.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  // Eine Schreibsilbe (auch क्ष oder का) füllt die Fläche; mehrere teilen sie sich.
  // Ziffern und Danda zählen in aksharas nicht mit → max(1, …).
  const fontSize = Math.round(SIZE * 0.62 / Math.max(1, aksharas(char).length))

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Rahmen am Halter, nicht am Canvas: so decken sich Pixelpuffer und Zeigerkoordinaten. */}
      <div style={{
        position: 'relative', display: 'inline-block', width: SIZE, height: SIZE, boxSizing: 'content-box',
        border: `2px solid ${C.washiDark}`, borderRadius: 10, background: '#fff', overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize, fontFamily: NE, color: C.washiDark, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
        }}>{char}</div>
        <svg width={SIZE} height={SIZE} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <line x1={SIZE / 2} y1="0" x2={SIZE / 2} y2={SIZE} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
          <line x1="0" y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
        </svg>
        <canvas ref={canvasRef} aria-label={`Fläche zum Nachmalen von ${char}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onLostPointerCapture={up}
          style={{
            position: 'relative', width: SIZE, height: SIZE, display: 'block',
            touchAction: 'none', cursor: 'crosshair',
          }} />
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={clear} style={{
          background: C.washiDark, border: 'none', borderRadius: 10, minHeight: 44,
          padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: C.sumi,
        }}>Löschen ↺</button>
      </div>
    </div>
  )
}
