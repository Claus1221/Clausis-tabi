import { useState, useContext } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { computeStats, dueKana } from '../useProgress.js'
import { LESSONS } from '../data/kana.js'
import { ALL_WORDS, learnedWordKanji } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { CHAPTERS } from '../data/chapters.js'
import { totalKanaCount, completedKanaList, completedKanaCount } from '../lib/kanaStats.js'
import { SRS_STAGES } from '../lib/srs.js'
import { periodBuckets } from '../lib/progress.js'
import { Card } from '../components/ui.jsx'

export default function FortschrittScreen({ onReview }) {
  const { progress, reset } = useContext(ProgressCtx)
  const [period, setPeriod] = useState('woche')
  const stats = computeStats(progress)
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0

  const completed = progress.completedLessons || []
  const kanaDone = completedKanaCount(completed)
  const kanaTotal = totalKanaCount()
  const wordsLearned = learnedWordKanji(progress.completedWordBlocks || []).length
  const grammarDone = (progress.completedGrammar || []).length
  const chaptersDone = (progress.completedChapters || []).length

  // XP-zum-nächsten-Level (1000 XP pro Level).
  const xpInLevel = stats.totalXp % 1000
  const xpToNext = 1000 - xpInLevel

  // Zeitraum-Chart.
  const buckets = periodBuckets(progress.xpByDate || {}, period)
  const periodTotal = buckets.reduce((a, b) => a + b.xp, 0)
  const maxXP = Math.max(1, ...buckets.map(b => b.xp))

  // Vokabeln nach Kenntnisstand. Nur das Kern-Curriculum (gelernte Kana + Wort-
  // Kanji) zählt – Kapitel-Vokabel-Karten aus der Kapitel-Übung bleiben außen vor,
  // damit diese Statistik dieselbe Vokabel-Menge zeigt wie die Wiederholungs-Stapel.
  const curriculumSet = new Set([...completedKanaList(completed), ...learnedWordKanji(progress.completedWordBlocks || [])])
  const srsVals = Object.entries(progress.srs || {}).filter(([k]) => curriculumSet.has(k)).map(([, v]) => v)
  const stageCounts = SRS_STAGES.map(s => ({ ...s, n: srsVals.filter(s.test).length }))
  const vocabTotal = srsVals.length
  const due = dueKana(progress, [...completedKanaList(completed), ...learnedWordKanji(progress.completedWordBlocks || [])]).length

  // Fertigkeiten mit Aufschlüsselung (so kommt der Prozentwert zustande).
  const skills = [
    { label: 'Lesen (Kana)', value: pct(kanaDone, kanaTotal), detail: `${kanaDone} / ${kanaTotal} Zeichen gelernt`, color: C.shu },
    { label: 'Wortschatz', value: pct(wordsLearned, ALL_WORDS.length), detail: `${wordsLearned} / ${ALL_WORDS.length} Wörter gelernt`, color: '#8B6914' },
    { label: 'Grammatik', value: pct(grammarDone, GRAMMAR.length), detail: `${grammarDone} / ${GRAMMAR.length} Themen verstanden`, color: '#7B3FA0' },
    { label: 'Geschichte', value: pct(chaptersDone, CHAPTERS.length), detail: `${chaptersDone} / ${CHAPTERS.length} Kapitel erlebt`, color: C.matcha },
  ]

  const hiraDone = LESSONS.filter(l => l.script === 'Hiragana').every(l => completed.includes(l.id))
  const kataDone = LESSONS.filter(l => l.script === 'Katakana').every(l => completed.includes(l.id))
  // Restdistanz nur dort, wo sie sich eindeutig aus vorhandenen Werten ergibt
  // (Streak-Stufen, Level) – sonst bleibt es beim reinen 🔒 (keine geratenen Zahlen).
  const achievements = [
    { icon: '✍️', label: 'Erste Lektion', sub: 'Die Reise beginnt', earned: completed.length >= 1 },
    { icon: '🔥', label: '3-Tage-Streak', sub: 'Drei Tage in Folge', earned: stats.streak >= 3, remaining: 3 - stats.streak, unit: 'Tag' },
    { icon: '🔥', label: '7-Tage-Streak', sub: 'Eine ganze Woche dran', earned: stats.streak >= 7, remaining: 7 - stats.streak, unit: 'Tag' },
    { icon: '🈂️', label: 'Alle Hiragana', sub: '46 Hiragana gelernt', earned: hiraDone },
    { icon: '🈁', label: 'Alle Katakana', sub: '46 Katakana gelernt', earned: kataDone },
    { icon: '🗣️', label: 'Erste Wörter', sub: 'Ersten Wort-Block geschafft', earned: (progress.completedWordBlocks || []).length >= 1 },
    { icon: '📐', label: 'Grammatik-Start', sub: 'Erstes Thema verstanden', earned: grammarDone >= 1 },
    { icon: '📖', label: 'Erstes Kapitel', sub: 'Erste Episode erlebt', earned: chaptersDone >= 1 },
    { icon: '🎓', label: 'Vokabel gemeistert', sub: 'Ein Wort fest im Kopf', earned: stageCounts[4].n >= 1 },
    { icon: '⭐', label: 'Level 5', sub: '5000 XP gesammelt', earned: stats.level >= 5, remaining: stats.level >= 5 ? 0 : (5 - stats.level) * 1000 - xpInLevel, unit: 'XP' },
    { icon: '🗻', label: 'Gipfel erreicht', sub: 'Alle Kapitel abgeschlossen', earned: chaptersDone >= CHAPTERS.length },
  ]
  const earnedCount = achievements.filter(a => a.earned).length

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

      {/* Errungenschaften */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ERRUNGENSCHAFTEN · {earnedCount}/{achievements.length}
        </div>
        {achievements.map((a, i) => {
          // Restdistanz nur anzeigen, wenn sauber berechenbar und positiv – sonst
          // bleibt es beim neutralen „Noch nicht erreicht" (keine geratenen Zahlen).
          const hint = a.earned ? a.sub
            : a.remaining > 0 ? `noch ${a.remaining} ${a.unit}${a.remaining === 1 ? '' : a.unit === 'Tag' ? 'e' : ''}`
            : 'Noch nicht erreicht'
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: i < achievements.length - 1 ? `1px solid ${C.washiDark}` : 'none', opacity: a.earned ? 1 : 0.45 }}>
              <div style={{ fontSize: 22, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.earned ? a.icon : '🔒'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{hint}</div>
              </div>
            </div>
          )
        })}
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

