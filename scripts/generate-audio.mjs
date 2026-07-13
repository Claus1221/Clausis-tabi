// ─── Studio-Audio vorab generieren (Google Cloud TTS, Neural2) ───────────────
// Sammelt JEDEN Text, den die App über speak() ausgeben kann, und legt dafür
// MP3s unter public/audio/ ab (Dateiname = Hash aus Stimme+Text). Die App
// spielt diese Dateien statt der System-TTS ab (siehe src/lib/speech.js);
// für Texte ohne Datei bleibt die System-TTS der Fallback.
//
//   node scripts/generate-audio.mjs --dry-run   nur zählen, nichts generieren
//   node scripts/generate-audio.mjs --check     prüfen, ob alles da ist (offline,
//                                               kein Key nötig – für den Pre-Commit-Hook)
//   node scripts/generate-audio.mjs --limit 5   Probelauf mit 5 Dateien
//   node scripts/generate-audio.mjs             alles Fehlende generieren
//
// API-Key: GOOGLE_TTS_API_KEY aus der Umgebung oder aus .env.local
// (Zeile „GOOGLE_TTS_API_KEY=…"; *.local ist git-ignoriert).
// Kosten: Neural2 hat 1 Mio. Gratis-Zeichen/Monat – der gesamte App-Inhalt
// liegt weit darunter. Läuft inkrementell: vorhandene Dateien werden übersprungen.
import { createHash } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { KANA_DATA } from '../src/data/kana.js'
import { WORD_BLOCKS, WORD_BY_KANJI } from '../src/data/words.js'
import { PHRASES } from '../src/data/phrases.js'
import { DIALOGS } from '../src/data/dialogs.js'
import { GRAMMAR } from '../src/data/grammar.js'
import { CHAPTERS, STORY_TOKENS, CHAPTER_WORD } from '../src/data/chapters.js'

const VOICE = 'ja-JP-Neural2-B'
const RATE = 1.0
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')

// ─── Texte sammeln – exakt die Transformationen der Sprechstellen in der App ─
// (speakTokens, itemReading, BuildStep.sayTile, furiPlain – siehe src/lib/speech.js,
// src/components/BuildStep.jsx, src/lib/furigana.jsx)
const KANA_ONLY = /^[぀-ヿー]+$/
const HAS_JP = /[぀-ヿ一-龯]/
const tokensJoin = (toks) => toks.map(t => (t.r && KANA_ONLY.test(t.r)) ? t.r : t.t).join('')
const itemReading = (it) => WORD_BY_KANJI[it]?.kana ?? CHAPTER_WORD[it]?.reading ?? it
const tileReading = (t) => t === 'は' ? 'わ' : t === 'へ' ? 'え' : itemReading(t)
const furiPlain = (s) => s.replace(/\([^)]*\)/g, '')

function collectTexts() {
  const texts = new Set()
  const add = (t) => { if (t && HAS_JP.test(t)) texts.add(t) }
  // Kacheln eines Satzbau-Schritts: jede Kachel einzeln + die zusammengesetzte Antwort.
  const addBuild = (tiles, answer) => {
    (tiles || []).forEach(t => add(tileReading(t)))
    if (answer?.length) add(answer.map(itemReading).join(''))
  }

  Object.keys(KANA_DATA).forEach(add)                            // einzelne Kana
  for (const b of WORD_BLOCKS) for (const w of b.words) {        // Wörter + Beispielsätze
    add(w.kana)
    if (w.ex?.tokens) add(tokensJoin(w.ex.tokens))
  }
  PHRASES.forEach(p => add(p.jp))                                // Überlebensphrasen
  for (const d of DIALOGS) for (const t of d.turns || []) {      // Gesprächs-Szenen
    add(t.npc); (t.options || []).forEach(add)
  }
  for (const g of GRAMMAR) for (const e of g.examples || []) {   // Grammatik-Beispiele
    if (e.tokens) {
      add(tokensJoin(e.tokens))
      // Mix/Satzbau baut Kacheln aus denselben Tokens (ohne Satzzeichen).
      const ans = e.tokens.map(t => t.t).filter(t => t !== '。' && t !== '！')
      addBuild(ans, ans)
    } else add(e.jp)
  }
  for (const [jp, toks] of Object.entries(STORY_TOKENS)) {       // Story-Sätze
    add(furiPlain(jp)); add(tokensJoin(toks))
  }
  for (const c of CHAPTERS) for (const s of c.steps) {           // Kapitel-Schritte
    if (s.kind === 'audio') add(s.say)
    else if (s.kind === 'intro') add(s.reading || s.jp)
    else if (s.kind === 'story' && s.jp) { add(furiPlain(s.jp)); if (s.tokens) add(tokensJoin(s.tokens)) }
    else if (s.kind === 'dialog') { add(s.line); (s.options || []).forEach(add) }
    else if (s.kind === 'build') addBuild(s.tiles, s.answer)
  }
  Object.values(CHAPTER_WORD).forEach(w => add(w.reading))       // Kapitel-Vokabeln (SRS)
  return [...texts]
}

// ─── Generierung ──────────────────────────────────────────────────────────────
const fileFor = (text) => createHash('sha1').update(`${VOICE}|${RATE}|${text}`).digest('hex').slice(0, 16) + '.mp3'

function readApiKey() {
  if (process.env.GOOGLE_TTS_API_KEY) return process.env.GOOGLE_TTS_API_KEY
  try {
    const env = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local'), 'utf8')
    const m = env.match(/^GOOGLE_TTS_API_KEY=(.+)$/m)
    if (m) return m[1].trim()
  } catch { /* keine .env.local */ }
  return null
}

async function synth(text, key) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: RATE },
      }),
    })
    if (res.ok) return Buffer.from((await res.json()).audioContent, 'base64')
    const body = await res.text()
    // Quota/Server-Schluckauf: kurz warten und erneut; alles andere ist fatal.
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt))
      continue
    }
    throw new Error(`HTTP ${res.status} bei „${text}": ${body.slice(0, 300)}`)
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity

  const texts = collectTexts()
  const chars = texts.reduce((n, t) => n + t.length, 0)
  const missing = texts.filter(t => !existsSync(join(OUT_DIR, fileFor(t))))

  // --check: Sind alle Texte abgedeckt (Datei + Manifest-Eintrag)? Exit 1, wenn
  // nicht – der Pre-Commit-Hook stößt dann die Generierung an. Solange die
  // Pipeline nie gelaufen ist (kein Manifest), blockiert der Check nichts.
  if (process.argv.includes('--check')) {
    const manifestPath = join(OUT_DIR, 'manifest.json')
    if (!existsSync(manifestPath)) {
      console.log('Audio-Check übersprungen: noch kein Manifest (Pipeline nie gelaufen).')
      return
    }
    const map = JSON.parse(readFileSync(manifestPath, 'utf8')).map || {}
    const stale = texts.filter(t => !map[t] || !existsSync(join(OUT_DIR, map[t])))
    if (stale.length === 0) {
      console.log(`Audio-Check ok: alle ${texts.length} Texte abgedeckt.`)
      return
    }
    console.error(`✗ ${stale.length} gesprochene Texte ohne aktuelles Studio-Audio, z. B.:`)
    stale.slice(0, 8).forEach(t => console.error('   ·', t))
    process.exit(1)
  }
  console.log(`Texte gesamt: ${texts.length} (${chars} Zeichen) · Stimme: ${VOICE}`)
  console.log(`Schon vorhanden: ${texts.length - missing.length} · zu generieren: ${missing.length}`)
  if (dryRun) {
    console.log('\n--dry-run: nichts generiert. Beispiele:')
    texts.slice(0, 15).forEach(t => console.log('  ·', t))
    return
  }

  const key = readApiKey()
  if (!key) {
    console.error('Kein API-Key. GOOGLE_TTS_API_KEY als Umgebungsvariable setzen')
    console.error('oder Zeile „GOOGLE_TTS_API_KEY=…" in .env.local anlegen.')
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const work = missing.slice(0, limit)
  let done = 0, failed = 0

  // Kleiner Worker-Pool statt alles auf einmal (Quota-freundlich).
  const queue = [...work]
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let text; (text = queue.shift()) !== undefined;) {
      try {
        writeFileSync(join(OUT_DIR, fileFor(text)), await synth(text, key))
        if (++done % 50 === 0) console.log(`  ${done}/${work.length} …`)
      } catch (e) {
        failed++
        console.error(`  ✗ ${e.message}`)
      }
    }
  }))

  // Manifest: nur Einträge, deren Datei wirklich existiert. Verwaiste Dateien
  // (Texte/Stimme geändert) aufräumen, damit public/audio nicht zuwuchert.
  const map = {}
  for (const t of texts) {
    const f = fileFor(t)
    if (existsSync(join(OUT_DIR, f))) map[t] = f
  }
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({ voice: VOICE, map }))
  const wanted = new Set([...Object.values(map), 'manifest.json'])
  const orphans = readdirSync(OUT_DIR).filter(f => !wanted.has(f))
  orphans.forEach(f => unlinkSync(join(OUT_DIR, f)))

  console.log(`\nFertig: ${done} neu generiert, ${failed} Fehler, ${Object.keys(map).length} Einträge im Manifest, ${orphans.length} verwaiste Dateien entfernt.`)
  if (failed > 0) process.exit(1)
}

main()
