import { useContext, useEffect, useRef, useState } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { GRAMMAR } from '../data/grammar.js'
import { Card, Btn, Emoji } from '../components/ui.jsx'
import { Avatar } from '../components/avatar.jsx'
import { TappableJp } from '../components/japanese.jsx'
import { UebenHead } from '../components/ueben.jsx'
import { speak, stopSpeaking, onSpeechState } from '../lib/speech.js'
import { SPEECH_INPUT_SUPPORTED, startListening, stopListening } from '../lib/listen.js'
import { chatTurn } from '../lib/claude.js'
import {
  OPENER_CUE, FALLBACK_CLOSING, learnedVocabList,
  buildTalkSystem, buildHintSystem, buildDebriefSystem, buildDebriefPrompt,
} from '../lib/talk.js'
import { XP_PER_TALK, XP_PER_TALK_TURN } from '../lib/xp.js'

// ─── Freies Gespräch ─────────────────────────────────────────────────────────
// Oberste Stufe der Gesprächs-Treppe (siehe DIDAKTIK.md): Der Gesprächspartner
// ist nicht abgespielt, sondern wird von der KI gespielt – er reagiert wirklich
// auf das Gesagte und hat eine geheime Wendung im Ärmel, die das auswendig
// gelernte Skript unbrauchbar macht.
//
// Ablauf als Zustandsmaschine, damit sich das wie ein Gespräch anfühlt und
// nicht wie ein Formular:
//
//   intro → [NPC spricht] → [Mikro hört zu] → [KI denkt] → [NPC spricht] → …
//         → ending (Ziel erreicht oder Zug-Deckel) → debrief
//
// Das Mikrofon öffnet von selbst, sobald der Gesprächspartner ausgeredet hat
// (lib/speech.js löst das Versprechen aus speak() erst dann auf) – niemand
// tippt mitten im Gespräch auf Knöpfe.
//
// Grundsatz überall: Es bleibt nie etwas hängen. Kein Netz, keine Stimme, keine
// Spracherkennung, kaputtes Antwortformat – für jeden Fall gibt es einen Weg
// weiter (Tastatur-Eingabe, Wiederholen, sauberer Abbruch mit Nachbesprechung).

// Wie lange die Antwort der KI dauern darf, bevor die UI von „denkt" auf
// „das dauert" umschaltet (nur Anzeige – der Aufruf läuft weiter).
const SLOW_MS = 4500

// `audible` heißt: es läuft gerade wirklich Ton. Nur dann darf sich der Mund
// bewegen – zwischen „der NPC ist dran" und dem ersten Ton liegen je nach
// Stimme einige hundert Millisekunden, in denen stummes Mundklappen
// unecht aussähe (besonders mit der Cloud-Stimme, die erst geholt wird).
function moodFor(phase, micOn, audible) {
  if (phase === 'speaking') return audible ? 'speaking' : 'idle'
  if (phase === 'thinking') return 'thinking'
  if (phase === 'listening') return micOn ? 'listening' : 'idle'
  if (phase === 'ending') return 'happy'
  return 'idle'
}

export default function TalkPlay({ talk, alreadyDone, onComplete, onClose }) {
  const { progress, settings, awardXp, addPhrase } = useContext(ProgressCtx)

  // Wortschatz-Grenze und Prompts einmal beim Betreten festzurren: Sie können
  // sich während eines Gesprächs nicht ändern, und ein stabiler System-Prompt
  // ist Voraussetzung fürs Prompt-Caching (siehe lib/claude.js).
  // Der erste Durchgang einer Situation ist die Trockenübung: Vorschläge sind
  // eingeblendet und es kommt nichts Unerwartetes. Ab dem zweiten Mal wird aus
  // der Übung ein echtes Gespräch. (Siehe DIDAKTIK.md, Gesprächs-Treppe.)
  const gentle = !alreadyDone
  const guided = settings.talkGuide === 'immer' ? true
    : settings.talkGuide === 'aus' ? false
    : gentle
  const [prompts] = useState(() => {
    const vocab = learnedVocabList(progress)
    return {
      system: buildTalkSystem(talk, vocab, { guided, withComplication: !gentle }),
      hint: buildHintSystem(talk, vocab),
    }
  })

  const [phase, setPhase] = useState('intro')   // intro|speaking|listening|thinking|error|ending
  const [turns, setTurns] = useState([])        // [{ npc, de, user?, helped? }]
  const [slow, setSlow] = useState(false)
  const [micOn, setMicOn] = useState(false)     // hört die Erkennung gerade zu?
  const [audible, setAudible] = useState(false) // läuft gerade wirklich Ton?
  const [micText, setMicText] = useState('')    // Live-Zwischenstand der Erkennung
  const [micHint, setMicHint] = useState(null)  // Hinweis, wenn nichts verstanden wurde
  const [typed, setTyped] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(!SPEECH_INPUT_SUPPORTED)
  const [hints, setHints] = useState(null)
  const [hintBusy, setHintBusy] = useState(false)
  const [revealJp, setRevealJp] = useState(false)
  const [revealDe, setRevealDe] = useState(false)
  const [netFails, setNetFails] = useState(0)
  const [debrief, setDebrief] = useState(null)
  const [debriefBusy, setDebriefBusy] = useState(false)
  const [adopted, setAdopted] = useState({})
  const [reachedGoal, setReachedGoal] = useState(false)

  // Gesprächsverlauf für die KI (Rollen-Nachrichten) – bewusst als Ref: er
  // wächst innerhalb eines laufenden async-Ablaufs und darf kein Neu-Rendern
  // auslösen. Die Anzeige speist sich aus `turns`.
  const historyRef = useRef([])
  const turnsRef = useRef([])     // Spiegel von `turns` für die async-Abläufe
  const answersRef = useRef(0)     // eigene Züge (für XP, auch bei Abbruch)
  const helpedRef = useRef(false)  // wurde für den aktuellen Zug Hilfe geholt?
  const aliveRef = useRef(true)
  const lastUserRef = useRef(null) // letzte eigene Antwort – für „nochmal senden"
  // Ein Zug ist unterwegs. Die Spracherkennung kann ihr Endergebnis mehrfach
  // melden, und die Tastatur-Eingabe lässt sich doppelt abschicken – ohne
  // diese Sperre entstünden daraus zwei Züge aus einer Antwort.
  const sendingRef = useRef(false)
  // Das Gespräch ist vorbei. Ein Zug, der noch unterwegs ist, während man
  // „Beenden" drückt, darf danach NICHT weiterspielen – sonst wirft seine
  // Antwort die lernende Person zurück in ein Gespräch, das sie beendet hat.
  const endedRef = useRef(false)
  const replayingRef = useRef(false)   // „nochmal hören" läuft gerade

  const scaffold = settings.talkScaffold || 'hoerend'
  const speechOk = SPEECH_INPUT_SUPPORTED && !showKeyboard

  // Mundbewegung an den echten Ton koppeln (lib/speech.js meldet start/end).
  useEffect(() => onSpeechState(state => setAudible(state === 'start')), [])

  // Szene verlassen → Mikro und Sprachausgabe sicher schließen.
  useEffect(() => () => { aliveRef.current = false; stopListening(); stopSpeaking() }, [])

  // „Das dauert"-Hinweis, ohne den Aufruf anzufassen.
  useEffect(() => {
    if (phase !== 'thinking') { setSlow(false); return }
    const id = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(id)
  }, [phase])

  const current = turns[turns.length - 1] || null

  // Verlauf ändern. Zusätzlich zum State läuft eine Ref mit: Die async-Abläufe
  // unten (sprechen, abschließen) lesen den Verlauf, nachdem sie ihn gerade
  // ergänzt haben – der State ihrer Render-Schließung ist da noch der alte, und
  // die Nachbesprechung bekäme ein unvollständiges Gesprächsprotokoll.
  const updateTurns = (fn) => {
    turnsRef.current = fn(turnsRef.current)
    setTurns(turnsRef.current)
  }

  // ─── Gesprächszug ──────────────────────────────────────────────────────────
  // Schickt `userText` an die KI, hängt die Antwort an und spricht sie. Die
  // Historie wird erst NACH einer erfolgreichen Antwort fortgeschrieben – so
  // kann ein fehlgeschlagener Zug einfach wiederholt werden, ohne dass das
  // Gespräch auseinanderfällt.
  const sendTurn = async (userText) => {
    // Jeder unerwartete Fehler landet im Fehler-Zustand statt in einer stillen
    // Endlos-Anzeige: `sendTurn` läuft ohne Aufrufer-`await`, eine geworfene
    // Ausnahme bliebe sonst unbemerkt und das Gespräch für immer in „denkt nach".
    try {
      await runTurn(userText)
    } catch {
      if (!aliveRef.current || endedRef.current) return
      sendingRef.current = false
      setNetFails(n => n + 1)
      setPhase('error')
    }
  }

  const runTurn = async (userText) => {
    setMicHint(null); setHints(null); setRevealJp(false); setRevealDe(false)
    closeMic()
    setPhase('thinking')
    lastUserRef.current = userText

    const nextHistory = [...historyRef.current, { role: 'user', content: userText }]
    let res = await chatTurn({ system: prompts.system, history: nextHistory })
    // Ein stiller zweiter Versuch, wenn das Antwortformat nicht stimmte.
    if (res && !res.json) res = (await chatTurn({ system: prompts.system, history: nextHistory })) || res
    if (!aliveRef.current || endedRef.current) return

    if (!res) {                       // kein Netz / kein Key / Fehlantwort
      sendingRef.current = false      // „Nochmal versuchen" muss wieder gehen
      setNetFails(n => n + 1)
      setPhase('error')
      return
    }
    setNetFails(0)

    // Auf den TYP prüfen, nicht nur auf Wahrheit: liefert das Modell eine Zahl
    // oder ein Objekt statt eines Strings, würde .trim() werfen – und der Zug
    // bliebe für immer in „denkt nach" stecken.
    const str = (v) => (typeof v === 'string' ? v.trim() : '')
    // Hat das Modell das JSON ganz vergessen und stattdessen einfach gesprochen,
    // ist der Rohtext eine brauchbare Zeile – die lieber nehmen als abbrechen.
    // Kam dagegen JSON mit unbrauchbarem `npc`, wäre der Rohtext nur eine
    // JSON-Zeile: dann lieber ehrlich als Fehler behandeln (wiederholbar), statt
    // dem Lernenden geschweifte Klammern vorzulesen.
    const npc = str(res.json?.npc) || (res.json ? '' : res.raw.replace(/^[`\s{"]+|[`\s}"]+$/g, '').slice(0, 120))
    if (!npc) {
      sendingRef.current = false
      setNetFails(n => n + 1)
      setPhase('error')
      return
    }
    const de = str(res.json?.de)
    const done = res.json?.done === true
    // Im geführten Gespräch liefert derselbe Zug schon die Vorschläge mit.
    // Sie zählen NICHT als „mit Hilfe": sie standen ja ungefragt da – die
    // Nachbesprechung soll nur wissen, wann jemand aktiv um Hilfe gebeten hat.
    const offered = guided && Array.isArray(res.json?.hints)
      ? res.json.hints.filter(h => typeof h?.jp === 'string' && h.jp.trim()).slice(0, 2)
      : null
    historyRef.current = [...nextHistory, { role: 'assistant', content: res.raw }]

    const npcCount = turnsRef.current.length + 1
    updateTurns(t => [...t, { npc, de }])
    if (offered?.length) setHints(offered)
    setPhase('speaking')
    await speak(npc)
    if (!aliveRef.current || endedRef.current) return

    if (done) { finish(true); return }
    // Zug-Deckel: Das Gespräch endet höflich statt endlos weiterzulaufen
    // (schützt auch vor unbemerkt wachsenden Kosten).
    if (npcCount >= talk.maxTurns) {
      updateTurns(t => [...t, { ...FALLBACK_CLOSING, de: FALLBACK_CLOSING.de }])
      setPhase('speaking')
      await speak(FALLBACK_CLOSING.npc)
      if (!aliveRef.current || endedRef.current) return
      finish(false)
      return
    }
    openMic()
  }

  // Einen Zug anstoßen, der nicht aus einer eigenen Antwort kommt (Eröffnung,
  // Wiederholung nach Fehler) – mit derselben Sperre gegen Doppelklicks.
  const beginTurn = (text) => {
    if (sendingRef.current) return
    sendingRef.current = true
    sendTurn(text)
  }

  // Eigene Antwort abschicken: am laufenden Zug vermerken und weiterspielen.
  const answer = (text) => {
    const clean = (text || '').trim()
    if (!clean || sendingRef.current) return
    sendingRef.current = true
    answersRef.current += 1
    const helped = helpedRef.current
    helpedRef.current = false
    setTyped('')
    updateTurns(t => t.map((x, i) => (i === t.length - 1 ? { ...x, user: clean, helped } : x)))
    sendTurn(clean)
  }

  // ─── Mikrofon ──────────────────────────────────────────────────────────────
  const openMic = () => {
    sendingRef.current = false   // wieder aufnahmebereit
    setPhase('listening')
    if (!speechOk) return                              // Tastatur-Weg
    setMicHint(null); setMicText(''); setMicOn(true)
    startListening({
      onInterim: setMicText,
      onFinal: (alts) => {
        const heard = (alts[0] || '').trim()
        if (heard) answer(heard)
        else setMicHint('Nichts verstanden – tipp aufs Mikro und sprich nochmal.')
      },
      onError: (err) => {
        setMicHint(
          err === 'not-allowed' ? 'Mikrofon-Zugriff verweigert – bitte in den Browser-Einstellungen für diese Seite erlauben.'
          : err === 'network' ? 'Die Spracherkennung braucht eine Internetverbindung.'
          : err === 'no-speech' ? 'Nichts gehört – tipp aufs Mikro und sprich einfach los.'
          : `Spracherkennung gerade nicht möglich (${err}). Du kannst deine Antwort auch tippen.`,
        )
      },
      onEnd: () => { setMicOn(false); setMicText('') },
    })
  }
  const closeMic = () => { stopListening(); setMicOn(false); setMicText('') }

  // Die aktuelle Zeile noch einmal hören. Das Mikro schließt solange (sonst
  // hörte die Erkennung den Gesprächspartner mit) und öffnet danach wieder.
  // Die Sperre ist nötig, weil ein zweites speak() das erste abbricht UND
  // dessen Versprechen sofort auflöst – ohne sie öffnete ein doppelter Tipp
  // das Mikrofon, während die Wiederholung noch läuft.
  const replay = async () => {
    if (!current || replayingRef.current) return
    replayingRef.current = true
    closeMic()
    setPhase('speaking')
    await speak(current.npc)
    replayingRef.current = false
    if (aliveRef.current && !endedRef.current) openMic()
  }

  // ─── Hilfe („Was soll ich sagen?") ─────────────────────────────────────────
  // Kostet nichts außer der Notiz, dass dieser Zug mit Hilfe lief – die
  // Nachbesprechung weiß das dann. Hilfe holen darf sich nie wie Scheitern
  // anfühlen, sonst wird sie vermieden und die Person bleibt stumm.
  const askHint = async () => {
    if (hintBusy) return
    closeMic()
    setHintBusy(true)
    const res = await chatTurn({
      system: prompts.hint,
      history: [...historyRef.current, { role: 'user', content: '(Was könnte ich jetzt sagen?)' }],
      maxTokens: 200,
    })
    if (!aliveRef.current || endedRef.current) return
    setHintBusy(false)
    const list = Array.isArray(res?.json?.hints) ? res.json.hints.filter(h => h?.jp) : null
    if (!list?.length) { setMicHint('Gerade kein Vorschlag verfügbar – versuch es einfach.'); return }
    helpedRef.current = true
    setHints(list.slice(0, 2))
  }

  // ─── Abschluss & Nachbesprechung ───────────────────────────────────────────
  const finish = async (goalReached) => {
    if (endedRef.current) return   // schon beendet (z. B. Abbruch + laufender Zug)
    endedRef.current = true
    closeMic()
    setReachedGoal(goalReached)
    setPhase('ending')
    // XP: jeder eigene Zug zählt (auch bei Abbruch), das Ziel gibt den Bonus.
    const turnXp = answersRef.current * XP_PER_TALK_TURN
    if (turnXp) awardXp(turnXp)
    if (goalReached && !alreadyDone) onComplete()

    const spoken = turnsWithAnswers()
    if (!spoken.some(t => t.user)) return   // nichts gesagt → keine Nachbesprechung
    setDebriefBusy(true)
    const res = await chatTurn({
      system: buildDebriefSystem(GRAMMAR.filter(g => (progress.completedGrammar || []).includes(g.id))),
      history: [{ role: 'user', content: buildDebriefPrompt(talk, spoken) }],
      maxTokens: 600,
    })
    // Hier NUR auf aliveRef prüfen: `endedRef` ist ab hier immer gesetzt (das
    // Gespräch IST ja beendet) – die Nachbesprechung gehört genau dazu.
    if (!aliveRef.current) return
    setDebriefBusy(false)
    setDebrief(res?.json || null)
  }

  // Der Verlauf in der Form, die die Nachbesprechung erwartet.
  const turnsWithAnswers = () => turnsRef.current.map(t => ({ npc: t.npc, npcDe: t.de, user: t.user, helped: t.helped }))

  const abort = () => { stopSpeaking(); closeMic(); finish(false) }

  const adopt = (w) => {
    addPhrase(w.jp, w.jp, w.de)
    setAdopted(a => ({ ...a, [w.jp]: true }))
  }

  // ─── Ansichten ─────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={talk.title} idx={0} total={0} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '22px 18px' }}>
          <Emoji name={talk.emoji} size={56} />
          <p style={{ fontSize: 11, color: C.textMuted, margin: '12px 0 2px', letterSpacing: 1 }}>DEIN ZIEL</p>
          <p style={{ fontWeight: 600, fontSize: 17, color: C.sumi, margin: 0 }}>{talk.goalDe}</p>
        </Card>
        <Card style={{ marginTop: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>WER DIR GEGENÜBERSTEHT</div>
          <div style={{ fontSize: 14, color: C.sumi, lineHeight: 1.6 }}>{talk.persona}</div>
        </Card>
        <div style={{ background: `${C.indigo}0E`, border: `1px solid ${C.indigo}33`, borderRadius: 12, padding: '12px 14px', marginTop: 12, fontSize: 13, color: C.sumi, lineHeight: 1.6 }}>
          🎙 Hier ist nichts vorgegeben: {speechOk ? 'Sprich frei – das Mikrofon öffnet von selbst, sobald dein Gegenüber ausgeredet hat.' : 'Tippe deine Antworten – Spracheingabe gibt es auf diesem Gerät nicht.'}
          {' '}Weißt du nicht weiter, hilft der Knopf <b>„Was sag ich?"</b>.
        </div>
        {gentle ? (
          <div style={{ background: `${C.matcha}12`, border: `1px solid ${C.matcha}44`, borderRadius: 12, padding: '12px 14px', marginTop: 10, fontSize: 13, color: C.sumi, lineHeight: 1.6 }}>
            🌱 <b>Erster Durchgang – zum Warmwerden.</b> Das Gespräch läuft geradlinig
            {guided ? ', und zu jedem Zug stehen Antwort-Vorschläge da.' : '.'} Ab dem zweiten Mal
            wird es ernst: ohne Vorschläge und mit einer Wendung, die du nicht kennst.
          </div>
        ) : (
          <div style={{ background: `${C.shu}0E`, border: `1px solid ${C.shu}33`, borderRadius: 12, padding: '12px 14px', marginTop: 10, fontSize: 13, color: C.sumi, lineHeight: 1.6 }}>
            🔥 <b>Diesmal echt.</b> Es kommt etwas dazwischen, das du noch nicht kennst –
            hör genau hin und reagier darauf.
          </div>
        )}
        <Btn onClick={() => beginTurn(OPENER_CUE)} style={{ width: '100%', marginTop: 16 }}>Gespräch beginnen →</Btn>
        {!SPEECH_INPUT_SUPPORTED && (
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
            Für freies Sprechen am besten Chrome auf Android verwenden.
          </p>
        )}
      </div>
    )
  }

  if (phase === 'ending') {
    const said = turns.filter(t => t.user).length
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={talk.title} idx={0} total={0} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '22px 18px' }}>
          <div style={{ fontSize: 40 }}>{reachedGoal ? '🎉' : '🙂'}</div>
          <p style={{ fontWeight: 600, fontSize: 18, color: C.sumi, margin: '8px 0 2px' }}>
            {reachedGoal ? 'Ziel erreicht!' : 'Gespräch beendet'}
          </p>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            {said} {said === 1 ? 'eigener Zug' : 'eigene Züge'}
            {reachedGoal && !alreadyDone && ` · +${XP_PER_TALK + said * XP_PER_TALK_TURN} XP`}
            {(!reachedGoal || alreadyDone) && said > 0 && ` · +${said * XP_PER_TALK_TURN} XP`}
          </p>
        </Card>

        {debriefBusy && (
          <Card style={{ marginTop: 12, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
            📝 Die Nachbesprechung wird vorbereitet …
          </Card>
        )}

        {debrief && (
          <>
            {debrief.lobDe && (
              <Card style={{ marginTop: 12, padding: '14px 16px', borderLeft: `4px solid ${C.matcha}` }}>
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>DAS LIEF GUT</div>
                <div style={{ fontSize: 14, color: C.sumi, lineHeight: 1.6 }}>{debrief.lobDe}</div>
              </Card>
            )}
            {!!debrief.korrekturen?.length && (
              <Card style={{ marginTop: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 10 }}>SO KLINGT ES NATÜRLICHER</div>
                {debrief.korrekturen.slice(0, 3).map((k, i) => {
                  // Welche Regel steckt dahinter? Nur zeigen, wenn das Modell ein
                  // Thema benennt, das es wirklich gibt – erfundene IDs kommen vor.
                  const topic = GRAMMAR.find(g => g.id === k.grammatik)
                  return (
                  <div key={i} style={{ marginBottom: i < debrief.korrekturen.length - 1 ? 14 : 0 }}>
                    <div style={{ fontSize: 15, fontFamily: JP, color: C.textMuted, textDecoration: 'line-through' }}>{k.gesagt}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 17, fontFamily: JP, color: C.matcha, fontWeight: 600 }}>{k.besser}</span>
                      <button onClick={() => speak(k.besser)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 0 }} aria-label="Anhören">🔊</button>
                    </div>
                    {k.warumDe && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{k.warumDe}</div>}
                    {topic && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, background: `${C.indigo}0C`, border: `1px solid ${C.indigo}2A`, borderRadius: 8, padding: '7px 10px', marginTop: 6 }}>
                        <span style={{ fontFamily: JP, fontSize: 16, color: C.shu }}>{topic.glyph}</span>
                        <span style={{ flex: 1, fontSize: 12, color: C.sumi, lineHeight: 1.5 }}>
                          <b>{topic.title}</b> · {topic.summary}
                        </span>
                      </div>
                    )}
                  </div>
                  )
                })}
              </Card>
            )}
            {!!debrief.wendungen?.length && (
              <Card style={{ marginTop: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 10 }}>DAS HÄTTE DIR GEHOLFEN</div>
                {debrief.wendungen.slice(0, 2).map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i === 0 && debrief.wendungen.length > 1 ? 10 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontFamily: JP, color: C.sumi }}>{w.jp}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{w.de}</div>
                    </div>
                    <button onClick={() => speak(w.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }} aria-label="Anhören">🔊</button>
                    <button onClick={() => adopt(w)} disabled={adopted[w.jp]}
                      style={{ border: `1.5px solid ${adopted[w.jp] ? C.matcha : C.indigo}`, background: adopted[w.jp] ? `${C.matcha}18` : '#fff',
                        color: adopted[w.jp] ? C.matcha : C.indigo, borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 600,
                        cursor: adopted[w.jp] ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                      {adopted[w.jp] ? '✓ Karte' : '+ Lernkarte'}
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* Gesprächsprotokoll zum Nachlesen – jetzt darf alles sichtbar sein. */}
        <Card style={{ marginTop: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 10 }}>DAS GESPRÄCH · WÖRTER ANTIPPEN</div>
          {turns.map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <TappableJp text={t.npc} size={16} />
              {t.de && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>„{t.de}"</div>}
              {t.user && (
                <div style={{ fontSize: 15, fontFamily: JP, color: C.indigo, marginTop: 4, paddingLeft: 12, borderLeft: `2px solid ${C.indigo}44` }}>
                  {t.user}{t.helped && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'inherit' }}> · mit Hilfe</span>}
                </div>
              )}
            </div>
          ))}
        </Card>

        <Btn onClick={onClose} style={{ width: '100%', marginTop: 16 }}>Fertig →</Btn>
      </div>
    )
  }

  // ─── Laufendes Gespräch ────────────────────────────────────────────────────
  const showJp = scaffold === 'gestuetzt' || revealJp
  const showDe = revealDe && scaffold !== 'immersiv'

  return (
    <div style={{ padding: '20px 20px 28px' }}>
      <UebenHead title={talk.title} idx={Math.max(0, Math.min(turns.length, talk.maxTurns) - 1)} total={talk.maxTurns} onClose={abort} />

      {/* Bühne */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.washiDark}`, marginBottom: 12, background: '#fff' }}>
        <Avatar role={talk.role} place={talk.place} mood={moodFor(phase, micOn, audible)} width={520} />
      </div>

      {/* Was der Gesprächspartner gerade sagt */}
      <Card style={{ padding: '12px 14px', marginBottom: 12 }}>
        {phase === 'thinking' ? (
          <div style={{ color: C.textMuted, fontSize: 14 }}>
            {slow ? '🤔 Einen Moment noch …' : '💭 denkt nach …'}
          </div>
        ) : phase === 'error' ? (
          <div style={{ fontSize: 14, color: C.shu, lineHeight: 1.6 }}>
            Die Antwort kam nicht an{netFails > 1 ? ' (schon mehrfach)' : ''}. Prüf deine Internet-Verbindung
            {netFails > 1 ? ' oder deinen API-Key in den Einstellungen' : ''}.
          </div>
        ) : current ? (
          <>
            {showJp ? (
              <TappableJp text={current.npc} size={19} hint />
            ) : (
              <div style={{ fontSize: 14, color: C.textMuted, fontStyle: 'italic' }}>
                {phase === 'speaking' ? '🔊 spricht …' : '🎧 Nur gehört – kein Text.'}
              </div>
            )}
            {showDe && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>„{current.de}"</div>}
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              <button onClick={replay} disabled={phase === 'speaking' || phase === 'thinking'}
                style={{ ...linkBtn, opacity: phase === 'speaking' || phase === 'thinking' ? 0.45 : 1 }}>🔊 nochmal hören</button>
              {!showJp && <button onClick={() => setRevealJp(true)} style={linkBtn}>👀 Text zeigen</button>}
              {!showDe && scaffold !== 'immersiv' && current.de && (
                <button onClick={() => setRevealDe(true)} style={linkBtn}>🇩🇪 Übersetzung</button>
              )}
            </div>
          </>
        ) : null}
      </Card>

      {/* Deine Antwort */}
      {phase === 'error' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => beginTurn(lastUserRef.current)} style={{ flex: 1 }}>Nochmal versuchen</Btn>
          <Btn onClick={abort} variant="ghost" style={{ flex: 1 }}>Gespräch beenden</Btn>
        </div>
      ) : (
        <>
          {speechOk ? (
            <button onClick={() => (micOn ? closeMic() : openMic())}
              disabled={phase === 'thinking' || phase === 'speaking'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                padding: '15px', borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: phase === 'speaking' || phase === 'thinking' ? 'default' : 'pointer',
                border: `2px solid ${micOn ? C.shu : C.indigo}`,
                background: micOn ? `${C.shu}14` : `${C.indigo}0E`,
                color: micOn ? C.shu : C.indigo,
                opacity: phase === 'speaking' || phase === 'thinking' ? 0.5 : 1,
              }}>
              {micOn ? '🎙 Ich höre zu – sprich einfach' : phase === 'speaking' ? '🔊 Dein Gegenüber spricht …' : phase === 'thinking' ? '💭 einen Moment …' : '🎤 Antwort sprechen'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={typed} onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') answer(typed) }}
                placeholder="Antwort auf Japanisch tippen …" lang="ja"
                disabled={phase === 'thinking' || phase === 'speaking'}
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '13px 12px', fontSize: 16, fontFamily: JP,
                  borderRadius: 10, border: `1.5px solid ${C.washiDark}` }} />
              <Btn onClick={() => answer(typed)} style={{ flexShrink: 0 }}>Sagen</Btn>
            </div>
          )}

          {phase === 'listening' && micText && (
            <div style={{ fontSize: 16, fontFamily: JP, color: C.textMuted, marginTop: 8, textAlign: 'center' }}>{micText} …</div>
          )}
          {micHint && <div style={{ fontSize: 12, color: C.shu, marginTop: 8, lineHeight: 1.5 }}>{micHint}</div>}

          {/* Vorschläge */}
          {hints && (
            <Card style={{ marginTop: 10, padding: '12px 14px', borderLeft: `4px solid ${C.indigo}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>DU KÖNNTEST SAGEN</div>
              {hints.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: i ? 8 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontFamily: JP, color: C.sumi }}>{h.jp}</div>
                    {h.de && <div style={{ fontSize: 12, color: C.textMuted }}>{h.de}</div>}
                  </div>
                  <button onClick={() => speak(h.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }} aria-label="Anhören">🔊</button>
                </div>
              ))}
            </Card>
          )}

          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={askHint} disabled={hintBusy || phase === 'thinking'} style={linkBtn}>
              {hintBusy ? '… überlegt' : '💡 Was sag ich?'}
            </button>
            {SPEECH_INPUT_SUPPORTED && (
              <button onClick={() => { closeMic(); setMicHint(null); setShowKeyboard(k => !k) }} style={linkBtn}>
                {showKeyboard ? '🎤 Lieber sprechen' : '⌨ Lieber tippen'}
              </button>
            )}
            <button onClick={abort} style={{ ...linkBtn, marginLeft: 'auto' }}>Beenden</button>
          </div>
        </>
      )}

      {/* Bisheriger Verlauf, kompakt */}
      {turns.length > 1 && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${C.washiDark}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>BISHER</div>
          {turns.slice(0, -1).map((t, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 14, fontFamily: JP, lineHeight: 1.6 }}>
              <div style={{ color: C.sumi }}>{t.npc}</div>
              {t.user && <div style={{ color: C.indigo, paddingLeft: 12, borderLeft: `2px solid ${C.indigo}33` }}>{t.user}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const linkBtn = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  fontSize: 13, color: C.textMuted, fontFamily: 'inherit',
}

