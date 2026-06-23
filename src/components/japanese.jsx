import { useState, useContext } from 'react'
import { C, JP } from '../theme.js'
import { KANJI_ORIGIN } from '../data/kanjiOrigin.js'
import { speak, copyText } from '../lib/speech.js'
import { lexTokens } from '../lib/dialog.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { Card, Btn } from './ui.jsx'

// Merkhilfe/Notiz zu einer aufgedeckten SRS-Karte. Wird unter der Karte gezeigt
// und kann dort bearbeitet werden; gespeichert landet sie unter srs[key].note und
// taucht beim nächsten Aufdecken wieder mit auf. itemKey = der SRS-Schlüssel
// (Zeichen/Wort). Wird nur im aufgedeckten Zustand gerendert → frischer State je
// Karte durch Mount/Unmount, kein Reset nötig.
export function CardNote({ itemKey }) {
  const { progress, saveNote } = useContext(ProgressCtx)
  const saved = (progress.srs && progress.srs[itemKey] && progress.srs[itemKey].note) || ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(saved)

  const save = () => { saveNote(itemKey, draft); setEditing(false) }
  const cancel = () => { setDraft(saved); setEditing(false) }

  if (editing) {
    return (
      <div style={{ marginBottom: 16 }}>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus rows={2}
          placeholder="Merkhilfe, Eselsbrücke …"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14,
            borderRadius: 10, border: `2px solid ${C.washiDark}`, fontFamily: 'inherit', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Btn onClick={save} variant="secondary" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}>Speichern</Btn>
          <Btn onClick={cancel} variant="ghost" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}>Abbrechen</Btn>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <button onClick={() => setEditing(true)} title="Merkhilfe bearbeiten"
        style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 16, padding: '10px 12px',
          background: `${C.matcha}12`, border: `1px solid ${C.matcha}40`, borderRadius: 10,
          color: C.sumi, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.matcha }}>💡 Merkhilfe</span>
        <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{saved}</div>
      </button>
    )
  }

  return (
    <button onClick={() => setEditing(true)}
      style={{ display: 'block', marginBottom: 16, background: 'none', border: 'none',
        color: C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
      + Merkhilfe hinzufügen
    </button>
  )
}

export function KanjiOrigin({ jp }) {
  const chars = [...new Set([...(jp || '')])].filter(c => KANJI_ORIGIN[c])
  if (!chars.length) return null
  const badge = (text, fill) => (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: fill, border: `1px solid ${fill}66`, background: `${fill}14`, borderRadius: 5, padding: '1px 6px' }}>{text}</span>
  )
  return (
    <div style={{ background: `${C.matcha}10`, border: `1px solid ${C.matcha}40`, borderRadius: 10, padding: 12, textAlign: 'left' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.matcha, marginBottom: 8 }}>KANJI-HERKUNFT</div>
      {chars.map((c, ci) => {
        const o = KANJI_ORIGIN[c]
        return (
          <div key={c} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: ci ? 10 : 0, marginTop: ci ? 10 : 0, borderTop: ci ? `1px solid ${C.matcha}33` : 'none' }}>
            <div style={{ fontSize: 34, fontFamily: JP, color: C.sumi, lineHeight: 1, minWidth: 40, textAlign: 'center' }}>{c}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                {badge(o.type, C.indigo)}
                {o.radical && badge('eigenes Radikal', C.shu)}
              </div>
              {o.parts && (
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 3 }}>
                  {o.parts.map((p, i) => (
                    <span key={i}>{i > 0 && <span style={{ color: C.matcha }}> ＋ </span>}
                      <span style={{ fontFamily: JP, fontSize: 16, color: C.sumi }}>{p.c}</span> <span>({p.de})</span>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: C.sumi }}>{o.note}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WordDetail({ word }) {
  const [copied, setCopied] = useState(false)
  const [activeTok, setActiveTok] = useState(null)

  // „Aufbau"-Zeile aus den antippbaren Tokens (für die Zwischenablage).
  const aufbau = word.ex.tokens
    .filter(t => t.de)
    .map(t => `${t.t}${t.r && t.r !== t.t ? ` (${t.r})` : ''} = ${t.de} [${t.b}]`)
    .join(' · ')

  const origin = [...new Set([...word.kanji])].filter(c => KANJI_ORIGIN[c])
    .map(c => { const o = KANJI_ORIGIN[c]; return `${c}: ${o.type}${o.radical ? ', eigenes Radikal' : ''}${o.parts ? ' (' + o.parts.map(p => `${p.c} ${p.de}`).join(', ') + ')' : ''} – ${o.note}` })
    .join('\n')

  const clip =
    `${word.kanji}（${word.kana} / ${word.romaji}）— ${word.de}\n\n` +
    `Beispielsatz:\n${word.ex.jp}\n${word.ex.kana}\n„${word.ex.de}"\n` +
    `Aufbau: ${aufbau}` +
    (origin ? `\n\nKanji-Herkunft:\n${origin}` : '')

  const handleCopy = async () => {
    const ok = await copyText(clip)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  const tk = activeTok != null ? word.ex.tokens[activeTok] : null

  return (
    <div>
      {/* Kanji + Lesung + Übersetzung */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{word.kanji}</div>
        <button onClick={() => speak(word.kana)}
          style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo, margin: '10px 0 6px' }}>
          🔊 Anhören
        </button>
        <div style={{ fontSize: 22, fontFamily: JP, color: C.indigo }}>{word.kana}
          <span style={{ fontSize: 14, color: C.textMuted, fontFamily: 'inherit' }}> · {word.romaji}</span>
        </div>
        <div style={{ fontSize: 18, color: C.sumi, marginTop: 4 }}>{word.de}</div>
      </div>

      {/* Beispielsatz (größer, antippbare Wörter) */}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>BEISPIELSATZ</span>
          <button onClick={() => speak(word.ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🔊</button>
        </div>

        <div style={{ fontSize: 32, fontFamily: JP, lineHeight: 1.5, marginBottom: 8 }}>
          {word.ex.tokens.map((t, i) => {
            if (!t.de) return <span key={i}>{t.t}</span>
            const active = activeTok === i
            return (
              <span key={i} onClick={() => setActiveTok(active ? null : i)}
                style={{
                  cursor: 'pointer', borderRadius: 4, padding: '0 1px',
                  borderBottom: `2px dotted ${active ? C.shu : `${C.indigo}66`}`,
                  background: active ? `${C.shu}22` : 'transparent',
                }}>{t.t}</span>
            )
          })}
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>{word.ex.kana}</div>
        <div style={{ fontSize: 16, color: C.indigo, marginBottom: 12 }}>„{word.ex.de}"</div>

        {/* Tooltip / Detailbox zum angetippten Wort */}
        {tk ? (
          <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
              {tk.r && tk.r !== tk.t && <span style={{ fontSize: 14, color: C.textMuted }}>{tk.r}</span>}
            </div>
            <div style={{ fontSize: 15, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic' }}>
            💡 Tippe ein Wort im Satz für Bedeutung & Aufbau
          </div>
        )}
      </Card>

      {/* Woher kommen die Kanji des Wortes? */}
      <div style={{ marginTop: 12 }}>
        <KanjiOrigin jp={word.kanji} />
      </div>

      {/* In die Zwischenablage kopieren (z. B. um eine KI zu fragen) */}
      <button onClick={handleCopy}
        style={{
          width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 8,
          border: `1px solid ${copied ? C.matcha : C.washiDark}`,
          background: copied ? `${C.matcha}15` : '#fff',
          color: copied ? C.matcha : C.indigo, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
        {copied ? '✓ Kopiert' : '📋 Wort & Satz kopieren'}
      </button>
    </div>
  )
}

// Beispielsatz mit antippbaren Wörtern (Bedeutung + Aufbau als Tooltip).
export function TappableSentence({ ex }) {
  const [active, setActive] = useState(null)
  const tokens = ex.tokens || null
  const tk = tokens && active != null ? tokens[active] : null

  return (
    <div style={{ padding: '6px 0', borderBottom: `1px solid ${C.washiDark}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 26, fontFamily: JP, lineHeight: 1.5 }}>
          {tokens ? tokens.map((t, i) => {
            if (!t.de) return <span key={i}>{t.t}</span>
            const on = active === i
            return (
              <span key={i} onClick={() => setActive(on ? null : i)}
                style={{
                  cursor: 'pointer', borderRadius: 4, padding: '0 1px',
                  borderBottom: `2px dotted ${on ? C.shu : `${C.indigo}66`}`,
                  background: on ? `${C.shu}22` : 'transparent',
                }}>{t.t}</span>
            )
          }) : ex.jp}
        </div>
        <button onClick={() => speak(ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>🔊</button>
      </div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{ex.kana}</div>
      <div style={{ fontSize: 15, color: C.indigo }}>„{ex.de}"</div>

      {tokens && (tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
            {tk.r && tk.r !== tk.t && <span style={{ fontSize: 13, color: C.textMuted }}>{tk.r}</span>}
          </div>
          <div style={{ fontSize: 14, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6 }}>
          💡 Tippe ein Wort für Bedeutung & Aufbau
        </div>
      ))}
    </div>
  )
}

// Eine japanische Zeile, bei der jedes bekannte Wort antippbar ist und seine
// Bedeutung + den grammatischen Aufbau zeigt (gleiches Muster wie StoryLine).
export function TappableJp({ text, size = 19, hint = false }) {
  const tokens = lexTokens(text)
  const [active, setActive] = useState(null)
  const tk = active != null ? tokens[active] : null
  return (
    <div>
      <div style={{ fontSize: size, fontFamily: JP, color: C.sumi, lineHeight: 1.85 }}>
        {tokens.map((t, i) => {
          if (!t.de) return <span key={i} style={{ whiteSpace: 'pre' }}>{t.t}</span>
          const on = active === i
          return (
            <span key={i} role="button" onClick={() => setActive(on ? null : i)}
              style={{ cursor: 'pointer', borderRadius: 4, padding: '0 1px',
                borderBottom: `2px dotted ${on ? C.shu : `${C.indigo}66`}`,
                background: on ? `${C.shu}22` : 'transparent' }}>{t.t}</span>
          )
        })}
      </div>
      {tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 18, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
            {tk.r && <span style={{ fontSize: 12, color: C.textMuted }}>{tk.r}</span>}
          </div>
          <div style={{ fontSize: 14, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
          {tk.b && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>}
        </div>
      ) : hint ? (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6 }}>💡 Tippe ein Wort für Bedeutung & Form</div>
      ) : null}
    </div>
  )
}

// Antippbare Story-Zeile mit Furigana: Wort tippen → Lesung, Bedeutung, Aufbau.
// `tr` = direkte deutsche Übersetzung, die unter dem Satz steht.
export function StoryLine({ tokens, tr }) {
  const [active, setActive] = useState(null)
  const tk = active != null ? tokens[active] : null
  const plain = tokens.map(t => t.t).join('')
  return (
    <div>
      <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 2.1, color: C.sumi }}>
        {tokens.map((t, i) => {
          const hasKanji = /[一-龯々]/.test(t.t)
          const inner = hasKanji && t.r ? <ruby>{t.t}<rt style={{ fontSize: '0.5em', color: '#6B6660', fontWeight: 400 }}>{t.r}</rt></ruby> : t.t
          if (!t.de) return <span key={i}>{inner}</span>
          const on = active === i
          return (
            <span key={i} onClick={() => setActive(on ? null : i)}
              style={{ cursor: 'pointer', borderRadius: 4, padding: '0 1px', borderBottom: `2px dotted ${on ? C.shu : `${C.indigo}66`}`, background: on ? `${C.shu}22` : 'transparent' }}>
              {inner}
            </span>
          )
        })}
        <button onClick={() => speak(plain)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginLeft: 6, verticalAlign: 'middle' }}>🔊</button>
      </div>
      {tr && <div style={{ fontSize: 15, color: C.indigo, marginTop: 6 }}>„{tr}"</div>}
      {tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 10, textAlign: 'left', maxWidth: 300, margin: '10px auto 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
            {tk.r && <span style={{ fontSize: 13, color: C.textMuted }}>{tk.r}</span>}
          </div>
          <div style={{ fontSize: 15, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
          {tk.b && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 8 }}>💡 Tippe ein Wort für Bedeutung & Aufbau</div>
      )}
    </div>
  )
}
