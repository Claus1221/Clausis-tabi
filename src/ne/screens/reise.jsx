import { useState, useRef, useEffect, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { Btn } from '../../components/ui.jsx'
import { XP_PER_KANA } from '../../lib/xp.js'
import { NE_PATH } from '../data/path.js'
import { SCRIPT_LESSONS } from '../data/script.js'
import { nfc } from '../lib/deva.js'
import { isNodeDone, nodeMeta, stationStates } from '../lib/path.js'
import { buildBackdrop, roadPath, startFlags, STATE_PALETTE } from '../lib/scene.jsx'
import { ScriptLesson } from './players.jsx'

// ─── Reise: die Yatra-Karte ───────────────────────────────────────────────────
// Gegenstück zu src/screens/reise.jsx: Stationen entlang eines gewundenen Wegs, je
// Welt eine eigene Nepal-Kulisse. Zustände wie dort: erledigt (grün, ✓, antippbar zum
// Wiederholen) / offen (rot, START) / gesperrt (🔒). Freischalt-Regel in lib/path.js.
// Stationen ohne Daten (nodeMeta null, Typen späterer Tasks) fallen still weg; am
// Ende steht eine Tafel „Hier geht es bald weiter“.

// Kulisse je Welt in Pfad-Reihenfolge; der Bereich der Tafel am Ende zeigt die Berge
// als Ausblick. Neue Welten hier ergänzen (Standard: berge).
const BAND_THEMES = ['tal', 'huegel', 'see', 'berge']

export default function ReiseScreen() {
  const { progress, completeLesson, scheduleNew } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  // Station öffnen und dabei merken, ob sie schon erledigt war (s. ScriptLesson unten).
  const open = node => setActive({ ...node, wasDone: isNodeDone(node, progress) })
  const currentRef = useRef(null)

  // Beim Öffnen zur offenen Station scrollen (wie auf der japanischen Karte).
  useEffect(() => {
    try { currentRef.current?.scrollIntoView({ block: 'center' }) } catch { /* egal */ }
  }, [])

  const states = stationStates(NE_PATH, progress)
  const stationIdx = NE_PATH.map((_, i) => i).filter(i => states[i] !== null)
  const doneCount = stationIdx.filter(i => states[i] === 'done').length
  const currentIdx = states.indexOf('current')

  // ─ Aktive Lektion als Vollbild-Overlay ─
  if (active?.type === 'script') {
    const lesson = SCRIPT_LESSONS.find(l => l.id === active.id)
    // Stand beim ÖFFNEN: onComplete bucht sofort, die Lektion steht danach noch ~350 ms.
    // Läse man hier live, kippte der Abschluss-Bildschirm in dieser Spanne auf
    // „Schon abgeschlossen“.
    const already = active.wasDone
    const close = () => setActive(null)
    return (
      // onComplete bucht nur; geschlossen wird über onClose (ScriptLesson ruft es nach
      // dem Buchen verzögert bzw. beim ✕).
      <ScriptLesson lesson={lesson} alreadyDone={already} onClose={close}
        onComplete={() => {
          // Wiederholung plant idempotent ein (falls ein früherer Abschluss offline
          // verloren ging); XP und Verlaufszähler nur beim ersten Abschluss. Der Zähler
          // heißt `kana`, damit Wochenrückblick & Co. Schriftzeichen mitzählen.
          // Beide Schreibvorgänge laufen bewusst ohne Reihenfolge: jeder ist für sich
          // idempotent bzw. ein merge-sicherer Patch (arrayUnion/increment, nur fehlende Karten).
          scheduleNew(lesson.chars.map(nfc))
          if (!already) completeLesson(lesson.id, lesson.chars.length * XP_PER_KANA, { kana: lesson.chars.length })
        }} />
    )
  }

  // ─ Layout der Karte ─
  const R = 30, AMP = 86, CENTER = 160, XPAT = [0, 1, 0, -1]
  const bands = [], headers = [], laid = []
  let y = 22, ni = 0, bandStart = null, bandIdx = -1
  NE_PATH.forEach((it, i) => {
    if (it.world) {
      if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
      bandIdx++
      bandStart = y
      headers.push({ y, world: it.world, sub: it.sub })
      y += 62 // Devanagari-Zeilen sind höher als japanische – mehr Luft bis zur Station
      return
    }
    if (states[i] === null) return // Station ohne Daten: still auslassen
    laid.push({ node: it, meta: nodeMeta(it), state: states[i], x: CENTER + AMP * XPAT[ni % 4], y: y + R })
    y += 2 * R + 56
    ni++
  })
  if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
  // Tafel am Pfadende: der Weg führt noch ein Stück zu ihr hin.
  const boardY = y + 10
  const BOARD_H = 120
  bands.push({ top: y, bottom: y + BOARD_H + 40, idx: bands.length })
  const trackH = boardY + BOARD_H + 40
  const roadPts = laid.map(n => [n.x, n.y])
  roadPts.push([CENTER, boardY + 8])
  const road = roadPath(roadPts)

  const backdropH = trackH + 80
  const backdrop = buildBackdrop(bands.map((b, i) => ({
    ...b,
    top: i === 0 ? 0 : b.top,
    bottom: i === bands.length - 1 ? backdropH : b.bottom,
    theme: BAND_THEMES[b.idx] || 'berge',
  })))

  const current = currentIdx >= 0 ? NE_PATH[currentIdx] : null

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 4 }}>
          Deine Reise <span style={{ fontFamily: NE }}>यात्रा</span>
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
          Station für Station durch Nepal – zuerst die Schrift: Devanagari, Zeichen für Zeichen.
        </p>
        {current ? (
          <Btn onClick={() => open(current)} style={{ width: '100%', minHeight: 48, marginBottom: 12 }}>
            Weiter: {nodeMeta(current).title} →
          </Btn>
        ) : (
          <div style={{ background: `${C.matcha}18`, border: `1px solid ${C.matcha}55`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.sumi, marginBottom: 12 }}>
            🎉 Alle Stationen geschafft – tippe eine Station an, um sie zu wiederholen.
          </div>
        )}
        <div style={{ height: 8, background: C.washiDark, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(doneCount / Math.max(1, stationIdx.length) * 100)}%`, background: C.matcha, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
          {doneCount} / {stationIdx.length} Stationen gemeistert
        </div>
      </div>

      {/* Karte */}
      <div style={{ position: 'relative', width: '100%', height: trackH, overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: -40, left: 0, right: 0, height: backdropH, zIndex: 0 }}>
          <svg width="100%" height={backdropH} viewBox={`0 0 400 ${backdropH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {backdrop}
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: 320, margin: '0 auto', height: trackH }}>
          <svg width="320" height={trackH} viewBox={`0 0 320 ${trackH}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
            {laid[0] && startFlags(250, laid[0].y - 40, 'flags')}
            <path d={road} fill="none" stroke="#D7CEB6" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#EFEBE0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#C2B894" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" />
          </svg>

          {headers.map((h, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: h.y, textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 16, padding: '4px 14px', maxWidth: 300 }}>
                <span style={{ fontFamily: NE, fontSize: 14, fontWeight: 600, color: C.indigo, marginRight: 6 }}>{h.world}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{h.sub}</span>
              </span>
            </div>
          ))}

          {laid.map((n, i) => {
            const [bg, edge] = STATE_PALETTE[n.state]
            const locked = n.state === 'locked'
            return (
              <div key={i} ref={n.state === 'current' ? currentRef : null}
                style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', width: 2 * R + 64, textAlign: 'center' }}>
                <button onClick={() => !locked && open(n.node)} disabled={locked}
                  aria-label={`${n.meta.title}${locked ? ' (gesperrt)' : n.state === 'done' ? ' (geschafft, wiederholen)' : ' (starten)'}`}
                  style={{
                    position: 'relative', width: 2 * R, height: 2 * R, borderRadius: '50%',
                    background: bg, border: `3px solid ${edge}`, cursor: locked ? 'default' : 'pointer',
                    boxShadow: n.state === 'current' ? `0 0 0 6px ${C.shu}28` : 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}>
                  <span style={{ fontFamily: NE, fontSize: 24, color: locked ? C.textMuted : '#fff', lineHeight: 1 }}>
                    {locked ? '🔒' : n.meta.glyph}
                  </span>
                  {n.state === 'done' && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#E8B84B', color: '#7A5A14', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  )}
                </button>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-block', background: 'rgba(239,235,224,0.88)', borderRadius: 8, padding: '1px 6px', fontSize: 11, color: C.sumi, maxWidth: 124, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: NE }}>
                    {n.meta.title}
                  </span>
                </div>
                {n.state === 'current' && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: C.shu, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>START</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Tafel am Pfadende */}
          <div style={{ position: 'absolute', left: '50%', top: boardY, transform: 'translateX(-50%)', width: 230, textAlign: 'center' }}>
            <div style={{
              background: '#F6EBD3', border: '3px solid #A9885E', borderRadius: 10, padding: '12px 14px',
              boxShadow: '0 6px 14px -8px rgba(33,31,27,0.45)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#6E5138' }}>Hier geht es bald weiter</div>
              <div style={{ fontSize: 12, color: '#7A6242', marginTop: 4, lineHeight: 1.45 }}>Neue Stationen sind unterwegs.</div>
            </div>
            <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', width: 150, margin: '0 auto' }}>
              <span style={{ width: 6, height: 26, background: '#8A6F55', borderRadius: 2 }} />
              <span style={{ width: 6, height: 26, background: '#8A6F55', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
