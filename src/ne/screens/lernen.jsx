import { useState, useEffect, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { Btn, LibSheet } from '../../components/ui.jsx'
import { SCRIPT_DATA, SCRIPT_LESSONS, SCRIPT_NOTES } from '../data/script.js'
import { KIND_LABEL, alone } from '../lib/learned.js'
import { useSound, ListenButton, NO_SOUND_HINT } from '../components/sound.jsx'
import { stopSpeaking } from '../lib/speech.js'

// ─── Lernen (Yatra): Bibliothek zum Nachschlagen ──────────────────────────────
// Gegenstück zur Kana-Tafel in src/screens/lernen.jsx: alle Devanagari-Zeichen nach
// Lektion, frei einsehbar (keine Sperren, kein XP – gelernt wird auf der Reise). Antippen
// öffnet ein Blatt mit großer Form, Umschrift, Merkhilfe, Ton (falls vorhanden) und den
// Laut-Hinweisen, in denen das Zeichen vorkommt. Später kommen Wörter und Sätze dazu.

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

export default function LernenScreen() {
  const { progress } = useContext(ProgressCtx)
  const sound = useSound()
  const [sel, setSel] = useState(null)        // Zeichen
  const [notesOpen, setNotesOpen] = useState(false)
  const done = progress.completedLessons || []

  // Die Blätter liegen als fixes Overlay ÜBER der Tafel, statt sie zu ersetzen: so bleibt
  // die Tafel gerendert und die Scroll-Position nach dem Schließen dieselbe.
  return (
    <div style={{ padding: '16px 16px 0' }}>
      {sel && <CharSheet ch={sel} sound={sound} onClose={() => setSel(null)} />}
      {notesOpen && <NotesSheet onClose={() => setNotesOpen(false)} />}
      <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 4 }}>
        Bibliothek <span style={{ fontFamily: NE }}>पढाइ</span>
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
        Alle Devanagari-Zeichen zum Nachschlagen – ohne Sperren, ohne Druck. Tippe ein Zeichen für
        Umschrift, Merkhilfe{sound ? ' und Ton' : ''}. Gelernt wird auf der Reise.
      </p>
      {/* Ohne Ton steht der Hinweis hier einmal ausgeschrieben; im Blatt nur 🔇. */}
      {sound === false && (
        <div style={{ background: `${C.indigo}12`, borderRadius: 10, padding: 12, fontSize: 13, color: C.indigo, lineHeight: 1.5, marginBottom: 14 }}>
          🔇 {NO_SOUND_HINT}
        </div>
      )}

      <button onClick={() => setNotesOpen(true)} style={{
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
                <button key={ch} onClick={() => setSel(ch)} aria-label={`${alone(ch)}, Umschrift ${d.roman} – Details öffnen`}
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
    </div>
  )
}
