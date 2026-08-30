import { useEffect, useState } from 'react'
import { C } from '../theme.js'
import { sceneTree } from '../lib/scene.jsx'

// ─── Gesprächs-Avatar & Bühne ────────────────────────────────────────────────
// Ein Gegenüber statt eines Formulars: Im freien Gespräch (screens/talk.jsx)
// steht hier eine gezeichnete Person, die atmet, blinzelt, den Mund bewegt
// während sie spricht, zuhört und nachdenkt. Bewusst flach und geometrisch im
// Stil der Reise-Kulissen (lib/scene.jsx) – keine Fotos, keine Fremd-Assets.
//
// Zustände (`mood`):
//   idle      – wartet, atmet, blinzelt
//   speaking  – Mund bewegt sich im Takt, leichtes Nicken
//   listening – lehnt sich zugewandt vor, pulsierender Ring (Mikro ist offen)
//   thinking  – Blick zur Seite, „…"-Blase
//   happy     – Lach-Augen, Wangen (Ziel erreicht)
//
// Wichtig: Der Mund bewegt sich NICHT wortsynchron. Die `boundary`-Ereignisse
// der Sprachsynthese sind auf Android unzuverlässig; ein einfacher Takt,
// gestartet und gestoppt von den echten Sprech-Ereignissen (lib/speech.js),
// wirkt lebendig und geht überall.

const SKIN = '#F2D5BC'
const SKIN_SHADE = '#E3BFA2'
const DARK = '#2B241D'

// Rolle → Aussehen. Die Namen kommen aus data/talks.js (`role`).
const ROLES = {
  oma: { hair: 'bun', hairColor: '#B9B2A6', top: '#8C7BA6', accessory: 'none' },
  fahrerin: { hair: 'ponytail', hairColor: '#3B3229', top: '#2F4E77', accessory: 'cap' },
  rezeption: { hair: 'short', hairColor: '#2B241D', top: '#243B57', accessory: 'tie' },
  kellner: { hair: 'short', hairColor: '#332B22', top: '#4C4640', accessory: 'apron' },
  barista: { hair: 'bun', hairColor: '#4A3428', top: '#5E8A6A', accessory: 'apron' },
  passant: { hair: 'short', hairColor: '#2E2820', top: '#6E7F93', accessory: 'none' },
  passantin: { hair: 'long', hairColor: '#4A3B2E', top: '#B9705E', accessory: 'scarf' },
  schaffner: { hair: 'short', hairColor: '#2B241D', top: '#1E4368', accessory: 'cap' },
  verkaeuferin: { hair: 'long', hairColor: '#332A22', top: '#7C6A93', accessory: 'none' },
}
const DEFAULT_ROLE = ROLES.passant

// ─── Kulissen ────────────────────────────────────────────────────────────────
// Je Ort eine Wand-/Himmelfarbe, ein Boden und ein paar Requisiten. Alles links
// und rechts der Mitte, damit die Person (x ≈ 100) frei steht.
const PLACES = {
  strasse: { wall: '#CFE0EC', floor: '#9E998E' },
  zimmer: { wall: '#EDE3CE', floor: '#C9BE9C' },
  hotel: { wall: '#DFE6EC', floor: '#B5AA96' },
  restaurant: { wall: '#E9DCC6', floor: '#A88C6B' },
  cafe: { wall: '#E4D9CB', floor: '#8E7A64' },
  laden: { wall: '#E7E0D0', floor: '#B3A488' },
  bahnhof: { wall: '#D9DEE2', floor: '#A6A49E' },
}

function Backdrop({ place }) {
  const p = PLACES[place] || PLACES.strasse
  return (
    <>
      <rect x="0" y="0" width="200" height="112" fill={p.wall} />
      <rect x="0" y="112" width="200" height="38" fill={p.floor} />
      {place === 'strasse' && (
        <>
          <rect x="0" y="70" width="42" height="42" fill="#B7C4CE" />
          <rect x="8" y="80" width="10" height="10" fill="#E6EDF2" />
          <rect x="24" y="80" width="10" height="10" fill="#E6EDF2" />
          {sceneTree(172, 108, 1.1, 'tree')}
          <rect x="0" y="124" width="200" height="3" fill="#EFEBE0" opacity="0.5" />
        </>
      )}
      {place === 'zimmer' && (
        <>
          <rect x="12" y="42" width="40" height="46" rx="3" fill="#F7F3E6" stroke="#C2B79A" strokeWidth="2" />
          <line x1="32" y1="42" x2="32" y2="88" stroke="#C2B79A" strokeWidth="1.5" />
          <rect x="156" y="34" width="22" height="58" fill="#F3EDDC" stroke="#C2B79A" strokeWidth="1.5" />
          <text x="167" y="58" fontSize="13" textAnchor="middle" fill={C.sumi} opacity="0.5">旅</text>
          <rect x="0" y="112" width="200" height="2" fill="#8F855F" opacity="0.35" />
        </>
      )}
      {place === 'hotel' && (
        <>
          <circle cx="30" cy="52" r="11" fill="#F7F5EF" stroke="#B0A793" strokeWidth="2" />
          <line x1="30" y1="52" x2="30" y2="45" stroke={C.sumi} strokeWidth="1.6" />
          <line x1="30" y1="52" x2="35" y2="55" stroke={C.sumi} strokeWidth="1.6" />
          <rect x="150" y="60" width="38" height="30" rx="2" fill="#CFC6B2" />
          <rect x="0" y="118" width="200" height="32" fill="#7E6B54" />
          <rect x="0" y="112" width="200" height="8" rx="2" fill="#96825F" />
        </>
      )}
      {place === 'restaurant' && (
        <>
          {/* Noren-Vorhang: Schrift bewusst links – in der Mitte steht der Kopf. */}
          <rect x="0" y="26" width="200" height="20" fill={C.indigo} />
          <text x="42" y="41" fontSize="13" textAnchor="middle" fill="#F3EEE2">お食事処</text>
          <rect x="150" y="66" width="40" height="26" rx="3" fill="#C29A6B" />
          <rect x="0" y="118" width="200" height="32" fill="#8A6B4A" />
          <rect x="0" y="112" width="200" height="8" rx="2" fill="#A07E58" />
        </>
      )}
      {place === 'cafe' && (
        <>
          <rect x="8" y="44" width="46" height="6" rx="2" fill="#8E7A64" />
          <rect x="14" y="34" width="9" height="10" rx="2" fill="#F3EEE2" />
          <rect x="28" y="34" width="9" height="10" rx="2" fill="#F3EEE2" />
          <rect x="42" y="34" width="9" height="10" rx="2" fill="#F3EEE2" />
          <rect x="152" y="52" width="36" height="26" rx="3" fill="#6B5844" />
          <rect x="0" y="116" width="200" height="34" fill="#6B5844" />
          <rect x="0" y="111" width="200" height="7" rx="2" fill="#82694F" />
        </>
      )}
      {place === 'laden' && (
        <>
          <rect x="6" y="38" width="48" height="5" fill="#9C8B6E" />
          <rect x="6" y="70" width="48" height="5" fill="#9C8B6E" />
          {[10, 24, 38].map(x => <rect key={x} x={x} y="26" width="11" height="12" rx="2" fill="#D9C7A4" />)}
          {[10, 24, 38].map(x => <rect key={`b${x}`} x={x} y="57" width="11" height="13" rx="2" fill="#C9B48D" />)}
          <rect x="152" y="46" width="38" height="46" rx="3" fill="#D3C6A8" />
          <rect x="0" y="118" width="200" height="32" fill="#96825F" />
        </>
      )}
      {place === 'bahnhof' && (
        <>
          <rect x="8" y="30" width="60" height="24" rx="3" fill={C.indigo} />
          <text x="38" y="46" fontSize="12" textAnchor="middle" fill="#F3EEE2">とうきょう</text>
          <circle cx="172" cy="44" r="12" fill="#F7F5EF" stroke="#8E8B85" strokeWidth="2" />
          <line x1="172" y1="44" x2="172" y2="36" stroke={C.sumi} strokeWidth="1.6" />
          <line x1="172" y1="44" x2="177" y2="47" stroke={C.sumi} strokeWidth="1.6" />
          <rect x="0" y="112" width="200" height="4" fill="#E8C86A" />
          <rect x="0" y="120" width="200" height="30" fill="#8E8B85" />
        </>
      )}
    </>
  )
}

// ─── Frisuren & Accessoires ──────────────────────────────────────────────────
function HairBack({ style, color }) {
  // Langes Haar als ZWEI Strähnen links und rechts – eine durchgehende Fläche
  // würde unterhalb des Kinns über die ganze Breite laufen und wie ein Bart
  // aussehen (der Kopf verdeckt ja nur den Bereich darüber).
  if (style === 'long') return (
    <>
      <path d="M72 60 Q69 100 79 111 L93 111 Q81 96 80 60 Z" fill={color} />
      <path d="M128 60 Q131 100 121 111 L107 111 Q119 96 120 60 Z" fill={color} />
    </>
  )
  if (style === 'ponytail') return <ellipse cx="100" cy="42" rx="27" ry="20" fill={color} />
  if (style === 'bun') return <circle cx="100" cy="30" r="11" fill={color} />
  return null
}
function HairFront({ style, color }) {
  return (
    <>
      <path d="M74 60 Q76 34 100 34 Q124 34 126 60 Q118 45 100 45 Q82 45 74 60 Z" fill={color} />
      {style === 'ponytail' && <path d="M126 52 Q142 58 138 82 Q132 70 124 66 Z" fill={color} />}
    </>
  )
}
// Die Mütze muss ÜBER dem Haar liegen, alles andere unter dem Kopf – darum wird
// diese Komponente zweimal aufgerufen, einmal vor und einmal nach der Frisur.
function Accessory({ kind }) {
  if (kind === 'cap') return (
    <>
      <path d="M73 44 Q76 22 100 22 Q124 22 127 44 Z" fill={C.indigo} />
      <rect x="66" y="42" width="68" height="6" rx="3" fill="#16304A" />
    </>
  )
  if (kind === 'apron') return (
    <>
      <path d="M84 112 L116 112 L120 150 L80 150 Z" fill="#F5F2E8" />
      <rect x="80" y="118" width="40" height="2.5" fill="#D8D2C0" />
    </>
  )
  if (kind === 'tie') return <path d="M100 104 L105 112 L100 128 L95 112 Z" fill={C.shu} />
  if (kind === 'scarf') return <path d="M82 104 Q100 116 118 104 L120 116 Q100 126 80 116 Z" fill={C.shu} opacity="0.85" />
  return null
}

// ─── Der Avatar ──────────────────────────────────────────────────────────────
export function Avatar({ role = 'passant', place = 'strasse', mood = 'idle', width = 260 }) {
  const look = ROLES[role] || DEFAULT_ROLE
  const [blink, setBlink] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)

  // Blinzeln in unregelmäßigen Abständen – gleichmäßiges Blinzeln wirkt sofort
  // maschinell. Jeder Schlag plant den nächsten selbst.
  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true)
        timer = setTimeout(() => { setBlink(false); schedule() }, 120)
      }, 2600 + Math.random() * 3400)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // Mundtakt nur solange wirklich gesprochen wird.
  useEffect(() => {
    if (mood !== 'speaking') { setMouthOpen(false); return }
    const id = setInterval(() => setMouthOpen(o => !o), 135)
    return () => { clearInterval(id); setMouthOpen(false) }
  }, [mood])

  const happy = mood === 'happy'
  const thinking = mood === 'thinking'
  const eyeShift = thinking ? 3 : 0          // Blick zur Seite beim Nachdenken
  const eyeRy = blink || happy ? 0.8 : 4.2

  return (
    <svg viewBox="0 0 200 150" width={width} height={width * 0.75} role="img"
      aria-label="Gesprächspartner" style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <clipPath id="tabi-stage-clip"><rect x="0" y="0" width="200" height="150" rx="14" /></clipPath>
      </defs>
      <g clipPath="url(#tabi-stage-clip)">
        <Backdrop place={place} />

        <g className={`tabi-avatar-body tabi-mood-${mood}`}>
          {/* Körper – der Kragen bricht die Fläche auf, sonst wirkt der Oberkörper
              wie ein Klecks und der Kopf schwebt darüber. */}
          <path d="M62 150 Q62 112 100 107 Q138 112 138 150 Z" fill={look.top} />
          <path d="M88 109 L100 124 L112 109 L108 107 L100 116 L92 107 Z" fill="#000000" opacity="0.13" />
          <Accessory kind={look.accessory === 'cap' ? 'none' : look.accessory} />
          {/* Hals */}
          <rect x="93" y="84" width="14" height="20" fill={SKIN_SHADE} />

          <HairBack style={look.hair} color={look.hairColor} />
          {/* Kopf */}
          <ellipse cx="100" cy="64" rx="26" ry="28" fill={SKIN} />
          <ellipse cx="74" cy="70" rx="4" ry="6" fill={SKIN_SHADE} />
          <ellipse cx="126" cy="70" rx="4" ry="6" fill={SKIN_SHADE} />
          <HairFront style={look.hair} color={look.hairColor} />
          <Accessory kind={look.accessory === 'cap' ? 'cap' : 'none'} />

          {/* Augen: beim Lachen zwei Bögen, sonst Ellipsen (Blinzeln = flach) */}
          {happy ? (
            <>
              <path d="M83 66 Q90 60 97 66" fill="none" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M103 66 Q110 60 117 66" fill="none" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
              <ellipse cx="80" cy="76" rx="5" ry="3" fill={C.shu} opacity="0.28" />
              <ellipse cx="120" cy="76" rx="5" ry="3" fill={C.shu} opacity="0.28" />
            </>
          ) : (
            <>
              <ellipse cx={90 + eyeShift} cy="66" rx="3.1" ry={eyeRy} fill={DARK} />
              <ellipse cx={110 + eyeShift} cy="66" rx="3.1" ry={eyeRy} fill={DARK} />
            </>
          )}
          {/* Brauen – heben sich beim Zuhören leicht (aufmerksam) */}
          <path d={`M84 ${mood === 'listening' ? 54 : 56} Q90 ${mood === 'listening' ? 51 : 53} 96 ${mood === 'listening' ? 54 : 56}`}
            fill="none" stroke={look.hairColor} strokeWidth="2" strokeLinecap="round" />
          <path d={`M104 ${mood === 'listening' ? 54 : 56} Q110 ${mood === 'listening' ? 51 : 53} 116 ${mood === 'listening' ? 54 : 56}`}
            fill="none" stroke={look.hairColor} strokeWidth="2" strokeLinecap="round" />

          {/* Mund */}
          {happy ? (
            <path d="M92 78 Q100 87 108 78" fill="none" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
          ) : mouthOpen ? (
            <ellipse cx="100" cy="80" rx="5" ry="4.4" fill="#7A3B33" />
          ) : (
            <ellipse cx="100" cy="80" rx="5.4" ry="1.3" fill="#8A554A" />
          )}
        </g>

        {/* Zuhör-Ring: sichtbares Zeichen, dass das Mikrofon offen ist */}
        {mood === 'listening' && (
          <>
            <circle className="tabi-ring" cx="100" cy="70" r="46" fill="none" stroke={C.shu} strokeWidth="2.5" />
            <circle className="tabi-ring" cx="100" cy="70" r="46" fill="none" stroke={C.shu} strokeWidth="2.5"
              style={{ animationDelay: '0.9s' }} />
          </>
        )}
        {/* Denk-Blase */}
        {thinking && (
          <g>
            <rect x="134" y="24" width="46" height="24" rx="12" fill="#FFFFFF" opacity="0.94" />
            <circle cx="136" cy="52" r="3.4" fill="#FFFFFF" opacity="0.94" />
            {[147, 157, 167].map((x, i) => (
              <circle key={x} className="tabi-dot" cx={x} cy="36" r="3.2" fill={C.textMuted}
                style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </g>
        )}
      </g>
    </svg>
  )
}
