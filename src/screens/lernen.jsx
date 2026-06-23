import { useState } from 'react'
import { C, JP } from '../theme.js'
import { KANA_DATA, HIRA_ROWS, KATA_ROWS } from '../data/kana.js'
import { PHRASES } from '../data/phrases.js'
import { WORD_BLOCKS, WORD_BY_KANJI } from '../data/words.js'
import { GRAMMAR, GRAMMAR_SEQ } from '../data/grammar.js'
import { speak } from '../lib/speech.js'
import { Card, LibSheet } from '../components/ui.jsx'
import { StrokeDisplay, DrawCanvas } from '../components/kana.jsx'
import { WordDetail, TappableSentence } from '../components/japanese.jsx'

function PhraseList() {
  const cats = [...new Set(PHRASES.map(p => p.cat))]
  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        {PHRASES.length} nützliche Sätze für deine Reise – nach Situation sortiert. 🔊 zum Anhören.
      </p>
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{cat.toUpperCase()}</div>
          {PHRASES.filter(p => p.cat === cat).map((p, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: JP, fontSize: 17, marginBottom: 2 }}>{p.jp}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
                  <div style={{ fontSize: 13, color: C.indigo, marginTop: 2 }}>{p.de}</div>
                </div>
                <button onClick={() => speak(p.jp)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>🔊</button>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

// Kana-Tabelle zum Nachschlagen — tippen öffnet Strichfolge, Lesung und Schreibfeld.
function KanaLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const d = KANA_DATA[sel]
    return (
      <LibSheet title={`${sel}${d?.romaji ? ` · ${d.romaji}` : ''}`} onClose={() => setSel(null)}>
        <StrokeDisplay char={sel} />
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <button onClick={() => speak(sel)}
            style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo }}>
            🔊 Anhören
          </button>
          {d?.tip && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>💡 {d.tip}</div>}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, margin: '8px 0' }}>SELBST SCHREIBEN</div>
        <DrawCanvas char={sel} />
      </LibSheet>
    )
  }

  const Grid = ({ rows }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6 }}>
          {row.map(ch => (
            <button key={ch} onClick={() => setSel(ch)}
              style={{
                flex: 1, aspectRatio: '1 / 1', minWidth: 0, background: '#fff',
                border: `1px solid ${C.washiDark}`, borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
              <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{ch}</span>
              <span style={{ fontSize: 9, color: C.textMuted }}>{KANA_DATA[ch]?.romaji || ''}</span>
            </button>
          ))}
          {row.length < 5 && Array.from({ length: 5 - row.length }).map((_, k) => <div key={`s${k}`} style={{ flex: 1 }} />)}
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Kana – tippe ein Zeichen für Strichfolge, Lesung und Schreibfeld.
      </p>
      <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>HIRAGANA</div>
      <Grid rows={HIRA_ROWS} />
      <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, margin: '18px 0 8px' }}>KATAKANA</div>
      <Grid rows={KATA_ROWS} />
    </div>
  )
}

// Alle Wörter zum Nachschlagen, nach Thema gruppiert.
function WordLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const w = WORD_BY_KANJI[sel]
    return (
      <LibSheet title={`${w.kanji} · ${w.de}`} onClose={() => setSel(null)}>
        <WordDetail word={w} />
      </LibSheet>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Wörter mit Kanji, Lesung, Bedeutung und Beispielsatz.
      </p>
      {WORD_BLOCKS.map(block => (
        <div key={block.id} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            {block.theme} {block.title.toUpperCase()}
          </div>
          {block.words.map(w => (
            <button key={w.kanji} onClick={() => setSel(w.kanji)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
                boxShadow: 'var(--shadow-card)', padding: '10px 14px', marginBottom: 8, cursor: 'pointer',
              }}>
              <span style={{ fontSize: 30, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{w.kanji}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontFamily: JP, color: C.indigo }}>{w.kana} · {w.romaji}</span>
                <span style={{ display: 'block', fontSize: 13, color: C.sumi }}>{w.de}</span>
              </span>
              <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// Alle Grammatik-Themen als read-only Erklärung (Beispiele antippbar, keine Übungen/XP).
function GrammarLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const topic = GRAMMAR.find(t => t.id === sel)
    return (
      <LibSheet title={`${topic.glyph} · ${topic.title}`} onClose={() => setSel(null)}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
          <h2 style={{ fontSize: 20, color: C.indigo, marginTop: 4 }}>{topic.title}</h2>
        </div>
        {topic.body.map((s, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            {s.h && <div style={{ fontSize: 12, color: C.shu, fontWeight: 700, marginBottom: 2 }}>{s.h}</div>}
            <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}
        <Card style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELE</div>
          {topic.examples.map((ex, i) => <TappableSentence key={i} ex={ex} />)}
        </Card>
      </LibSheet>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Grammatik-Themen zum Nachlesen – mit Beispielen zum Antippen.
      </p>
      {GRAMMAR_SEQ.map(t => (
        <button key={t.id} onClick={() => setSel(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
            background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
            boxShadow: 'var(--shadow-card)', padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
          }}>
          <span style={{
            width: 42, height: 42, flexShrink: 0, borderRadius: 10, background: `${C.shu}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontFamily: JP, color: C.shu,
          }}>{t.glyph}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.sumi }}>{t.title}</span>
            <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>{t.summary}</span>
          </span>
          <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
        </button>
      ))}
    </div>
  )
}


// „Lernen" ist jetzt eine reine Nachschlage-Bibliothek: alles frei einsehbar,
// keine Sperren, kein XP. Gelernt/freigeschaltet wird auf der Reise.
export default function LernenScreen() {
  const [view, setView] = useState('kana') // 'kana' | 'woerter' | 'grammatik' | 'phrasen'

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
        Bibliothek
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Alles zum Nachschlagen – ohne Sperren, ohne Druck. Gelernt und freigeschaltet wird auf der Reise.
      </p>

      {/* Umschalter Kana / Wörter / Grammatik / Phrasen */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {[['kana', 'あ Kana'], ['woerter', '語 Wörter'], ['grammatik', '文 Grammatik'], ['phrasen', '会 Phrasen']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{
              flex: 1, padding: '8px 2px', borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${view === id ? C.shu : C.washiDark}`,
              background: view === id ? `${C.shu}15` : '#fff',
              color: view === id ? C.shu : C.textMuted, fontWeight: 600, fontSize: 12,
            }}>{label}</button>
        ))}
      </div>

      {view === 'kana' && <KanaLibrary />}
      {view === 'woerter' && <WordLibrary />}
      {view === 'grammatik' && <GrammarLibrary />}
      {view === 'phrasen' && <PhraseList />}
    </div>
  )
}

