import { C, NE } from '../../theme.js'
import { Card } from '../../components/ui.jsx'
import { GRAMMAR_NEW_WORDS } from '../data/grammar.js'
import { TappableSentence, useShowRoman } from './text.jsx'
import { ListenButton } from './sound.jsx'
import { explainParts } from '../lib/grammarText.js'

// ─── Grammatik-Bausteine: Erklärung und Beispiele ─────────────────────────────
// Eine Fassung für die Lektion (screens/players.jsx, GrammarLesson) und das Nachlesen in
// der Bibliothek (screens/lernen.jsx) – beide sollen dasselbe zeigen.

// Kopf: Zeichen des Themas groß, Titel, Kurzbeschreibung.
export function GrammarHead({ topic }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 48, fontFamily: NE, color: C.shu, lineHeight: 1.3 }}>{topic.glyph}</div>
      <h2 style={{ fontSize: 20, color: C.indigo, margin: '4px 0 4px' }}>{topic.title}</h2>
      <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.45 }}>{topic.summary}</div>
    </div>
  )
}

// Erklärung: jeder body-Abschnitt, wie er geschrieben ist; die neuen Wörter des Themas als
// kleine Liste (Devanagari, Umschrift nach Schalter, Bedeutung, Anhören nur mit Ton) nur,
// wenn der body sie nicht schon in einem eigenen Abschnitt erklärt – Regel in lib/grammarText.js.
export function GrammarExplain({ topic, sound }) {
  const showRoman = useShowRoman()
  const { sections, list: fresh } = explainParts(topic.body, GRAMMAR_NEW_WORDS[topic.id])
  return (
    <>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {s.h && <div style={{ fontSize: 12, color: C.shu, fontWeight: 700, marginBottom: 2 }}>{s.h}</div>}
          <p style={{ fontSize: 15, color: C.sumi, lineHeight: 1.6, margin: 0 }}>{s.text}</p>
        </div>
      ))}
      {fresh.length > 0 && (
        <Card style={{ marginTop: 4, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>NEUE WÖRTER</div>
          {fresh.map(w => (
            <div key={w.dev} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderTop: `1px solid ${C.washiDark}` }}>
              <span style={{ flexShrink: 0, maxWidth: '50%' }}>
                <span style={{ display: 'block', fontFamily: NE, fontSize: 22, color: C.sumi, lineHeight: 1.35 }}>{w.dev}</span>
                {showRoman && <span style={{ display: 'block', fontSize: 12, color: C.indigo }}>{w.roman}</span>}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.sumi, lineHeight: 1.4 }}>{w.de}</span>
              {sound && <ListenButton text={w.dev} sound={sound} quiet label="" />}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

// Beispiele: je Satz antippbar (Bedeutung jedes Stücks), darunter die Übersetzung.
// Anhören nur mit Ton (TappableSentence blendet den Knopf sonst aus).
// hint: Tipp-Hinweis unter dem ersten Satz.
export function GrammarExamples({ topic, sound, hint = false }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {topic.examples.map((x, i) => (
        <Card key={i} style={{ padding: '12px 14px' }}>
          <TappableSentence dev={x.dev} roman={x.roman} tokens={x.tokens} size={24} sound={sound} hint={hint && i === 0} />
          <div style={{ fontSize: 15, color: C.indigo, marginTop: 6, lineHeight: 1.45 }}>„{x.de}“</div>
        </Card>
      ))}
    </div>
  )
}
