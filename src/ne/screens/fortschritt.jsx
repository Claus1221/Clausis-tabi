import { useState, useContext } from 'react'
import { C, NE } from '../../theme.js'
import { ProgressCtx } from '../../state/ProgressContext.js'
import { computeStats } from '../../useProgress.js'
import { periodBuckets, weekSummary } from '../../lib/progress.js'
import { Card } from '../../components/ui.jsx'
import { SCRIPT_DATA, SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { learnedItems, dueItems, srsEntry, itemInfo } from '../lib/learned.js'
import { SRS_STAGES } from '../lib/srs.js'

// ─── Fortschritt (Yatra) ──────────────────────────────────────────────────────
// Gegenstück zu src/screens/fortschritt.jsx mit dem, was es im Nepali-Kurs heute gibt:
// XP/Level/Streak, Woche, Level-Balken, XP-Verlauf, Kenntnisstufen der Karten mit
// „fällig“-Sprung und der Stand von Schrift, Wörtern und Grammatik. Kapitel-Sterne und Abzeichen folgen, wenn
// es Kapitel gibt. Zurücksetzen liegt in den Einstellungen (nur dort, eindeutig Nepali).

const label = { fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1 }

export default function FortschrittScreen({ onReview }) {
  const { progress } = useContext(ProgressCtx)
  const [period, setPeriod] = useState('woche')
  const stats = computeStats(progress)

  const xpInLevel = stats.totalXp % 1000
  const xpToNext = 1000 - xpInLevel

  const buckets = periodBuckets(progress.xpByDate || {}, period)
  const periodTotal = buckets.reduce((a, b) => a + b.xp, 0)
  const maxXP = Math.max(1, ...buckets.map(b => b.xp))

  // Der Verlaufszähler heißt `kana` (s. reise.jsx) – hier sind es Schriftzeichen.
  const week = weekSummary(progress)

  // Kenntnisstufen über alle eingeplanten Karten des Lernstands – dieselbe Menge wie
  // die Stapel im Üben-Tab, damit „fällig“ hier und dort gleich ist.
  const learned = learnedItems(progress)
  const srsVals = learned.map(k => srsEntry(progress, k)).filter(e => e && e.due != null)
  const stageCounts = SRS_STAGES.map(s => ({ ...s, n: srsVals.filter(s.test).length }))
  const cardTotal = srsVals.length
  const due = dueItems(progress).length

  // learned enthält Zeichen, Wörter (w:) und Grammatik (g:) – gezählt wird je Art über itemInfo.
  const charsTotal = Object.keys(SCRIPT_DATA).length
  const charsLearned = learned.filter(k => itemInfo(k).kind === 'script').length
  const lessonsDone = SCRIPT_LESSONS.filter(l => (progress.completedLessons || []).includes(l.id)).length
  const pct = Math.round(charsLearned / charsTotal * 100)
  const wordsTotal = WORD_BLOCKS.reduce((n, b) => n + b.words.length, 0)
  const wordsLearned = learned.filter(k => itemInfo(k).kind === 'word').length
  const blocksDone = WORD_BLOCKS.filter(b => (progress.completedWordBlocks || []).includes(b.id)).length
  const wordPct = Math.round(wordsLearned / Math.max(1, wordsTotal) * 100)
  // Grammatik: eine Karte je Thema (g:-Schlüssel) – eigene Art, nicht unter Wörtern.
  const grammarTotal = GRAMMAR.length
  const grammarLearned = learned.filter(k => itemInfo(k).kind === 'grammar').length
  const grammarPct = Math.round(grammarLearned / Math.max(1, grammarTotal) * 100)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, color: C.indigo, marginBottom: 16 }}>
        Fortschritt <span style={{ fontFamily: NE }}>प्रगति</span>
      </h2>

      {/* XP / Level / Streak */}
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

      {/* Diese Woche */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ ...label, marginBottom: 10 }}>DIESE WOCHE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
          {[
            [week.xp, 'XP'],
            [week.days, week.days === 1 ? 'aktiver Tag' : 'aktive Tage'],
            [week.kana, week.kana === 1 ? 'neues Zeichen' : 'neue Zeichen'],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 18, fontWeight: 700, color: n > 0 ? C.indigo : C.textMuted }}>{n}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, textAlign: 'center' }}>
          {week.xp === 0 ? 'Noch still diese Woche – die nächste Station wartet. 🌱'
            : week.days >= 5 ? `${week.days} von 7 Tagen aktiv – starke Woche! 🎉`
            : `${week.days} von 7 Tagen aktiv – bleib dran!`}
        </div>
      </Card>

      {/* Level-Balken */}
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

      {/* XP-Verlauf */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <span style={label}>XP-VERLAUF</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['woche', 'Woche'], ['monat', 'Monat'], ['jahr', 'Jahr']].map(([id, l]) => (
              <button key={id} onClick={() => setPeriod(id)} aria-pressed={period === id}
                style={{
                  minHeight: 44, padding: '0 10px', borderRadius: 22, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', background: period === id ? C.shu : C.washiDark, color: period === id ? '#fff' : C.textMuted,
                }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: period === 'jahr' ? 3 : 6, alignItems: 'flex-end', height: 80 }}>
          {buckets.map((d, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: d.xp > 0 ? C.shu : C.washiDark, borderRadius: '3px 3px 0 0', height: `${Math.round(d.xp / maxXP * 60)}px`, minHeight: d.xp > 0 ? 4 : 2 }} />
              <span style={{ fontSize: period === 'jahr' ? 8 : 10, color: C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Summe ({period === 'woche' ? 'Woche' : period === 'monat' ? '4 Wochen' : 'Jahr'}): <strong style={{ color: C.sumi }}>{periodTotal} XP</strong>
        </div>
      </Card>

      {/* Kenntnisstufen */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ ...label, marginBottom: 12 }}>KARTEN NACH KENNTNISSTAND · {cardTotal} gesamt</div>
        {cardTotal === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
            Noch keine Karten im Wiederholungsplan. Jede Station auf der Reise bringt neue.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              {stageCounts.map(s => s.n > 0 && <div key={s.label} style={{ width: `${s.n / cardTotal * 100}%`, background: s.color }} />)}
            </div>
            {stageCounts.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{s.n}</span>
              </div>
            ))}
          </>
        )}
        {learned.length > 0 && (
          <button onClick={onReview} style={{
            width: '100%', minHeight: 44, marginTop: 10, borderRadius: 8,
            border: `1px solid ${due > 0 ? C.shu : C.washiDark}`,
            background: due > 0 ? `${C.shu}12` : '#fff',
            color: due > 0 ? C.shu : C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {due > 0 ? `${due} fällig – jetzt wiederholen →` : 'Wiederholung öffnen →'}
          </button>
        )}
      </Card>

      {/* Schrift */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ ...label, marginBottom: 12 }}>SCHRIFT, WÖRTER, GRAMMATIK</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Devanagari lesen</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: C.shu, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
          {charsLearned} / {charsTotal} Zeichen gelernt · {lessonsDone} / {SCRIPT_LESSONS.length} Stationen
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 4px' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Wörter</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{wordPct}%</span>
        </div>
        <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${wordPct}%`, background: C.matcha, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
          {wordsLearned} / {wordsTotal} Wörter gelernt · {blocksDone} / {WORD_BLOCKS.length} Wortblöcke
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 4px' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Grammatik</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{grammarPct}%</span>
        </div>
        <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${grammarPct}%`, background: C.indigo, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
          {grammarLearned} / {grammarTotal} Themen gelernt
        </div>
      </Card>
    </div>
  )
}
