// ─── Studio-Audio für den Nepali-Kurs vorab generieren (Azure Speech) ────────
// Gegenstück zu scripts/generate-audio.mjs (Japanisch, Google TTS): sammelt jeden
// Text, der vertont werden soll (scripts/lib/collect-ne.mjs) und legt MP3s unter
// public/audio-ne/ ab (Dateiname = Hash aus Stimme+Tempo+Text).
//
//   node scripts/generate-audio-ne.mjs --dry-run   nur zählen, nichts generieren
//   node scripts/generate-audio-ne.mjs --check     prüfen, ob alles da ist (offline,
//                                                  kein Key nötig – für den Pre-Commit-Hook)
//   node scripts/generate-audio-ne.mjs --limit 5   Probelauf mit 5 Dateien
//   node scripts/generate-audio-ne.mjs             alles Fehlende generieren
//
// Zugang: AZURE_SPEECH_KEY und AZURE_SPEECH_REGION aus der Umgebung oder aus
// .env.local (je eine Zeile „NAME=…"; *.local ist git-ignoriert).
// Läuft inkrementell: vorhandene Dateien werden übersprungen.
//
// Stand: noch nie gelaufen (kein Azure-Key). Solange es kein Manifest gibt,
// blockiert --check nichts – der Kurs ist ohne Ton voll benutzbar.
import { createHash } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { SCRIPT_DATA } from '../src/ne/data/script.js'
import { WORD_BLOCKS } from '../src/ne/data/words.js'
import { GRAMMAR, GRAMMAR_NEW_WORDS } from '../src/ne/data/grammar.js'
import { collectNeTexts } from './lib/collect-ne.mjs'

const VOICE = 'ne-NP-HemkalaNeural'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'audio-ne')
const MANIFEST = join(OUT_DIR, 'manifest.json')

// Hier fließen alle vorhandenen Datenquellen ein; spätere Tasks reichen ihre
// Module (chapters, dialogs) nach.
const collectTexts = () => collectNeTexts({ script: SCRIPT_DATA, words: WORD_BLOCKS, grammar: GRAMMAR, grammarNewWords: GRAMMAR_NEW_WORDS })

// Rate ist Teil des Hashs: Stimmen-/Tempo-Wechsel macht den Bestand veraltet.
const fileFor = (text, rate) => createHash('sha1').update(`${VOICE}|${rate}|${text}`).digest('hex').slice(0, 16) + '.mp3'

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function readEnv(name) {
  if (process.env[name]) return process.env[name]
  try {
    const env = readFileSync(join(ROOT, '.env.local'), 'utf8')
    const m = env.match(new RegExp(`^${name}=(.+)$`, 'm'))
    if (m) return m[1].trim()
  } catch { /* keine .env.local */ }
  return null
}

async function synth(text, rate, key, region) {
  const ssml = `<speak version="1.0" xml:lang="ne-NP" xmlns="http://www.w3.org/2001/10/synthesis">` +
    `<voice name="${VOICE}"><prosody rate="${rate}">${xmlEscape(text)}</prosody></voice></speak>`
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'tabi-audio-ne',
      },
      body: ssml,
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
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

  const texts = collectTexts() // Paare [Text, Rate]
  const chars = texts.reduce((n, [t]) => n + t.length, 0)
  const missing = texts.filter(([t, r]) => !existsSync(join(OUT_DIR, fileFor(t, r))))

  // --check: ohne Manifest (Pipeline nie gelaufen) nur Hinweis, Exit 0 – sonst
  // würde der Pre-Commit-Hook jeden Commit blockieren, solange es keinen Key gibt.
  // Mit Manifest streng: jeder Text braucht einen Eintrag auf den aktuellen Hash
  // (Text+Stimme+Tempo) und die Datei.
  if (process.argv.includes('--check')) {
    if (!existsSync(MANIFEST)) {
      console.log(`Nepali-Audio noch nicht erzeugt (${texts.length} Texte warten) – uebersprungen.`)
      return
    }
    const map = JSON.parse(readFileSync(MANIFEST, 'utf8'))
    const stale = texts.filter(([t, r]) => map[t] !== fileFor(t, r) || !existsSync(join(OUT_DIR, map[t])))
    if (stale.length === 0) {
      console.log(`Nepali-Audio-Check ok: alle ${texts.length} Texte abgedeckt.`)
      return
    }
    console.error(`✗ ${stale.length} gesprochene Nepali-Texte ohne aktuelles Studio-Audio, z. B.:`)
    stale.slice(0, 8).forEach(([t]) => console.error('   ·', t))
    process.exit(1)
  }
  console.log(`Texte gesamt: ${texts.length} (${chars} Zeichen) · Stimme: ${VOICE}`)
  console.log(`Schon vorhanden: ${texts.length - missing.length} · zu generieren: ${missing.length}`)
  if (dryRun) {
    console.log('\n--dry-run: nichts generiert. Beispiele:')
    texts.slice(0, 15).forEach(([t, r]) => console.log('  ·', `[${r}]`, t))
    return
  }

  const key = readEnv('AZURE_SPEECH_KEY')
  const region = readEnv('AZURE_SPEECH_REGION')
  if (!key || !region) {
    console.error('Azure-Zugang unvollstaendig. In .env.local (oder als Umgebungsvariablen) fehlen:')
    if (!key) console.error('  AZURE_SPEECH_KEY=…')
    if (!region) console.error('  AZURE_SPEECH_REGION=…   (z. B. westeurope)')
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const work = missing.slice(0, limit)
  let done = 0, failed = 0

  // Kleiner Worker-Pool statt alles auf einmal (Quota-freundlich).
  const queue = [...work]
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let pair; (pair = queue.shift()) !== undefined;) {
      const [text, rate] = pair
      try {
        writeFileSync(join(OUT_DIR, fileFor(text, rate)), await synth(text, rate, key, region))
        if (++done % 50 === 0) console.log(`  ${done}/${work.length} …`)
      } catch (e) {
        failed++
        console.error(`  ✗ ${e.message}`)
      }
    }
  }))

  // Manifest { Text: Dateiname }: nur Einträge, deren Datei existiert. Verwaiste
  // Dateien (Text/Stimme/Tempo geändert) aufräumen.
  const map = {}
  for (const [t, r] of texts) {
    const f = fileFor(t, r)
    if (existsSync(join(OUT_DIR, f))) map[t] = f
  }
  writeFileSync(MANIFEST, JSON.stringify(map))
  const wanted = new Set([...Object.values(map), 'manifest.json'])
  const orphans = readdirSync(OUT_DIR).filter(f => !wanted.has(f))
  orphans.forEach(f => unlinkSync(join(OUT_DIR, f)))

  console.log(`\nFertig: ${done} neu generiert, ${failed} Fehler, ${Object.keys(map).length} Einträge im Manifest, ${orphans.length} verwaiste Dateien entfernt.`)
  if (failed > 0) process.exit(1)
}

main()
