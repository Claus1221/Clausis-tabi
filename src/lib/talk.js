// ─── Freies Gespräch: Freischaltung, Wortschatz-Grenze, Prompt-Bau ───────────
// Reine Logik (kein React, kein Netz) – der Gesprächs-Screen (screens/talk.jsx)
// baut damit seine Aufrufe, `lib/claude.js` schickt sie los.
//
// Kernidee: Die KI darf nur mit dem sprechen, was die lernende Person gelernt
// hat. Genau das kann eine allgemeine Chat-App NICHT – hier liegt der ganze
// didaktische Wert (verständlicher Input auf Lernniveau, „i+1"). Die
// Wortschatz-Grenze kommt aus demselben `reiseVocab`, das schon die
// Szenen-Freischaltung steuert (lib/dialog.js) – eine Quelle der Wahrheit.
import { DIALOGS, DIALOG_LEX } from '../data/dialogs.js'
import { TALK_BY_SCENE } from '../data/talks.js'
import { lexKeysIn, reiseVocab } from './dialog.js'

// Erster „Zug" der lernenden Person: Es gibt noch nichts zu antworten – die KI
// soll das Gespräch von sich aus eröffnen. Die Anthropic-API verlangt eine
// User-Nachricht am Anfang, darum dieser Regie-Hinweis.
export const OPENER_CUE = '(Die lernende Person betritt die Szene und wartet. Eröffne das Gespräch mit einer natürlichen Begrüßung.)'

// Notausgang, wenn der Zug-Deckel erreicht ist, bevor das Ziel geschafft wurde:
// Das Gespräch endet höflich statt einfach abzubrechen.
export const FALLBACK_CLOSING = { npc: 'すみません、では また あとで。', de: 'Entschuldigung, dann bis später.' }

// ─── Freischaltung ───────────────────────────────────────────────────────────
// Ein freies Gespräch öffnet erst, wenn seine geskriptete Szene gemeistert ist.
// Damit ist garantiert, dass Situations-Skript und Kernwortschatz sitzen, bevor
// es ohne Netz losgeht. (Key- und Mikrofon-Prüfung macht die UI – die gehören
// nicht in die Logik-Schicht.)
export function talkGate(talk, progress) {
  if (!talk) return { open: false, reason: 'Kein freies Gespräch zu dieser Szene.' }
  const done = progress?.completedDialogs || []
  if (!done.includes(talk.sceneId)) {
    const scene = DIALOGS.find(d => d.id === talk.sceneId)
    return { open: false, reason: `Erst die Szene „${scene?.title || talk.sceneId}" meistern.` }
  }
  return { open: true, reason: null }
}

// Freies Gespräch zu einer Szene (oder undefined).
export function talkForScene(sceneId) {
  return TALK_BY_SCENE[sceneId]
}

// ─── Wortschatz-Grenze ───────────────────────────────────────────────────────
// Alles, was die lernende Person laut Fortschritt kennt: Wörter aus
// abgeschlossenen Wort-Blöcken und Kapiteln (via reiseVocab) plus die Wendungen
// aus den bereits gemeisterten Gesprächs-Szenen (die wurden dort ja geübt).
// Sortiert, damit der System-Prompt bei gleichem Fortschritt Byte-für-Byte
// identisch bleibt – Voraussetzung fürs Prompt-Caching (siehe lib/claude.js).
export function learnedVocabList(progress) {
  const set = reiseVocab(progress?.completedWordBlocks || [], progress?.completedChapters || [])
  const words = new Set(set)
  for (const id of progress?.completedDialogs || []) {
    const scene = DIALOGS.find(d => d.id === id)
    for (const turn of scene?.turns || []) {
      lexKeysIn(turn.npc).forEach(k => words.add(k))
      lexKeysIn(turn.answer).forEach(k => words.add(k))
    }
  }
  return [...words].sort()
}

// Wortschatz als Prompt-Block: „こんにちは = Guten Tag / Hallo". Die Bedeutung
// mitzugeben ist wichtiger als die reine Wortliste – sonst baut das Modell
// bekannte Wörter in Bedeutungen ein, die nie gelehrt wurden.
function vocabBlock(vocabList) {
  return vocabList
    .map(w => (DIALOG_LEX[w]?.de ? `${w} = ${DIALOG_LEX[w].de}` : w))
    .join('\n')
}

// Gemeinsamer Kopf beider Gesprächs-Prompts (Rolle, Situation, Sprechweise).
// Bewusst als eigene Funktion: Hinweis- und Gesprächs-Prompt müssen dieselbe
// Rolle und dieselbe Wortschatz-Grenze sehen, sonst schlägt der Hinweis Wörter
// vor, die der Gesprächspartner gar nicht kennt.
function promptHead(talk, vocabList) {
  return [
    'Du spielst eine Rolle in einem Sprachlern-Rollenspiel. Die lernende Person ist ein',
    'erwachsener Deutscher, der Japanisch für eine Japan-Reise lernt – Anfänger.',
    '',
    `DEINE ROLLE: ${talk.persona}`,
    `DAS ZIEL DER LERNENDEN PERSON: ${talk.goalDe}`,
    '',
    'SO SPRICHST DU:',
    '· Ausschließlich Japanisch, in Hiragana und Katakana – KEINE Kanji.',
    '· Wörter durch Leerzeichen trennen wie im Lehrmaterial: „ホテルまで おねがいします。"',
    '· Höchstens zwei kurze Sätze pro Zug, und höchstens EINE Frage.',
    '· Verwende möglichst nur Wörter aus der WORTSCHATZ-LISTE unten. Höchstens EIN neues',
    '  Wort pro Zug, und nur wenn es die Situation wirklich verlangt.',
    '',
    'WORTSCHATZ-LISTE (das kennt die lernende Person):',
    vocabBlock(vocabList),
  ].join('\n')
}

// ─── System-Prompt für einen Gesprächszug ────────────────────────────────────
// Zwei Schalter machen den Einstieg flach (siehe DIDAKTIK.md, Gesprächs-Treppe):
//  • `withComplication` – beim ERSTEN Durchgang einer Situation läuft das
//    Gespräch geradlinig. Frei sprechen UND etwas Unerwartetes abfangen sind
//    zwei Aufgaben auf einmal; die Wendung kommt ab dem zweiten Mal.
//  • `guided` – der Partner legt jedem Zug ein bis zwei mögliche Antworten bei,
//    die die App dauerhaft einblendet: frei sprechen mit Sicherheitsnetz. Sie
//    stecken bewusst in DERSELBEN Antwort statt in einem zweiten Aufruf – das
//    kostet nichts extra und verzögert das Gespräch nicht.
export function buildTalkSystem(talk, vocabList, opts = {}) {
  const { guided = false, withComplication = true } = opts
  return [
    promptHead(talk, vocabList),
    '',
    ...(withComplication ? [
      'DEINE GEHEIME WENDUNG: ' + talk.complication,
      'Spiele sie im Mittelteil des Gesprächs aus – nicht im ersten Zug. Verrate nie,',
      'dass es sich um eine vorbereitete Wendung handelt.',
    ] : [
      'DIESES MAL OHNE ÜBERRASCHUNG: Führe das Gespräch geradlinig zum Ziel. Keine',
      'Komplikationen, keine Extra-Rückfragen. Die lernende Person spricht gerade zum',
      'ersten Mal frei – sie soll die Situation einmal glatt durchlaufen.',
    ]),
    '',
    'WENN DIE ANTWORT FEHLERHAFT IST:',
    '· Korrigiere NIEMALS ausdrücklich und wechsle nie ins Deutsche.',
    '· Wiederhole das Gemeinte beiläufig in richtigem Japanisch („ああ、ホテルまで ですね。")',
    '  und führe das Gespräch weiter.',
    '· Ein einzelnes Wort, fehlende Partikeln oder holprige Sätze sind in Ordnung –',
    '  verstehe wohlwollend, so wie ein echter freundlicher Gesprächspartner.',
    '· Nur wenn du wirklich nichts verstehen kannst, frag natürlich nach:',
    '  „すみません、もう いちど おねがいします。"',
    '',
    'ABSCHLUSS:',
    '· Ziel erreicht bedeutet: ' + talk.goalCheck,
    '· Ist es erreicht, verabschiede dich in derselben Antwort natürlich und setze "done": true.',
    '· Sonst "done": false. Halte das Gespräch am Laufen, ohne es künstlich zu verlängern.',
    '',
    'ANTWORTFORMAT – ausschließlich dieses JSON, nichts davor und nichts danach:',
    guided
      ? '{"npc": "deine japanische Zeile", "de": "deutsche Übersetzung", "done": false, "hints": [{"jp": "mögliche Antwort", "de": "deutsche Übersetzung"}]}'
      : '{"npc": "deine japanische Zeile", "de": "deutsche Übersetzung", "done": false}',
    ...(guided
      ? ['Bei "hints": ein bis zwei kurze, natürliche Antworten, die DIE LERNENDE PERSON',
         'jetzt sagen könnte – nicht du. Auch im Abschlusszug (dort z. B. eine Verabschiedung).']
      : []),
  ].join('\n')
}

// ─── System-Prompt für den Hilfe-Knopf („Was soll ich sagen?") ───────────────
// Eigener Prompt statt einer Sonderanweisung im Gespräch: Der Gesprächs-Prompt
// verlangt strikt das NPC-JSON – eine Ausnahme darin würde das Format aufweichen.
export function buildHintSystem(talk, vocabList) {
  return [
    promptHead(talk, vocabList),
    '',
    'AUFGABE: Du spielst gerade NICHT. Die lernende Person weiß nicht weiter und',
    'fragt: „Was könnte ich jetzt sagen?" Schlage ein bis zwei kurze, natürliche',
    'Antworten vor, die SIE (nicht du) jetzt sagen könnte – passend zum letzten Zug',
    'des Gesprächspartners und zu ihrem Ziel.',
    '',
    'ANTWORTFORMAT – ausschließlich dieses JSON, nichts davor und nichts danach:',
    '{"hints": [{"jp": "japanischer Vorschlag in Kana", "de": "deutsche Übersetzung"}]}',
  ].join('\n')
}

// ─── System-Prompt für die Nachbesprechung ───────────────────────────────────
// Korrekturen kommen bewusst ERST hier: Im Gespräch bleibt der Partner höflich
// und korrigiert nur beiläufig (Flüssigkeit vor Genauigkeit). Die Nachbesprechung
// ist der Ort für explizite Korrekturen – und für Wendungen, die gefehlt haben.
export function buildDebriefSystem() {
  return [
    'Du bist ein freundlicher Japanisch-Lehrer und besprichst mit einem erwachsenen',
    'deutschen Anfänger ein gerade geführtes Übungsgespräch nach.',
    '',
    'REGELN:',
    '· Antworte auf Deutsch, kurz und ermutigend. Kein Fachjargon.',
    '· Höchstens 3 Korrekturen – nur die, die wirklich beim Verstandenwerden helfen.',
    '  Reine Erkennungsfehler der Spracherkennung sind KEINE Korrekturen.',
    '· Höchstens 2 Wendungen, die im Gespräch gefehlt haben und beim nächsten Mal',
    '  nützlich wären. Kurz, in Kana, alltagstauglich.',
    '· Ist nichts zu korrigieren, gib eine leere Liste zurück – erfinde nichts.',
    '',
    'ANTWORTFORMAT – ausschließlich dieses JSON, nichts davor und nichts danach:',
    '{"lobDe": "ein bis zwei Sätze, was gut lief",',
    ' "korrekturen": [{"gesagt": "…", "besser": "…", "warumDe": "kurz, max. 12 Wörter"}],',
    ' "wendungen": [{"jp": "…", "de": "…"}]}',
  ].join('\n')
}

// Das Transkript, wie es die Nachbesprechung sieht. `turns` sind die Züge des
// Gesprächs: { npc, npcDe, user? , helped? }.
export function transcriptText(turns) {
  return turns
    .flatMap(t => {
      const lines = [`GESPRÄCHSPARTNER: ${t.npc}${t.npcDe ? `  (${t.npcDe})` : ''}`]
      if (t.user) lines.push(`LERNENDE PERSON: ${t.user}${t.helped ? '  [mit Hilfe]' : ''}`)
      return lines
    })
    .join('\n')
}

export function buildDebriefPrompt(talk, turns) {
  return [
    `SITUATION: ${talk.persona}`,
    `ZIEL DER LERNENDEN PERSON: ${talk.goalDe}`,
    '',
    'GESPRÄCH (die Antworten der lernenden Person kommen aus einer Spracherkennung,',
    'können also leicht verrauscht oder in Kanji statt Kana geschrieben sein):',
    transcriptText(turns),
  ].join('\n')
}
