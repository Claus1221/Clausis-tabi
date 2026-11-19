// ─── Kulissen der Yatra-Karte (flache SVG-Formen) ──────────────────────────────
// Gegenstück zu src/lib/scene.jsx, gleiche Bauweise (Himmel als EIN Verlauf, ferner und
// naher Rücken je Band mit weichen Übergängen, Requisiten am Talrand), aber Nepal:
//   tal    – Kathmandu-Tal: Stupa, Gebetsfahnen, Ziegelhäuser
//   huegel – Mittelland: Terrassenfelder, Bauernhäuser
//   see    – Pokhara: See mit Booten
//   berge  – Himalaya: Schneegipfel, Chörten, Gebetsfahnen
// Bewusst zurückhaltend: die Kulisse liegt blass hinter den Stationen und darf deren
// Lesbarkeit nie stören. Deterministisch (kein Math.random), damit nichts flackert.

// Themen-Farben ergänzen die App-Palette (theme.js) um Nepal-Töne.
const BRICK = '#B9684E'      // Newari-Ziegel
const ROOF = '#6E5442'
const GOLD = '#D9A93C'       // Stupa-Spitze
const STUPA = '#F6F3EA'
const WATER = '#A9C8D4'
// Gebetsfahnen in ihrer traditionellen Reihenfolge: blau, weiß, rot, grün, gelb.
const FLAGS = ['#3D6FB6', '#F6F4EE', '#D8604F', '#5E9A6A', '#E8C04B']
// Die bunt gestrichenen Holzboote auf dem Phewa-See.
const BOATS = ['#D8604F', '#3D6FB6', '#E8C04B']

const THEMES = {
  tal: { sky: ['#E9E7DA', '#EEE9DC', '#F2ECDF'], far: '#DAD9C6', near: '#B9C89E', period: 360, amp: 30 },
  huegel: { sky: ['#E5ECDA', '#ECEDDC', '#F1EEDF'], far: '#D3DEC2', near: '#A8C28C', period: 300, amp: 34 },
  see: { sky: ['#DBE7EC', '#E3EBE9', '#EDEBE1'], far: '#CBD9D6', near: '#9CBDA2', period: 380, amp: 26 },
  berge: { sky: ['#D8E3EE', '#E3EAEE', '#EEEDE7'], far: '#D2D9DE', near: '#B7C5B6', period: 360, amp: 32 },
}
const themeOf = b => THEMES[b.theme] || THEMES.berge

// ─── Requisiten ──────────────────────────────────────────────────────────────
function tree(x, baseY, s, key, c1 = '#5E8A6A', c2 = '#6E9A78') {
  return (
    <g key={key}>
      <rect x={x - 2 * s} y={baseY} width={4 * s} height={9 * s} fill="#7A6242" />
      <polygon points={`${x},${baseY - 20 * s} ${x - 12 * s},${baseY + 2 * s} ${x + 12 * s},${baseY + 2 * s}`} fill={c1} />
      <polygon points={`${x},${baseY - 30 * s} ${x - 9 * s},${baseY - 7 * s} ${x + 9 * s},${baseY - 7 * s}`} fill={c2} />
    </g>
  )
}
// Stupa im Stil von Boudhanath: Stufensockel, weiße Kuppel, goldener Turm mit Augen.
function stupa(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 26 * s} y={baseY - 6 * s} width={52 * s} height={6 * s} fill="#E6E0D0" />
      <rect x={x - 21 * s} y={baseY - 11 * s} width={42 * s} height={5 * s} fill="#ECE7DA" />
      <path d={`M${x - 18 * s},${baseY - 11 * s} A${18 * s},${15 * s} 0 0 1 ${x + 18 * s},${baseY - 11 * s} Z`} fill={STUPA} />
      <rect x={x - 6 * s} y={baseY - 33 * s} width={12 * s} height={8 * s} fill={GOLD} />
      <path d={`M${x - 4.2 * s},${baseY - 29.5 * s} q${1.4 * s},${-1.4 * s} ${2.8 * s},0 M${x + 1.4 * s},${baseY - 29.5 * s} q${1.4 * s},${-1.4 * s} ${2.8 * s},0`}
        fill="none" stroke="#3A3226" strokeWidth={0.9 * s} strokeLinecap="round" />
      <polygon points={`${x - 5 * s},${baseY - 33 * s} ${x + 5 * s},${baseY - 33 * s} ${x},${baseY - 52 * s}`} fill={GOLD} />
      <rect x={x - 3.5 * s} y={baseY - 54 * s} width={7 * s} height={2 * s} rx={1 * s} fill="#C4932C" />
    </g>
  )
}
// Gebetsfahnen-Leine zwischen zwei Punkten, leicht durchhängend.
function flagLine(x1, y1, x2, y2, s, key) {
  const n = 9
  const sag = 7 * s
  const at = t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + sag * 4 * t * (1 - t)]
  const flags = []
  for (let i = 1; i < n; i++) {
    const [fx, fy] = at(i / n)
    flags.push(<rect key={i} x={fx - 2.2 * s} y={fy} width={4.4 * s} height={5.5 * s} fill={FLAGS[(i - 1) % 5]} opacity="0.9" />)
  }
  const [mx, my] = at(0.5)
  return (
    <g key={key}>
      <path d={`M${x1},${y1} Q${mx},${my + sag} ${x2},${y2}`} fill="none" stroke="#9A9080" strokeWidth={0.7 * s} />
      {flags}
    </g>
  )
}
// Ziegelhaus mit flachem Ziegeldach (Kathmandu-Tal).
function brickHouse(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 9 * s} y={baseY - 16 * s} width={18 * s} height={16 * s} fill={BRICK} />
      <polygon points={`${x - 12 * s},${baseY - 16 * s} ${x + 12 * s},${baseY - 16 * s} ${x + 8 * s},${baseY - 21 * s} ${x - 8 * s},${baseY - 21 * s}`} fill={ROOF} />
      <rect x={x - 5.5 * s} y={baseY - 12 * s} width={3.5 * s} height={4 * s} fill="#5A3E30" />
      <rect x={x + 2 * s} y={baseY - 12 * s} width={3.5 * s} height={4 * s} fill="#5A3E30" />
    </g>
  )
}
// Bauernhaus, hell verputzt, Strohdach (Hügel).
function farmHouse(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 8 * s} y={baseY - 9 * s} width={16 * s} height={9 * s} fill="#F1E4C8" />
      <rect x={x - 8 * s} y={baseY - 3 * s} width={16 * s} height={3 * s} fill="#C98A5E" />
      <polygon points={`${x - 11 * s},${baseY - 9 * s} ${x + 11 * s},${baseY - 9 * s} ${x},${baseY - 17 * s}`} fill="#A98E5E" />
    </g>
  )
}
// Terrassenfelder: drei übereinander gestaffelte, gewölbte Streifen.
function terraces(x, y, s, key, flip) {
  const tones = ['#C5D79E', '#B3CB8A', '#D4DFA6']
  return (
    <g key={key}>
      {tones.map((c, i) => {
        const w = (30 - i * 6) * s, yy = y + i * 7 * s, dx = flip * i * 3 * s
        return <path key={i} d={`M${x + dx - w},${yy + 6 * s} Q${x + dx},${yy - 3 * s} ${x + dx + w},${yy + 6 * s} Z`} fill={c} />
      })}
    </g>
  )
}
// See mit Lichtstreifen und einem bunten Boot (Pokhara).
function lake(x, y, s, key) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={34 * s} ry={12 * s} fill={WATER} />
      <rect x={x - 18 * s} y={y - 3 * s} width={22 * s} height={1.4 * s} rx={0.7 * s} fill="#FFFFFF" opacity="0.5" />
      <rect x={x - 4 * s} y={y + 3 * s} width={18 * s} height={1.4 * s} rx={0.7 * s} fill="#FFFFFF" opacity="0.4" />
      {boat(x + 12 * s, y - 1 * s, s * 0.9, 'b')}
    </g>
  )
}
function boat(x, y, s, key, color = '#D8604F') {
  return <path key={key} d={`M${x - 9 * s},${y} Q${x},${y + 5 * s} ${x + 9 * s},${y} L${x + 6 * s},${y + 1.5 * s} L${x - 6 * s},${y + 1.5 * s} Z`} fill={color} />
}
function reeds(x, baseY, s, key) {
  return (
    <g key={key} stroke="#7E9B78" strokeWidth={1.2 * s} strokeLinecap="round">
      <line x1={x} y1={baseY} x2={x - 2 * s} y2={baseY - 10 * s} />
      <line x1={x + 3 * s} y1={baseY} x2={x + 4 * s} y2={baseY - 12 * s} />
      <line x1={x + 6 * s} y1={baseY} x2={x + 8 * s} y2={baseY - 8 * s} />
    </g>
  )
}
// Himalaya-Gipfel mit breiter Schneekappe – größer und schroffer als ein Hügel.
function peak(x, baseY, s, key, color = '#C3CDD3') {
  return (
    <g key={key}>
      <polygon points={`${x - 22 * s},${baseY} ${x - 3 * s},${baseY - 34 * s} ${x + 2 * s},${baseY - 30 * s} ${x + 22 * s},${baseY}`} fill={color} />
      <polygon points={`${x - 10 * s},${baseY - 18 * s} ${x - 3 * s},${baseY - 34 * s} ${x + 2 * s},${baseY - 30 * s} ${x + 9 * s},${baseY - 19 * s} ${x + 3 * s},${baseY - 21 * s} ${x - 1 * s},${baseY - 17 * s} ${x - 5 * s},${baseY - 21 * s}`} fill="#F7F6F1" />
    </g>
  )
}
// Chörten (kleiner Stupa am Bergweg).
function chorten(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 7 * s} y={baseY - 5 * s} width={14 * s} height={5 * s} fill="#E9E4D8" />
      <rect x={x - 5 * s} y={baseY - 12 * s} width={10 * s} height={7 * s} rx={2 * s} fill={STUPA} />
      <polygon points={`${x - 2.5 * s},${baseY - 12 * s} ${x + 2.5 * s},${baseY - 12 * s} ${x},${baseY - 20 * s}`} fill="#C9B48A" />
    </g>
  )
}
function rock(x, baseY, s, key) {
  return <polygon key={key} points={`${x - 7 * s},${baseY} ${x - 3 * s},${baseY - 6 * s} ${x + 2 * s},${baseY - 7 * s} ${x + 7 * s},${baseY}`} fill="#B4AEA0" />
}
function cloud(x, y, s, key, opacity = 0.55) {
  return (
    <g key={key} fill="#FFFFFF" opacity={opacity}>
      <ellipse cx={x} cy={y} rx={20 * s} ry={6.5 * s} />
      <ellipse cx={x - 9 * s} cy={y - 4 * s} rx={10 * s} ry={5 * s} />
      <ellipse cx={x + 8 * s} cy={y - 3 * s} rx={12 * s} ry={5.5 * s} />
    </g>
  )
}

// ─── Rücken ──────────────────────────────────────────────────────────────────
// Die letzte Stützstelle liegt exakt auf yBottom, damit Bänder nahtlos anschließen.
function verticalRidge(side, yTop, yBottom, offsetAt, color, key, W = 400) {
  let d = side === 'L' ? `M0,${yTop}` : `M${W},${yTop}`
  for (let yy = yTop; yy < yBottom; yy += 34) {
    const o = offsetAt(yy)
    d += ` L${side === 'L' ? o : W - o},${yy}`
  }
  const oEnd = offsetAt(yBottom)
  d += ` L${side === 'L' ? oEnd : W - oEnd},${yBottom}`
  d += side === 'L' ? ` L0,${yBottom} Z` : ` L${W},${yBottom} Z`
  return <path key={key} d={d} fill={color} />
}

// Ferner Rücken liegt immer jenseits des nahen (Minimum 94 > Maximum 58+34), sonst
// kreuzen sich die Schichten und tauchen als Keile wieder auf.
const FAR_BASE = 104, FAR_AMP = 10
const TRANSITION_PX = 70

function bandOffset(b, bi, y, layer, side) {
  const t = themeOf(b)
  if (layer === 'far') return FAR_BASE + FAR_AMP * Math.sin(y / (t.period + (side === 'L' ? 200 : 240)) + (side === 'L' ? 0 : 1.4) + bi)
  return 58 + t.amp * Math.sin(y / (t.period + (side === 'L' ? 0 : 20)) + (side === 'L' ? 0.6 : 2.1) + bi)
}
// Form-Übergang an der Bandgrenze (smoothstep), sonst springt die Silhouette an jeder Naht.
function ridgeOffset(bands, bi, y, layer, side) {
  const b = bands[bi]
  const o = bandOffset(b, bi, y, layer, side)
  if (bi >= bands.length - 1) return o
  const zone = Math.min(TRANSITION_PX, (b.bottom - b.top) / 2)
  if (y < b.bottom - zone) return o
  const s = (y - (b.bottom - zone)) / zone
  return o + (bandOffset(bands[bi + 1], bi + 1, y, layer, side) - o) * s * s * (3 - 2 * s)
}
function jitter(y, salt = 0) {
  const v = Math.sin(y * 0.129898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// ─── Bestückung je Band ──────────────────────────────────────────────────────
function bandScenery(els, bands, bi, b, W) {
  const h = b.bottom - b.top
  if (h < 90) return
  let k = 0
  for (let yy = b.top + 44; yy < b.bottom - 34; yy += 62, k++) {
    const side = k % 2 ? 'R' : 'L'
    const near = ridgeOffset(bands, bi, yy, 'near', side)
    const j = jitter(yy, bi)
    const s = 0.75 + 0.4 * jitter(yy, bi + 40)
    const flip = side === 'L' ? 1 : -1
    const atValley = side === 'L' ? near + 14 : W - near - 14
    const terrainO = Math.max(16, near - 22 - 12 * j)
    const onTerrain = side === 'L' ? terrainO : W - terrainO
    const key = `p${bi}_${k}`

    if (b.theme === 'tal') {
      if (j < 0.4) els.push(brickHouse(onTerrain, yy, s, key))
      else if (j < 0.7) els.push(tree(atValley, yy, s, key))
      else els.push(flagLine(atValley - flip * 26 * s, yy - 18 * s, atValley + flip * 12 * s, yy - 8 * s, s, key))
    } else if (b.theme === 'huegel') {
      if (j < 0.5) els.push(terraces(onTerrain, yy - 10, s * 0.9, key, flip))
      else if (j < 0.75) els.push(farmHouse(atValley, yy, s, key))
      else els.push(tree(atValley, yy, s * 0.9, key))
    } else if (b.theme === 'see') {
      if (j < 0.45) els.push(reeds(atValley, yy, s, key))
      else if (j < 0.75) els.push(tree(onTerrain, yy, s, key, '#557E62', '#65906F'))
      else els.push(boat(atValley + flip * 6, yy, s, key, BOATS[Math.floor(jitter(yy, bi + 5) * BOATS.length)]))
    } else {
      if (j < 0.3) els.push(rock(atValley, yy, s, key))
      else if (j < 0.55) els.push(tree(atValley, yy, s, key, '#557E62', '#65906F'))
      else if (j < 0.8) els.push(chorten(atValley, yy, s, key))
      else els.push(flagLine(atValley - flip * 24 * s, yy - 20 * s, atValley + flip * 10 * s, yy - 6 * s, s, key))
    }
  }

  // Blickfänge je Thema, einmal pro Band.
  const mid = (b.top + b.bottom) / 2
  if (b.theme === 'tal' && h > 200) {
    const near = ridgeOffset(bands, bi, b.top + 90, 'near', 'R')
    els.push(stupa(W - Math.max(36, near - 8), b.top + 90, 0.95, `st${bi}`))
  }
  if (b.theme === 'see' && h > 200) {
    const near = ridgeOffset(bands, bi, mid, 'near', 'L')
    els.push(lake(Math.max(40, near), mid, 1, `lk${bi}`))
  }
  // Schneegipfel auf dem fernen Rücken: im Himalaya dicht, im Hügelland als ferne Ahnung.
  if (b.theme === 'berge' || b.theme === 'huegel') {
    const step = b.theme === 'berge' ? 120 : 260
    let pk = 0
    for (let yy = b.top + 70; yy < b.bottom - 40; yy += step, pk++) {
      const side = pk % 2 ? 'R' : 'L'
      const far = ridgeOffset(bands, bi, yy, 'far', side)
      const x = side === 'L' ? far - 6 : W - far + 6
      const s = b.theme === 'berge' ? 0.9 + 0.5 * jitter(yy, bi + 21) : 0.6
      els.push(peak(x, yy, s, `pk${bi}_${pk}`, b.theme === 'berge' ? '#C3CDD3' : '#CDD6D6'))
    }
  }
  let c = 0
  for (let yy = b.top + 120; yy < b.bottom - 60; yy += 300, c++) {
    if (jitter(yy, bi + 33) < 0.6) els.push(cloud(130 + 140 * jitter(yy, bi + 31), yy, 0.8 + 0.4 * jitter(yy, bi + 35), `cl${bi}_${c}`))
  }
}

// Hintergrund der Karte: `bands` = [{ top, bottom, theme }, …], lückenlos (der Aufrufer
// dehnt erstes/letztes Band auf die volle Höhe). Ergebnis: SVG-Elemente für ein
// <svg viewBox="0 0 400 H">.
export function buildBackdrop(bands) {
  const W = 400
  const totalTop = bands[0]?.top ?? 0
  const totalBottom = bands[bands.length - 1]?.bottom ?? 0
  const totalH = totalBottom - totalTop || 1
  const els = []

  // Ein Himmel-Verlauf über alles; Stops je Band leicht eingerückt → weiche Nähte.
  const skyStops = []
  bands.forEach(b => {
    const t = themeOf(b)
    const half = Math.min(TRANSITION_PX / 2, (b.bottom - b.top) * 0.2)
    skyStops.push(
      { o: (b.top + half - totalTop) / totalH, c: t.sky[0] },
      { o: ((b.top + b.bottom) / 2 - totalTop) / totalH, c: t.sky[1] },
      { o: (b.bottom - half - totalTop) / totalH, c: t.sky[2] },
    )
  })
  els.push(
    <linearGradient key="skyGrad" id="yatraSky" gradientUnits="userSpaceOnUse" x1="0" y1={totalTop} x2="0" y2={totalBottom}>
      {skyStops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}
    </linearGradient>,
    <rect key="sky" x="0" y={totalTop} width={W} height={totalH} fill="url(#yatraSky)" />,
  )

  bands.forEach((b, bi) => {
    const t = themeOf(b)
    // Jedes Band blendet nur zur Farbe des NÄCHSTEN – an der Naht treffen sich gleiche Farben.
    const next = bi < bands.length - 1 ? themeOf(bands[bi + 1]) : t
    const tFrac = Math.min(0.4, TRANSITION_PX / Math.max(1, b.bottom - b.top))
    const farId = `yatraFar${bi}`, nearId = `yatraNear${bi}`
    els.push(
      <linearGradient key={`fg${bi}`} id={farId} gradientUnits="userSpaceOnUse" x1="0" y1={b.top} x2="0" y2={b.bottom}>
        <stop offset="0" stopColor={t.far} /><stop offset={1 - tFrac} stopColor={t.far} /><stop offset="1" stopColor={next.far} />
      </linearGradient>,
      <linearGradient key={`ng${bi}`} id={nearId} gradientUnits="userSpaceOnUse" x1="0" y1={b.top} x2="0" y2={b.bottom}>
        <stop offset="0" stopColor={t.near} /><stop offset={1 - tFrac} stopColor={t.near} /><stop offset="1" stopColor={next.near} />
      </linearGradient>,
    )
    els.push(verticalRidge('L', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'far', 'L'), `url(#${farId})`, `fl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'far', 'R'), `url(#${farId})`, `fr${bi}`))
    els.push(verticalRidge('L', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'near', 'L'), `url(#${nearId})`, `nl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'near', 'R'), `url(#${nearId})`, `nr${bi}`))
    bandScenery(els, bands, bi, b, W)
  })
  return els
}

// Gebetsfahnen über dem Wegbeginn (Gegenstück zum Torii der japanischen Karte).
export function startFlags(x, y, key) {
  return flagLine(x - 46, y, x + 46, y + 4, 1.3, key)
}

// Glatter, gewundener Weg durch die Stationen.
export function roadPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], my = (a[1] + b[1]) / 2
    d += ` Q${a[0]},${my} ${(a[0] + b[0]) / 2},${my} T${b[0]},${b[1]}`
  }
  return d
}

// [Füllung, Rand] je Stationszustand – wie auf der japanischen Karte.
export const STATE_PALETTE = {
  done: ['#5E8A6A', '#4A7257'],
  current: ['#DA4A38', '#B23A2B'],
  locked: ['#E0DAC8', '#C7BFA9'],
}
