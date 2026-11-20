import { useState, useEffect, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { Btn, Card, LibSheet } from '../../components/ui.jsx'
import { SCRIPT_DATA, SCRIPT_LESSONS, SCRIPT_NOTES } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { KIND_LABEL, alone } from '../lib/learned.js'
import { useSound, ListenButton, NO_SOUND_HINT } from '../components/sound.jsx'
import { TappableSentence, useShowRoman } from '../components/text.jsx'
import { GrammarHead, GrammarExplain, GrammarExamples } from '../components/grammar.jsx'
import { GRAMMAR_ORDER, GRAMMAR_BY_ID } from '../data/grammar.js'
import { NE_PATH } from '../data/path.js'
import { stationStates } from '../lib/path.js'
import { stopSpeaking } from '../lib/speech.js'

// ─── Lernen (Yatra): Bibliothek zum Nachschlagen ──────────────────────────────
// Gegenstück zu src/screens/lernen.jsx (Kana-Tafel, WordLibrary, GrammarLibrary):
// umschaltbar zwischen Zeichen, Wörtern und Grammatik, alles frei einsehbar (keine
// Sperren, kein XP – gelernt wird auf der Reise; erledigte Lektionen/Blöcke/Themen tragen
// ein ✓). Zeichen antippen öffnet ein Blatt mit großer Form, Umschrift, Merkhilfe, Ton
// (falls vorhanden) und den Laut-Hinweisen, in denen das Zeichen vorkommt; ein Wort öffnet
// Bedeutung, Umschrift und Beispielsatz; ein Thema Erklärung und Beispiele.

const sectionLabel = { fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, margin: '18px 0 8px' }

// Paar-Kachel für Laut-Hinweise: Zeichen + Umschrift (immer – hier IST die Umschrift
// der Inhalt des Vergleichs).
function PairRow({ a, b }) {
  const tile = ch => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{SCRIPT_DATA[ch].shown}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.indigo }}>{SCRIPT_DATA[ch].roman}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '6px 10px' }}>
      {tile(a)}<span style={{ color: C.textMuted, fontSize: 13 }}>oder</span>{tile(b)}
    </div>
  )
}

function NoteBody({ note, only }) {
  const pairs = only ? note.pairs.filter(p => p.includes(only)) : note.pairs
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 16, color: C.indigo, margin: '0 0 6px' }}>{note.title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: C.sumi, margin: '0 0 10px' }}>{note.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {pairs.map(([a, b]) => <PairRow key={a + b} a={a} b={b} />)}
      </div>
    </div>
  )
}

// Ein Zeichen im Detail.
function CharSheet({ ch, sound, onClose }) {
  useEffect(() => () => stopSpeaking(), []) // Blatt zu → nicht weiterreden
  const d = SCRIPT_DATA[ch]
  const lesson = SCRIPT_LESSONS.find(l => l.chars.includes(ch))
  const notes = SCRIPT_NOTES.filter(n => n.pairs.some(p => p.includes(ch)))
  return (
    <LibSheet title={`${alone(ch)} · ${d.roman}`} onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textTransform: 'uppercase' }}>
          {KIND_LABEL[d.kind] || 'Zeichen'}{lesson && <span style={{ color: C.textMuted }}> · {lesson.title}</span>}
        </div>
        <div style={{ fontSize: 96, fontFamily: NE, color: C.sumi, lineHeight: 1.25 }}>{d.shown}</div>
        {d.shown !== ch && (
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            allein: <span style={{ fontFamily: NE, fontSize: 22, color: C.sumi }}>{alone(ch)}</span>
          </div>
        )}
        <div style={{ margin: '8px 0 14px' }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Umschrift</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.indigo }}>{d.roman}</div>
        </div>
        <div style={{ marginBottom: 16 }}><ListenButton text={d.say} sound={sound} /></div>
      </div>
      <div style={{ background: `${C.shu}10`, borderRadius: 10, padding: 12, marginBottom: 18 }}>
        <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.55, margin: 0 }}>💡 <strong style={{ color: C.shu }}>Merkhilfe:</strong> {d.tip}</p>
      </div>
      {notes.length > 0 && (
        <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.shu, marginBottom: 8 }}>LAUT-HINWEIS</div>
            {notes.map(n => <NoteBody key={n.id} note={n} only={ch} />)}
        </>
      )}
      {/* Großer Schließen-Knopf zusätzlich zum kleinen ✕ der LibSheet-Kopfzeile. */}
      <Btn onClick={onClose} variant="ghost" style={{ width: '100%', minHeight: 48 }}>Schließen</Btn>
    </LibSheet>
  )
}

function NotesSheet({ onClose }) {
  return (
    <LibSheet title="Laut-Hinweise" onClose={onClose}>
      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>
        Zwei Unterschiede, die das Deutsche nicht kennt – im Nepali trennen sie Wörter.
      </p>
      {SCRIPT_NOTES.map(n => <NoteBody key={n.id} note={n} />)}
      <Btn onClick={onClose} variant="ghost" style={{ width: '100%', minHeight: 48 }}>Schließen</Btn>
    </LibSheet>
  )
}


// Ein Wort im Detail. Die Umschrift steht hier immer (wer nachschlägt, will sie sehen –
// wie beim Antippen im Satz); der Schalter gilt für die Liste.
function WordSheet({ word, block, sound, onClose }) {
  useEffect(() => () => stopSpeaking(), [])
  return (
    <LibSheet title={`${word.dev} · ${word.roman}`} onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, textTransform: 'uppercase' }}>
          Wort <span style={{ color: C.textMuted }}>· {block.theme} {block.title}</span>
        </div>
        <div style={{ fontSize: 52, fontFamily: NE, color: C.sumi, lineHeight: 1.35 }}>{word.dev}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{word.roman}</div>
        <div style={{ fontSize: 18, color: C.sumi, margin: '6px 0 12px', lineHeight: 1.45 }}>{word.de}</div>
        {sound !== false && <ListenButton text={word.dev} sound={sound} />}
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELSATZ</div>
        <TappableSentence dev={word.ex.dev} roman={word.ex.roman} tokens={word.ex.tokens} sound={sound} />
        <div style={{ fontSize: 15, color: C.indigo, marginTop: 8, lineHeight: 1.45 }}>„{word.ex.de}“</div>
      </Card>
      <Btn onClick={onClose} variant="ghost" style={{ width: '100%', minHeight: 48 }}>Schließen</Btn>
    </LibSheet>
  )
}

// Alle Wörter nach Block, wie die japanische WordLibrary frei einsehbar.
function WordList({ done, onPick }) {
  const showRoman = useShowRoman()
  return WORD_BLOCKS.map(b => (
    <div key={b.id}>
      <div style={sectionLabel}>
        {b.theme} {b.title.toUpperCase()}
        {done.includes(b.id) && <span style={{ color: C.matcha, marginLeft: 6 }}>✓</span>}
      </div>
      {b.words.map(w => (
        <button key={w.dev} onClick={() => onPick(w, b)} aria-label={`${w.dev}, ${w.de} – Details öffnen`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, textAlign: 'left',
            background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
            boxShadow: 'var(--shadow-card)', padding: '8px 14px', marginBottom: 8, cursor: 'pointer',
          }}>
          <span style={{ flexShrink: 0, maxWidth: '50%' }}>
            <span style={{ display: 'block', fontSize: 24, fontFamily: NE, color: C.sumi, lineHeight: 1.35 }}>{w.dev}</span>
            {showRoman && <span style={{ display: 'block', fontSize: 12, color: C.indigo }}>{w.roman}</span>}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.sumi, lineHeight: 1.4 }}>{w.de}</span>
          <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
        </button>
      ))}
    </div>
  ))
}

// Ein Grammatik-Thema zum Nachlesen: Erklärung, neue Wörter, Beispiele zum Antippen –
// ohne Übungen und ohne XP (geübt wird auf der Reise und im Wiederholen).
function GrammarSheet({ topic, sound, onClose }) {
  useEffect(() => () => stopSpeaking(), [])
  return (
    <LibSheet title={topic.title} onClose={onClose}>
      <GrammarHead topic={topic} />
      <GrammarExplain topic={topic} sound={sound} />
      <div style={{ ...sectionLabel, marginTop: 20 }}>BEISPIELE</div>
      <GrammarExamples topic={topic} sound={sound} />
      <Btn onClick={onClose} variant="ghost" style={{ width: '100%', minHeight: 48, marginTop: 18 }}>Schließen</Btn>
    </LibSheet>
  )
}

// Alle Themen in Pfad-Reihenfolge (GRAMMAR_ORDER). Wie die japanische GrammarLibrary eine
// Liste mit Zeichen, Titel und Kurzbeschreibung. Nicht erledigte Themen erkennt man an der
// grauen Zeichen-Kachel (Titel und Beschreibung bleiben voll lesbar); „Kommt noch auf der
// Reise“ steht nur bei Themen, die weder erledigt noch die offene Station sind. Alles lässt
// sich aufschlagen – die Bibliothek hat keine Sperren; erledigte tragen ein ✓.
// current = ID des Themas, das auf der Reise gerade offen ist (oder null).
function GrammarList({ done, current, onPick }) {
  return GRAMMAR_ORDER.map(id => GRAMMAR_BY_ID[id]).filter(Boolean).map(t => {
    const isDone = done.includes(t.id)
    const later = !isDone && t.id !== current
    return (
      <button key={t.id} onClick={() => onPick(t)}
        aria-label={`${t.title}${isDone ? ' (gelernt)' : later ? ' (kommt noch auf der Reise)' : ' (als Nächstes auf der Reise)'} – öffnen`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, textAlign: 'left',
          background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
          boxShadow: 'var(--shadow-card)', padding: '10px 14px', marginBottom: 8, cursor: 'pointer',
        }}>
        <span style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 10, background: isDone ? `${C.shu}12` : C.washiDark,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontFamily: NE, color: isDone ? C.shu : C.textMuted, lineHeight: 1,
        }}>{t.glyph}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.sumi }}>
            {t.title}{isDone && <span style={{ color: C.matcha, marginLeft: 6 }}>✓</span>}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{later ? `Kommt noch auf der Reise · ${t.summary}` : t.summary}</span>
        </span>
        <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
      </button>
    )
  })
}

// Zeichentafel nach Lektion samt Eintrag „Laut-Hinweise“ (Ansicht „Zeichen“).
function CharTable({ done, onPick, onNotes }) {
  return (
    <>
      <button onClick={onNotes} style={{
        width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
        boxShadow: 'var(--shadow-card)', padding: '10px 14px', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 22 }}>👄</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.sumi }}>Laut-Hinweise</span>
          <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>{SCRIPT_NOTES.map(n => n.title).join(' · ')}</span>
        </span>
        <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
      </button>

      {SCRIPT_LESSONS.map(l => (
        <div key={l.id}>
          <div style={sectionLabel}>
            {l.title.toUpperCase()}
            {done.includes(l.id) && <span style={{ color: C.matcha, marginLeft: 6 }}>✓</span>}
            <span style={{ color: C.textMuted, fontWeight: 500, letterSpacing: 0, marginLeft: 6 }}>{l.sub}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 }}>
            {l.chars.map(ch => {
              const d = SCRIPT_DATA[ch]
              return (
                // Lesung steht immer da (unabhängig von showRoman): sie ist der Inhalt des
                // Schriftlernens, wie in Lektionen und auf der Kartenrückseite.
                <button key={ch} onClick={() => onPick(ch)} aria-label={`${alone(ch)}, Umschrift ${d.roman} – Details öffnen`}
                  style={{
                    minHeight: 60, minWidth: 0, background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 8,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px',
                  }}>
                  <span style={{ fontSize: 24, fontFamily: NE, color: C.sumi, lineHeight: 1.3 }}>{d.shown}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.roman}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export default function LernenScreen() {
  const { progress } = useContext(ProgressCtx)
  const sound = useSound()
  const [view, setView] = useState('zeichen') // 'zeichen' | 'woerter' | 'grammatik'
  const [sel, setSel] = useState(null)        // Zeichen
  const [selWord, setSelWord] = useState(null) // { word, block }
  const [selTopic, setSelTopic] = useState(null) // Grammatik-Thema
  const [notesOpen, setNotesOpen] = useState(false)
  const done = progress.completedLessons || []
  const doneBlocks = progress.completedWordBlocks || []
  const doneGrammar = progress.completedGrammar || []
  // Offene Station der Reise – ist sie ein Grammatik-Thema, steht es nicht als „kommt noch“ da.
  const openNode = NE_PATH[stationStates(NE_PATH, progress).indexOf('current')]
  const currentGrammar = openNode?.type === 'grammar' ? openNode.id : null

  // Die Blätter liegen als fixes Overlay ÜBER der Tafel, statt sie zu ersetzen: so bleibt
  // die Tafel gerendert und die Scroll-Position nach dem Schließen dieselbe.
  return (
    <div style={{ padding: '16px 16px 0' }}>
      {sel && <CharSheet ch={sel} sound={sound} onClose={() => setSel(null)} />}
      {notesOpen && <NotesSheet onClose={() => setNotesOpen(false)} />}
      {selWord && <WordSheet word={selWord.word} block={selWord.block} sound={sound} onClose={() => setSelWord(null)} />}
      {selTopic && <GrammarSheet topic={selTopic} sound={sound} onClose={() => setSelTopic(null)} />}
      <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 4 }}>
        Bibliothek <span style={{ fontFamily: NE }}>पढाइ</span>
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
        Alle Zeichen, Wörter und Grammatik-Themen zum Nachschlagen – ohne Sperren, ohne Druck. Tippe
        etwas an für Umschrift, Bedeutung{sound ? ' und Ton' : ''}. Gelernt wird auf der Reise.
      </p>
      {/* Ohne Ton steht der Hinweis hier einmal ausgeschrieben; im Blatt nur 🔇. */}
      {sound === false && (
        <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5, marginBottom: 14 }}>
          🔇 {NO_SOUND_HINT}
        </div>
      )}

      {/* Umschalter wie in der japanischen Bibliothek (dort Kana/Wörter/…). */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['zeichen', 'अ Zeichen'], ['woerter', 'Wörter'], ['grammatik', 'Grammatik']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${view === id ? C.shu : C.washiDark}`,
              background: view === id ? `${C.shu}15` : '#fff',
              color: view === id ? C.shu : C.textMuted, fontWeight: 600, fontSize: 13,
            }}><span style={{ fontFamily: NE }}>{label}</span></button>
        ))}
      </div>

      {view === 'woerter' && <WordList done={doneBlocks} onPick={(word, block) => setSelWord({ word, block })} />}
      {view === 'zeichen' && <CharTable done={done} onPick={setSel} onNotes={() => setNotesOpen(true)} />}
      {view === 'grammatik' && <GrammarList done={doneGrammar} current={currentGrammar} onPick={setSelTopic} />}
    </div>
  )
}
