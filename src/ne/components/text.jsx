import { useState, useContext, useEffect, useLayoutEffect, useRef } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { sentenceGroups, hitSegments } from '../lib/sentence.js'
import { stopSpeaking } from '../lib/speech.js'
import { ListenButton } from './sound.jsx'

// ─── Nepali-Text: Wörter und Sätze ────────────────────────────────────────────
// Gegenstück zu TappableSentence/WordDetail in src/components/japanese.jsx.
// Grundsatz: Devanagari steht immer; die Umschrift darunter folgt dem Schalter
// settings.showRoman („Umschrift bei Wörtern und Sätzen“). Ausnahme: wer ein Stück im
// Satz ANTIPPT, will es nachschlagen – dort steht die Umschrift immer.

// Schalter lesen; ohne Context (oder ohne gespeicherten Wert) gilt der Standard „an“.
export function useShowRoman() {
  const ctx = useContext(ProgressCtx)
  return ctx?.settings?.showRoman !== false
}

// Wort/Satz: Devanagari, darunter die Umschrift (nur mit showRoman).
// size = Schriftgröße des Devanagari; die Umschrift skaliert mit, bleibt aber lesbar klein.
export function NeText({ dev, roman, size = 28, color = C.sumi, align }) {
  const showRoman = useShowRoman()
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: size, fontFamily: NE, color, lineHeight: 1.35 }}>{dev}</div>
      {showRoman && roman && (
        <div style={{ fontSize: Math.max(13, Math.round(size * 0.42)), color: C.indigo, fontWeight: 600, marginTop: 2 }}>{roman}</div>
      )}
    </div>
  )
}

// Beispielsatz mit antippbaren Stücken. Eingabe = Beispielsatz aus words.js
// ({ dev, roman, tokens }). Wo Nepali zusammenschreibt (तपाईंलाई, छ?), kleben die Stücke
// aneinander; die Gruppierung kommt aus `dev` (lib/sentence.js). Angezeigt wird IMMER das
// `de` des Tokens selbst, nie ein Nachschlagen im Wortschatz – छ ist im Satz meist „ist“,
// als Wort „sechs“.
//
// Tippflächen: jedes Stück mit `de` ist ein Knopf, 44 px hoch. Kurze Stücke (मा, को, हो)
// sind sichtbar nur 15–30 px breit; damit sie trotzdem 44 px breit treffbar sind, ohne den
// Text auseinanderzuziehen, liegt in jedem Knopf eine unsichtbare Fläche, deren Lage nach
// dem Rendern gemessen und je Zeile mit hitSegments verteilt wird: lückenlos, nie
// überlappend, jede ≥ 44 px, an der Naht angeklebter Stücke geteilt (lib/sentence.js).
//
// Nachschlage-Kasten: liegt ÜBER dem Folgenden (kein Springen des Textes) – unter dem
// Satz, oder darüber, wenn unten ein abschneidender Rand zu nah ist; schließt bei
// Tipp außerhalb des Satzes, bei Escape und beim Antippen eines anderen Stücks (das dann
// aufgeht). Der Tipp außerhalb wird nicht verschluckt: „Weiter“ o. Ä. wirkt sofort.
// hint: Tipp-Hinweis „💡 Tippe …“ zeigen (nur beim ersten Satz einer Lektion).
// sound: Ergebnis von useSound() – Anhören-Knöpfe erscheinen nur mit Ton.
export function TappableSentence({ dev, roman, tokens, size = 26, sound, hint = false }) {
  const showRoman = useShowRoman()
  const [active, setActive] = useState(null)
  const [hits, setHits] = useState({}) // Token-Index → { dx, w } der unsichtbaren Fläche
  const [above, setAbove] = useState(false) // Nachschlage-Kasten über statt unter dem Satz
  const rootRef = useRef(null)
  const popRef = useRef(null)
  const lineRef = useRef(null)
  const btnRefs = useRef({})
  useEffect(() => () => stopSpeaking(), []) // Satz verschwindet → nicht weiterreden
  const list = tokens || []
  const groups = sentenceGroups(dev, list)
  const tk = active !== null ? list[active] : null

  // Tippflächen messen und verteilen; erneut bei Größenänderung (Drehen, Schriftladen).
  useLayoutEffect(() => {
    const box = lineRef.current
    if (!box) return
    const measure = () => {
      const base = box.getBoundingClientRect()
      const rows = new Map() // gerundete Oberkante → [{ i, left, right }]
      for (const [i, el] of Object.entries(btnRefs.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        const top = Math.round(r.top - base.top)
        if (!rows.has(top)) rows.set(top, [])
        rows.get(top).push({ i: Number(i), left: r.left - base.left, right: r.right - base.left })
      }
      const next = {}
      for (const row of rows.values()) {
        row.sort((a, b) => a.left - b.left)
        hitSegments(row, 44, 0, base.width).forEach((s, k) => {
          next[row[k].i] = { dx: Math.round((s.left - row[k].left) * 10) / 10, w: Math.round((s.right - s.left) * 10) / 10 }
        })
      }
      setHits(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    measure()
    // Devanagari-Webfont kommt oft NACH dem ersten Rendern: die Stücke werden dann breiter,
    // die Zeile aber nicht unbedingt (sie ist flex: 1) – also nach dem Laden neu messen und
    // zusätzlich jeden Knopf selbst beobachten, nicht nur die Zeile.
    let live = true
    document.fonts?.ready?.then(() => { if (live) measure() })
    if (typeof ResizeObserver === 'undefined') return () => { live = false }
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    for (const el of Object.values(btnRefs.current)) if (el) ro.observe(el)
    return () => { live = false; ro.disconnect() }
  }, [dev, size, list.length])

  // Kasten nicht abschneiden lassen: liegt unter dem Satz nicht genug Platz bis zum Rand
  // des nächsten scrollenden/abschneidenden Vorfahren (Bibliotheks-Blatt, Lektionsinhalt)
  // bzw. des Fensters, geht er über den Satz; passt er auch dort nicht, wird er ins Bild
  // gescrollt. Gerechnet wird mit der Lage des Satzes, nicht des Kastens – so hängt das
  // Ergebnis nicht davon ab, wo der Kasten gerade steht.
  useLayoutEffect(() => {
    if (active === null) return
    const root = rootRef.current, pop = popRef.current
    if (!root || !pop) return
    let top = 0, bottom = window.innerHeight
    for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY
      if (oy === 'visible') continue
      const r = el.getBoundingClientRect()
      top = Math.max(top, r.top)
      bottom = Math.min(bottom, r.bottom)
    }
    const r = root.getBoundingClientRect()
    const h = pop.getBoundingClientRect().height + 6
    const up = bottom - r.bottom < h && r.top - top >= h
    setAbove(up)
    if (!up && bottom - r.bottom < h) {
      try { pop.scrollIntoView({ block: 'nearest' }) } catch { /* alte Browser: egal */ }
    }
  }, [active])

  // Offener Kasten: Tipp außerhalb des Satzes oder Escape schließt ihn.
  useEffect(() => {
    if (active === null) return
    const onDown = e => { if (!rootRef.current?.contains(e.target)) setActive(null) }
    const onKey = e => { if (e.key === 'Escape') setActive(null) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  let n = -1 // laufender Token-Index über alle Gruppen
  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div ref={lineRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', columnGap: '0.3em', alignItems: 'center', position: 'relative' }}>
          {groups.map((g, gi) => (
            // Eine Schreibgruppe bricht nie um – sonst risse तपाईं|लाई auseinander.
            <span key={gi} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {g.map(t => {
                n++
                const i = n
                const text = <span style={{ fontFamily: NE, fontSize: size, lineHeight: 1.3 }}>{t.t}</span>
                if (!t.de) return <span key={i} style={{ color: C.sumi }}>{text}</span>
                const on = active === i
                const hit = hits[i]
                return (
                  <button key={i} ref={el => { btnRefs.current[i] = el }}
                    onClick={() => setActive(on ? null : i)} aria-pressed={on}
                    aria-label={`${t.t} – Bedeutung zeigen`}
                    style={{
                      position: 'relative', minHeight: 44, padding: '0 1px', margin: 0, border: 'none', borderRadius: 4, cursor: 'pointer',
                      background: on ? `${C.shu}22` : 'transparent', color: C.sumi,
                      boxShadow: `inset 0 -2px 0 ${on ? C.shu : `${C.indigo}55`}`,
                    }}>
                    {text}
                    {/* Unsichtbare Tippfläche (s. oben); z-index, damit sie über dem
                        sichtbaren Nachbarn liegt, in den sie an der Naht hineinreicht. */}
                    {hit && (
                      <span aria-hidden="true" data-hit=""
                        style={{ position: 'absolute', top: 0, bottom: 0, left: hit.dx, width: hit.w, zIndex: 1 }} />
                    )}
                  </button>
                )
              })}
            </span>
          ))}
        </div>
        {/* Ganzer Satz: nur mit Ton, ohne Ton gar nichts (der Hinweis steht je Screen einmal). */}
        {sound && dev && <ListenButton text={dev} sound={sound} quiet label="Satz" />}
      </div>
      {showRoman && roman && <div style={{ fontSize: 14, color: C.textMuted, marginTop: 2 }}>{roman}</div>}
      {/* Beim offenen Kasten nur unsichtbar statt weg – sonst rutschte der Text darunter. */}
      {hint && (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6, visibility: tk ? 'hidden' : 'visible' }}>💡 Tippe ein Wort im Satz für seine Bedeutung</div>
      )}

      {tk && (
        <div ref={popRef} role="status" aria-live="polite"
          style={{
            position: 'absolute', left: 0, right: 0, zIndex: 3,
            ...(above ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }),
            background: '#fff', border: `1px solid ${C.indigo}40`, borderRadius: 8, padding: '8px 10px',
            boxShadow: '0 8px 20px -10px rgba(33,31,27,0.45)', display: 'flex', alignItems: 'center', gap: 10,
          }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontFamily: NE, color: C.sumi }}>{tk.t}</span>
              {tk.r && <span style={{ fontSize: 14, color: C.indigo, fontWeight: 600 }}>{tk.r}</span>}
            </div>
            <div style={{ fontSize: 14, color: C.sumi, lineHeight: 1.45 }}>{tk.de}</div>
          </div>
          {sound && <ListenButton key={active} text={tk.t} sound={sound} quiet label="" />}
        </div>
      )}
    </div>
  )
}
