import { useState, useContext, useEffect } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { sentenceGroups } from '../lib/sentence.js'
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
// aneinander; die Gruppierung kommt aus `dev` (lib/sentence.js). Jedes Stück mit `de` ist
// ein echter Knopf mit 44 px Tippfläche. Angezeigt wird IMMER das `de` des Tokens selbst,
// nie ein Nachschlagen im Wortschatz – छ ist im Satz meist „ist“, als Wort „sechs“.
// sound: Ergebnis von useSound() – Anhören-Knöpfe erscheinen nur mit Ton.
export function TappableSentence({ dev, roman, tokens, size = 26, sound }) {
  const showRoman = useShowRoman()
  const [active, setActive] = useState(null)
  useEffect(() => () => stopSpeaking(), []) // Satz verschwindet → nicht weiterreden
  const groups = sentenceGroups(dev, tokens)
  const tk = active !== null ? (tokens || [])[active] : null
  let n = -1 // laufender Token-Index über alle Gruppen

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', columnGap: '0.3em', alignItems: 'center' }}>
          {groups.map((g, gi) => (
            // Eine Schreibgruppe bricht nie um – sonst risse तपाईं|लाई auseinander.
            <span key={gi} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {g.map(t => {
                n++
                const i = n
                const text = <span style={{ fontFamily: NE, fontSize: size, lineHeight: 1.3 }}>{t.t}</span>
                if (!t.de) return <span key={i} style={{ color: C.sumi }}>{text}</span>
                const on = active === i
                return (
                  <button key={i} onClick={() => setActive(on ? null : i)} aria-pressed={on}
                    aria-label={`${t.t} – Bedeutung zeigen`}
                    style={{
                      minHeight: 44, padding: '0 1px', margin: 0, border: 'none', borderRadius: 4, cursor: 'pointer',
                      background: on ? `${C.shu}22` : 'transparent', color: C.sumi,
                      boxShadow: `inset 0 -2px 0 ${on ? C.shu : `${C.indigo}55`}`,
                    }}>{text}</button>
                )
              })}
            </span>
          ))}
        </div>
        {/* Ganzer Satz: nur mit Ton, ohne Ton gar nichts (der Hinweis steht je Screen einmal). */}
        {sound && dev && <ListenButton text={dev} sound={sound} quiet label="Satz" />}
      </div>
      {showRoman && roman && <div style={{ fontSize: 14, color: C.textMuted, marginTop: 2 }}>{roman}</div>}

      {tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: '8px 10px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontFamily: NE, color: C.sumi }}>{tk.t}</span>
              {tk.r && <span style={{ fontSize: 14, color: C.indigo, fontWeight: 600 }}>{tk.r}</span>}
            </div>
            <div style={{ fontSize: 14, color: C.sumi, lineHeight: 1.45 }}>{tk.de}</div>
          </div>
          {sound && <ListenButton key={active} text={tk.t} sound={sound} quiet label="" />}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6 }}>💡 Tippe ein Wort im Satz für seine Bedeutung</div>
      )}
    </div>
  )
}
