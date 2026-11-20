import { useState, useRef, useEffect, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { Btn, Stars } from '../../components/ui.jsx'
import { XP_PER_KANA, XP_PER_WORD, XP_PER_GRAMMAR, XP_PER_CHAPTER } from '../../lib/xp.js'
import { NE_PATH, GOAL_ID } from '../data/path.js'
import { SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR_BY_ID, grammarKey } from '../data/grammar.js'
import { CHAPTER_BY_ID } from '../data/chapters.js'
import { DIALOG_BY_ID } from '../data/dialogs.js'
import { nfc } from '../lib/deva.js'
import { isNodeDone, nodeMeta, stationStates } from '../lib/path.js'
import { wordKey } from '../lib/learned.js'
import { chapterSrsKeys } from '../lib/chapters.js'
import { bookDialog } from '../lib/dialog.js'
import { buildBackdrop, roadPath, startFlags, STATE_PALETTE } from '../lib/scene.jsx'
import { ScriptLesson, WordBlock, GrammarLesson } from './players.jsx'
import { ChapterPlayer, ChapterDiary, GoalScreen } from './chapter.jsx'
import { DialogPlay } from './dialog.jsx'

// ─── Reise: die Yatra-Karte ───────────────────────────────────────────────────
// Gegenstück zu src/screens/reise.jsx: Stationen entlang eines gewundenen Wegs, je
// Welt eine eigene Nepal-Kulisse. Zustände wie dort: erledigt (grün, ✓, antippbar zum
// Wiederholen) / offen (rot, START) / gesperrt (🔒). Freischalt-Regel in lib/path.js.
// Stationen ohne Daten (nodeMeta null, Typen späterer Tasks) fallen still weg. Erledigte
// Kapitel tragen ihre Sterne (bester Stand, 1–3) unter dem Namen; Szenen stehen mit ihrem
// Emoji (🚕, 🍛 …) im Weg; die letzte Station ist das Ziel 🏔. Über der Karte öffnet
// „Deine Geschichte“ das Tagebuch (ab dem ersten Kapitel).

// Kulisse je Welt: steht an der Welt-Überschrift in data/path.js (theme): tal → huegel →
// see → berge; unter dem Ziel laufen die Berge noch ein Stück weiter.

export default function ReiseScreen() {
  const { progress, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, bumpChapterStars, scheduleNew } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const [diary, setDiary] = useState(false)
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

  if (active?.type === 'word') {
    const block = WORD_BLOCKS.find(b => b.id === active.id)
    const already = active.wasDone // Stand beim Öffnen, Begründung wie oben
    const close = () => setActive(null)
    const n = block.words.length
    return (
      <WordBlock block={block} alreadyDone={already} onClose={close}
        onComplete={() => {
          // Wie bei der Schrift: Einplanen idempotent und immer, XP und Zähler `words`
          // (Wochenrückblick) nur beim ersten Abschluss.
          scheduleNew(block.words.map(w => wordKey(w.dev))) // Wort-Karten: 'w:' + Text
          if (!already) completeWordBlock(block.id, n * XP_PER_WORD, { words: n })
        }} />
    )
  }

  if (active?.type === 'grammar') {
    const topic = GRAMMAR_BY_ID[active.id]
    const already = active.wasDone // Stand beim Öffnen, Begründung wie oben
    const close = () => setActive(null)
    return (
      <GrammarLesson topic={topic} alreadyDone={already} onClose={close}
        onComplete={() => {
          // Wie bei Schrift und Wörtern: die Themen-Karte ('g:' + id) idempotent und
          // immer einplanen, XP und Zähler `grammar` nur beim ersten Abschluss.
          scheduleNew([grammarKey(topic.id)])
          if (!already) completeGrammar(topic.id, XP_PER_GRAMMAR, { grammar: 1 })
        }} />
    )
  }

  if (active?.type === 'chapter') {
    const chapter = CHAPTER_BY_ID[active.id]
    const already = active.wasDone // Stand beim Öffnen, Begründung wie oben
    const close = () => setActive(null)
    return (
      <ChapterPlayer chapter={chapter} alreadyDone={already} onClose={close}
        onComplete={stars => {
          // Die neuen Wörter idempotent und immer einplanen; Sterne immer melden –
          // bumpChapterStars behält den besten Stand, eine Wiederholung kann sie nur heben.
          // XP und Zähler (chapters, words) nur beim ersten Abschluss.
          const keys = chapterSrsKeys(chapter)
          scheduleNew(keys)
          bumpChapterStars({ [chapter.id]: stars })
          if (!already) completeChapter(chapter.id, XP_PER_CHAPTER, { chapters: 1, words: keys.length })
        }} />
    )
  }

  if (active?.type === 'dialog') {
    const dialog = DIALOG_BY_ID[active.id]
    const already = active.wasDone // Stand beim Öffnen, Begründung wie oben
    // Szene: gebucht wie im Üben (bookDialog in lib/dialog.js – XP und Zähler `scenes` nur
    // beim ersten Abschluss, nichts einplanen).
    return (
      <DialogPlay dialog={dialog} alreadyDone={already} onClose={() => setActive(null)}
        onComplete={() => bookDialog(completeDialog, dialog, already)} />
    )
  }

  if (active?.type === 'goal') {
    const already = active.wasDone
    // Das Ziel bucht sich einmal als 'goal' in completedChapters (lib/path.js), ohne XP und
    // ohne Zähler – es ist kein Kapitel.
    return <GoalScreen alreadyDone={already} onClose={() => setActive(null)}
      onComplete={() => { if (!already) completeChapter(GOAL_ID, 0, {}) }} />
  }

  if (diary) return <ChapterDiary onClose={() => setDiary(false)} />
  const chaptersDone = (progress.completedChapters || []).some(id => CHAPTER_BY_ID[id])

  // ─ Layout der Karte ─
  const R = 30, AMP = 86, CENTER = 160, XPAT = [0, 1, 0, -1]
  const bands = [], headers = [], laid = []
  let y = 22, ni = 0, bandStart = null, bandIdx = -1, bandTheme = 'tal'
  NE_PATH.forEach((it, i) => {
    if (it.world) {
      if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx, theme: bandTheme })
      bandIdx++
      bandStart = y
      bandTheme = it.theme || 'berge'
      headers.push({ y, world: it.world, sub: it.sub })
      y += 62 // Devanagari-Zeilen sind höher als japanische – mehr Luft bis zur Station
      return
    }
    if (states[i] === null) return // Station ohne Daten: still auslassen
    laid.push({ node: it, meta: nodeMeta(it), state: states[i], x: CENTER + AMP * XPAT[ni % 4], y: y + R })
    y += 2 * R + 56
    ni++
  })
  if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx, theme: bandTheme })
  // Unter dem Ziel noch ein Stück Berge, damit die letzte Station nicht am Rand klebt.
  const TAIL = 60
  bands.push({ top: y, bottom: y + TAIL, idx: bands.length, theme: 'berge' })
  const trackH = y + TAIL
  const road = roadPath(laid.map(n => [n.x, n.y]))

  const backdropH = trackH + 80
  const backdrop = buildBackdrop(bands.map((b, i) => ({
    ...b,
    top: i === 0 ? 0 : b.top,
    bottom: i === bands.length - 1 ? backdropH : b.bottom,
  })))

  const current = currentIdx >= 0 ? NE_PATH[currentIdx] : null

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 4 }}>
          Deine Reise <span style={{ fontFamily: NE }}>यात्रा</span>
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
          Station für Station durch Nepal – zuerst die Schrift (Devanagari, Zeichen für Zeichen), dann Wörter und Grammatik im Wechsel.
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
        {chaptersDone && (
          <Btn variant="ghost" onClick={() => setDiary(true)} style={{ width: '100%', minHeight: 44, marginTop: 10, fontSize: 14 }}>
            📖 Deine Geschichte nachlesen
          </Btn>
        )}
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
            const stars = n.node.type === 'chapter' && n.state === 'done' ? progress.chapterStars?.[n.node.id] || 0 : 0
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
                {stars > 0 && (
                  <div style={{ marginTop: 1 }}>
                    <span style={{ display: 'inline-block', background: 'rgba(239,235,224,0.88)', borderRadius: 8, padding: '0 5px' }}>
                      <Stars count={stars} max={3} size={11} />
                    </span>
                  </div>
                )}
                {n.state === 'current' && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: C.shu, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>START</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
