import { useState, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { computeStats, dueKana } from '../useProgress.js'
import { LESSONS } from '../data/kana.js'
import { ALL_WORDS, learnedWordKanji } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { CHAPTERS, CHAPTER_WORD } from '../data/chapters.js'
import { DIALOGS } from '../data/dialogs.js'
import { PATH } from '../data/path.js'
import { totalKanaCount, completedKanaList, completedKanaCount } from '../lib/kanaStats.js'
import { SRS_STAGES } from '../lib/srs.js'
import { periodBuckets, weekSummary } from '../lib/progress.js'
import { chapterSrsKeys, learnedChapterWords } from '../lib/chapters.js'
import { isNodeDone } from '../lib/path.js'
import { Card } from '../components/ui.jsx'

export default function FortschrittScreen({ onReview }) {
  const { progress, reset } = useContext(ProgressCtx)
  const [period, setPeriod] = useState('woche')
  const [selBadge, setSelBadge] = useState(null)  // angetipptes Abzeichen (Detailzeile)
  const stats = computeStats(progress)
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0

  const completed = progress.completedLessons || []
  const kanaDone = completedKanaCount(completed)
  const kanaTotal = totalKanaCount()
  const grammarDone = (progress.completedGrammar || []).length
  const chaptersDone = (progress.completedChapters || []).length

  // Wortschatz = Wort-Blöcke UND Kapitel-Vokabeln (eindeutig, 11 Wörter kommen
  // in beiden vor). Nur die Blöcke zu zählen würde den Großteil unterschlagen –
  // die Kapitel führen weit mehr Wörter ein als die Blöcke.
  const wordsKnown = new Set([
    ...learnedWordKanji(progress.completedWordBlocks || []),
    ...(progress.completedChapters || []).flatMap(id => { const c = CHAPTERS.find(x => x.id === id); return c ? chapterSrsKeys(c) : [] }),
  ]).size
  const wordsTotal = new Set([...ALL_WORDS.map(w => w.kanji), ...Object.keys(CHAPTER_WORD)]).size

  // XP-zum-nächsten-Level (1000 XP pro Level).
  const xpInLevel = stats.totalXp % 1000
  const xpToNext = 1000 - xpInLevel

  // Zeitraum-Chart.
  const buckets = periodBuckets(progress.xpByDate || {}, period)
  const periodTotal = buckets.reduce((a, b) => a + b.xp, 0)
  const maxXP = Math.max(1, ...buckets.map(b => b.xp))

  // Vokabeln nach Kenntnisstand: gelernte Kana + Wortblock-Wörter + eingeführte
  // Kapitel-Vokabeln – exakt dieselbe Menge wie die Wiederholungs-Stapel im
  // Üben-Tab. Nachträglich ergänzte, noch nie eingeführte Kapitel-Wörter bleiben
  // draußen (sie warten im Kapitel-Sheet auf ihre 🆕-Einführung).
  const reviewPool = [...completedKanaList(completed), ...learnedWordKanji(progress.completedWordBlocks || []), ...learnedChapterWords(progress)]
  const curriculumSet = new Set(reviewPool)
  const srsVals = Object.entries(progress.srs || {}).filter(([k]) => curriculumSet.has(k)).map(([, v]) => v)
  const stageCounts = SRS_STAGES.map(s => ({ ...s, n: srsVals.filter(s.test).length }))
  const vocabTotal = srsVals.length
  const due = dueKana(progress, reviewPool).length

  // Fertigkeiten mit Aufschlüsselung (so kommt der Prozentwert zustande).
  const skills = [
    { label: 'Lesen (Kana)', value: pct(kanaDone, kanaTotal), detail: `${kanaDone} / ${kanaTotal} Zeichen gelernt`, color: C.shu },
    { label: 'Wortschatz', value: pct(wordsKnown, wordsTotal), detail: `${wordsKnown} / ${wordsTotal} Wörter gelernt`, color: '#8B6914' },
    { label: 'Grammatik', value: pct(grammarDone, GRAMMAR.length), detail: `${grammarDone} / ${GRAMMAR.length} Themen verstanden`, color: '#7B3FA0' },
    { label: 'Geschichte', value: pct(chaptersDone, CHAPTERS.length), detail: `${chaptersDone} / ${CHAPTERS.length} Kapitel erlebt`, color: C.matcha },
  ]

  // Wochen-Rückblick aus dem Tages-Journal (kana/words/chapters/scenes je Datum).
  const week = weekSummary(progress)

  // ─ Meilenstein-Abzeichen: jedes mit messbarem Stand (now/goal) ─
  const hiraNow = LESSONS.filter(l => l.script === 'Hiragana' && completed.includes(l.id)).reduce((a, l) => a + l.kana.length, 0)
  const kataNow = LESSONS.filter(l => l.script === 'Katakana' && completed.includes(l.id)).reduce((a, l) => a + l.kana.length, 0)
  const dialogsDone = (progress.completedDialogs || []).length
  const dialogsTotal = DIALOGS.filter(d => !d.section).length
  const fiveStar = Object.values(progress.chapterStars || {}).filter(v => v >= 5).length
  const goalPos = PATH.findIndex(n => n.type === 'goal')
  const preGoal = PATH.slice(0, goalPos).filter(n => n.type && n.type !== 'goal')
  const preGoalDone = preGoal.filter(n => isNodeDone(n, progress)).length
  const contentNodes = PATH.filter(n => n.type && n.type !== 'goal')
  const nodesDone = contentNodes.filter(n => isNodeDone(n, progress)).length

  const badges = [
    { icon: '👣', label: 'Erste Schritte', sub: 'Erste Lektion geschafft', now: Math.min(completed.length, 1), goal: 1 },
    { icon: '🈴', label: 'Hiragana-Meister', sub: 'Alle 46 Hiragana gelernt', now: hiraNow, goal: 46 },
    { icon: '🈚', label: 'Katakana-Meister', sub: 'Alle 46 Katakana gelernt', now: kataNow, goal: 46 },
    { icon: '🔥', label: '3-Tage-Serie', sub: 'Drei Tage in Folge gelernt', now: Math.min(stats.streak, 3), goal: 3 },
    { icon: '🎯', label: '7-Tage-Serie', sub: 'Eine ganze Woche dran', now: Math.min(stats.streak, 7), goal: 7 },
    { icon: '🌸', label: 'Wortsammler', sub: '25 Wörter gelernt', now: Math.min(wordsKnown, 25), goal: 25 },
    { icon: '💮', label: 'Wortschatz-Profi', sub: '100 Wörter gelernt', now: Math.min(wordsKnown, 100), goal: 100 },
    { icon: '💬', label: 'Erstes Gespräch', sub: 'Erste Szene gemeistert', now: Math.min(dialogsDone, 1), goal: 1 },
    { icon: '🎭', label: 'Gesprächs-Profi', sub: 'Alle Gesprächs-Szenen gemeistert', now: dialogsDone, goal: dialogsTotal },
    { icon: '📐', label: 'Grammatik-Kenner', sub: 'Alle Grammatik-Themen verstanden', now: grammarDone, goal: GRAMMAR.length },
    { icon: '🎓', label: 'Fest im Kopf', sub: 'Erste Vokabel „Gemeistert"', now: Math.min(stageCounts[4].n, 1), goal: 1 },
    { icon: '⭐', label: 'Sternenhimmel', sub: 'Drei Kapitel mit 5 Sternen', now: Math.min(fiveStar, 3), goal: 3 },
    { icon: '🗻', label: 'Gipfel erreicht', sub: 'Alle Stationen bis zum Fuji', now: preGoalDone, goal: preGoal.length },
    { icon: '📖', label: 'Geschichte komplett', sub: 'Alle Kapitel erlebt', now: chaptersDone, goal: CHAPTERS.length },
    { icon: '🏆', label: 'Level 5', sub: '5000 XP gesammelt', now: Math.min(stats.level, 5), goal: 5 },
    { icon: '🏯', label: 'Reise vollendet', sub: 'Jede Station der Reise gemeistert', now: nodesDone, goal: contentNodes.length },
  ].map(b => ({ ...b, earned: b.now >= b.goal }))
  const earnedCount = badges.filter(b => b.earned).length

  const handleReset = () => {
    if (window.confirm('Wirklich den gesamten Fortschritt auf 0 zurücksetzen? Das kann nicht rückgängig gemacht werden.')) reset()
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 16 }}>
        Fortschritt
      </h2>

      {/* Gesamt-XP / Level / Streak */}
      <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.shu }}>{stats.totalXp}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>XP gesamt</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{stats.level}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Level</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.matcha }}>{stats.streak} 🔥</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Streak</div>
        </div>
      </Card>

      {/* Wochen-Rückblick: was diese Woche konkret gelernt wurde */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontWeight: 600, letterSpacing: 1 }}>
          DIESE WOCHE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
          {[
            [week.xp, 'XP'],
            [week.days, week.days === 1 ? 'aktiver Tag' : 'aktive Tage'],
            [week.words, week.words === 1 ? 'neues Wort' : 'neue Wörter'],
            [week.kana, 'neue Kana'],
            [week.chapters, 'Kapitel'],
            [week.scenes, week.scenes === 1 ? 'Gespräch' : 'Gespräche'],
          ].map(([n, label]) => (
            <div key={label}>
              <div style={{ fontSize: 18, fontWeight: 700, color: n > 0 ? C.indigo : C.textMuted }}>{n}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, textAlign: 'center' }}>
          {week.xp === 0
            ? 'Noch still diese Woche – die nächste Station wartet. 🌱'
            : week.days >= 5 ? `${week.days} von 7 Tagen aktiv – starke Woche! 🎉`
            : `${week.days} von 7 Tagen aktiv – bleib dran!`}
        </div>
      </Card>

      {/* XP bis zum nächsten Level */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, letterSpacing: 1 }}>LEVEL {stats.level} → {stats.level + 1}</span>
          <span>{xpInLevel} / 1000 XP</span>
        </div>
        <div style={{ height: 10, background: C.washiDark, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpInLevel / 10}%`, background: C.indigo, borderRadius: 5, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Noch <strong style={{ color: C.sumi }}>{xpToNext} XP</strong> bis Level {stats.level + 1}</div>
      </Card>

      {/* XP-Chart mit Zeitraum-Auswahl */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1 }}>XP-VERLAUF</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['woche', 'Woche'], ['monat', 'Monat'], ['jahr', 'Jahr']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', background: period === id ? C.shu : C.washiDark, color: period === id ? '#fff' : C.textMuted }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: period === 'jahr' ? 3 : 6, alignItems: 'flex-end', height: 80 }}>
          {buckets.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: d.xp > 0 ? C.shu : C.washiDark, borderRadius: '3px 3px 0 0', height: `${Math.round(d.xp / maxXP * 60)}px`, minHeight: d.xp > 0 ? 4 : 2 }} />
              <span style={{ fontSize: period === 'jahr' ? 8 : 10, color: C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Summe ({period === 'woche' ? 'Woche' : period === 'monat' ? '4 Wochen' : 'Jahr'}): <strong style={{ color: C.sumi }}>{periodTotal} XP</strong>
        </div>
      </Card>

      {/* Vokabeln nach Kenntnisstand */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          VOKABELN NACH KENNTNISSTAND · {vocabTotal} gesamt
        </div>
        {vocabTotal === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted }}>Noch keine Vokabeln im Wiederholungsplan. Lerne Kana und Wörter auf der Reise.</p>
        ) : (
          <>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              {stageCounts.map(s => s.n > 0 && <div key={s.label} style={{ width: `${s.n / vocabTotal * 100}%`, background: s.color }} />)}
            </div>
            {stageCounts.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{s.n}</span>
              </div>
            ))}
            <button onClick={onReview} style={{
              width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 8,
              border: `1px solid ${due > 0 ? C.shu : C.washiDark}`,
              background: due > 0 ? `${C.shu}12` : '#fff',
              color: due > 0 ? C.shu : C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {due > 0 ? `${due} fällig – jetzt wiederholen →` : 'Wiederholung öffnen →'}
            </button>
          </>
        )}
      </Card>

      {/* Fertigkeiten mit Aufschlüsselung */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          FERTIGKEITEN
        </div>
        {skills.map(s => (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{s.value}%</span>
            </div>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{s.detail}</div>
          </div>
        ))}
      </Card>

      {/* Meilenstein-Abzeichen: Raster mit messbarem Stand je Abzeichen */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ABZEICHEN · {earnedCount}/{badges.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {badges.map((b, i) => (
            <button key={i} onClick={() => setSelBadge(selBadge === i ? null : i)}
              style={{
                textAlign: 'center', padding: '10px 2px 8px', borderRadius: 10, cursor: 'pointer',
                background: b.earned ? `${C.matcha}14` : '#fff',
                border: `1px solid ${selBadge === i ? C.indigo : b.earned ? `${C.matcha}55` : C.washiDark}`,
                opacity: b.earned ? 1 : 0.55,
              }}>
              <div style={{ fontSize: 24, filter: b.earned ? 'none' : 'grayscale(1)', lineHeight: 1.2 }}>{b.icon}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: C.sumi, marginTop: 3, lineHeight: 1.25 }}>{b.label}</div>
              <div style={{ fontSize: 9, color: b.earned ? C.matcha : C.textMuted, marginTop: 2, fontWeight: 600 }}>
                {b.earned ? '✓ geschafft' : `${b.now} / ${b.goal}`}
              </div>
            </button>
          ))}
        </div>
        {selBadge != null && (
          <p style={{ fontSize: 12, color: C.sumi, marginTop: 10, marginBottom: 0, textAlign: 'center' }}>
            {badges[selBadge].icon} <strong>{badges[selBadge].label}</strong> – {badges[selBadge].sub}
          </p>
        )}
      </Card>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button onClick={handleReset}
          style={{ background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: C.textMuted, cursor: 'pointer' }}>
          Fortschritt zurücksetzen
        </button>
      </div>
    </div>
  )
}

