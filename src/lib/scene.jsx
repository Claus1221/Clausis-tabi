// Kleine flache Landschafts-Motive (Bäume, Torii) als SVG-Gruppen.
export function sceneTree(x, baseY, s, key, c1 = '#5E8A6A', c2 = '#6E9A78') {
  return (
    <g key={key}>
      <rect x={x - 2 * s} y={baseY} width={4 * s} height={9 * s} fill="#7A6242" />
      <polygon points={`${x},${baseY - 20 * s} ${x - 12 * s},${baseY + 2 * s} ${x + 12 * s},${baseY + 2 * s}`} fill={c1} />
      <polygon points={`${x},${baseY - 30 * s} ${x - 9 * s},${baseY - 7 * s} ${x + 9 * s},${baseY - 7 * s}`} fill={c2} />
    </g>
  )
}
export function sceneTorii(x, y, s, key) {
  return (
    <g key={key}>
      <rect x={x - 15 * s} y={y} width={4.5 * s} height={28 * s} fill="#DA4A38" />
      <rect x={x + 10.5 * s} y={y} width={4.5 * s} height={28 * s} fill="#DA4A38" />
      <rect x={x - 21 * s} y={y - 7 * s} width={42 * s} height={6 * s} fill="#B23A2B" />
      <rect x={x - 17 * s} y={y} width={34 * s} height={4 * s} fill="#DA4A38" />
    </g>
  )
}
// Lichtfenster für die Stadt-Kulisse (kein eigener Körper – sitzt auf dem nahen Rücken).
function sceneWindow(x, baseY, s, key) {
  return <rect key={key} x={x - 3 * s} y={baseY - 10 * s} width={6 * s} height={8 * s} fill="#F4E0A0" opacity="0.85" />
}
// Runder Strauch für die Land-Kulisse.
function sceneBush(x, baseY, s, key, color = '#9FB58A') {
  return (
    <g key={key}>
      <ellipse cx={x} cy={baseY} rx={10 * s} ry={6 * s} fill={color} />
      <ellipse cx={x - 6 * s} cy={baseY + 2 * s} rx={6 * s} ry={4 * s} fill={color} />
    </g>
  )
}
// Steinlaterne (灯籠) für die Tempelgarten-Kulisse.
function sceneLantern(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 2 * s} y={baseY - 14 * s} width={4 * s} height={10 * s} fill="#8B8478" />
      <polygon points={`${x - 7 * s},${baseY - 14 * s} ${x + 7 * s},${baseY - 14 * s} ${x},${baseY - 22 * s}`} fill="#7A7468" />
      <rect x={x - 5 * s} y={baseY - 24 * s} width={10 * s} height={3 * s} fill="#7A7468" />
    </g>
  )
}

// Ein vertikaler Bergrücken (gewundene Silhouette) zwischen yTop und yBottom.
// `offsetAt(y)` liefert den Versatz von der Bildkante; die letzte Stützstelle
// liegt exakt auf yBottom, damit benachbarte Bänder nahtlos aneinanderschließen.
export function verticalRidge(side, yTop, yBottom, offsetAt, color, key, W = 400) {
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

// Kulissen-Themen je Reise-Welt: Land (Ankunft) → Berge (Natur/Aufstieg) →
// Stadt (Tokyo) → Tempelgarten (Schluss). `deco` ist die Dekor-Funktion entlang
// des nahen Rückens, `period`/`amp` formen die Silhouette (eng+hoch = Häuserzeile).
const SCENE_THEMES = {
  country: { sky: ['#E8EEDC', '#EEEEDC', '#F2EEDE'], far: '#DCE2CB', near: '#B9CE9F', period: 360, amp: 30, deco: sceneBush },
  mountain: { sky: ['#DCE7EE', '#E7EDE6', '#EEEADF'], far: '#D3DBD7', near: '#C0D2B9', period: 360, amp: 32, deco: sceneTree },
  city: { sky: ['#D3DEE8', '#DDE0E3', '#E9E4DA'], far: '#C6CCD5', near: '#5B6478', period: 140, amp: 30, deco: sceneWindow },
  garden: { sky: ['#E2E9DC', '#ECE8DB', '#F1E7DB'], far: '#CFD9C6', near: '#7F9C73', period: 360, amp: 30, deco: sceneLantern },
}

// Ferner Rücken: fester Rahmen VOR den Themen-Amplituden. min (104-10=94) liegt
// bewusst ÜBER dem Maximum der nahen Rücken (58+32=90) – kreuzen sich die
// Schichten, verschwinden Bänder abrupt hintereinander und tauchen als spitze
// Keile wieder auf (die „schlagartigen Wechsel" von früher).
const FAR_BASE = 104, FAR_AMP = 10

// Silhouetten-Versatz eines Bands an Höhe y (Basis + Sinuswelle des Themas).
function bandOffset(b, bi, y, layer, side) {
  const theme = SCENE_THEMES[b.theme] || SCENE_THEMES.mountain
  if (layer === 'far') {
    return FAR_BASE + FAR_AMP * Math.sin(y / (theme.period + (side === 'L' ? 200 : 240)) + (side === 'L' ? 0 : 1.4) + bi)
  }
  return 58 + theme.amp * Math.sin(y / (theme.period + (side === 'L' ? 0 : 20)) + (side === 'L' ? 0.6 : 2.1) + bi)
}

// Versatz MIT weichem Silhouetten-Übergang an der Bandgrenze: die Farb-Gradients
// blenden nur die FARBE – ohne dieses Blending springt die FORM an jeder Naht,
// weil jedes Band eigene Amplitude/Periode/Phase hat (smoothstep über dieselbe
// Übergangszone wie die Farben).
function ridgeOffset(bands, bi, y, layer, side) {
  const b = bands[bi]
  const o = bandOffset(b, bi, y, layer, side)
  if (bi >= bands.length - 1) return o
  const zone = Math.min(TRANSITION_PX, (b.bottom - b.top) / 2)
  if (y < b.bottom - zone) return o
  const s = (y - (b.bottom - zone)) / zone
  const sm = s * s * (3 - 2 * s)
  return o + (bandOffset(bands[bi + 1], bi + 1, y, layer, side) - o) * sm
}

// Themen-Hintergrund für den Parallax-Track: `bands` = [{top,bottom,theme}, …],
// lückenlos aneinandergereiht (vom Aufrufer auf die volle Höhe ausgedehnt).
// Jedes Band bekommt eigenen Himmel, fernen/nahen Rücken und passendes Dekor –
// so wandelt sich die Kulisse mit der erzählten Welt statt einer Landschaft
// über die ganze Reise. Die Bandgrenzen selbst sind weiche Verläufe (Himmel als
// EIN durchgehender Gradient, Rücken mit grenznahen Übergangs-Stops), damit kein
// harter Farbsprung zwischen z. B. Bergen und Stadt entsteht.
const TRANSITION_PX = 70 // Übergangs-Distanz an jeder Bandgrenze

export function buildBackdrop(bands) {
  const W = 400
  const totalTop = bands[0]?.top ?? 0
  const totalBottom = bands[bands.length - 1]?.bottom ?? 0
  const totalH = totalBottom - totalTop || 1
  const els = []

  // Ein durchgehender Himmel-Gradient über die volle Höhe statt eines Rechtecks
  // je Band: jedes Band setzt seine 3 Stops etwas EINGERÜCKT von der Bandgrenze
  // (nicht direkt darauf). Die so entstehende Lücke zwischen dem letzten Stop
  // eines Bands und dem ersten Stop des nächsten blendet von selbst weich –
  // weil beide Teil DESSELBEN Gradienten sind, nicht zweier getrennter.
  const skyStops = []
  bands.forEach(b => {
    const theme = SCENE_THEMES[b.theme] || SCENE_THEMES.mountain
    const half = Math.min(TRANSITION_PX / 2, (b.bottom - b.top) * 0.2)
    skyStops.push(
      { o: (b.top + half - totalTop) / totalH, c: theme.sky[0] },
      { o: ((b.top + b.bottom) / 2 - totalTop) / totalH, c: theme.sky[1] },
      { o: (b.bottom - half - totalTop) / totalH, c: theme.sky[2] },
    )
  })
  els.push(
    <linearGradient key="skyGrad" id="tabiSky" gradientUnits="userSpaceOnUse" x1="0" y1={totalTop} x2="0" y2={totalBottom}>
      {skyStops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}
    </linearGradient>,
  )
  els.push(<rect key="sky" x="0" y={totalTop} width={W} height={totalBottom - totalTop} fill="url(#tabiSky)" />)

  bands.forEach((b, bi) => {
    const theme = SCENE_THEMES[b.theme] || SCENE_THEMES.mountain
    // Nur der NÄCHSTE Nachbar zählt: jedes Band hält seine eigene Farbe bis kurz
    // vor dem Ende und blendet dort zur Farbe des nächsten Bands. Das vorige Band
    // hat sein Ende bereits genauso zur Farbe DIESES Bands hin ausgeblendet –
    // an der Nahtstelle (gemeinsame Grenz-Koordinate) stimmen beide exakt überein.
    // (Würde stattdessen jedes Band auch noch von der VORIGEN Farbe einblenden,
    // träfen sich an der Naht zwei unterschiedliche Farben statt einer.)
    const nextTheme = bi < bands.length - 1 ? (SCENE_THEMES[bands[bi + 1].theme] || theme) : theme
    const tFrac = Math.min(0.4, TRANSITION_PX / (b.bottom - b.top))
    const farGid = `tabiFar${bi}`, nearGid = `tabiNear${bi}`
    els.push(
      <linearGradient key={`fgrad${bi}`} id={farGid} gradientUnits="userSpaceOnUse" x1="0" y1={b.top} x2="0" y2={b.bottom}>
        <stop offset="0" stopColor={theme.far} />
        <stop offset={1 - tFrac} stopColor={theme.far} />
        <stop offset="1" stopColor={nextTheme.far} />
      </linearGradient>,
      <linearGradient key={`ngrad${bi}`} id={nearGid} gradientUnits="userSpaceOnUse" x1="0" y1={b.top} x2="0" y2={b.bottom}>
        <stop offset="0" stopColor={theme.near} />
        <stop offset={1 - tFrac} stopColor={theme.near} />
        <stop offset="1" stopColor={nextTheme.near} />
      </linearGradient>,
    )
    // ferner, blasser Rücken
    els.push(verticalRidge('L', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'far', 'L'), `url(#${farGid})`, `fl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'far', 'R'), `url(#${farGid})`, `fr${bi}`))
    // naher Rücken
    els.push(verticalRidge('L', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'near', 'L'), `url(#${nearGid})`, `nl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, y => ridgeOffset(bands, bi, y, 'near', 'R'), `url(#${nearGid})`, `nr${bi}`))
    // Dekor entlang der nahen Rücken (gleiche Versatz-Funktion wie die Silhouette)
    let k = 0
    for (let yy = b.top + 30; yy < b.bottom - 30; yy += 110, k++) {
      const lx = ridgeOffset(bands, bi, yy, 'near', 'L')
      els.push(theme.deco(lx + 16, yy, 0.8, `dl${bi}_${k}`))
      const ry = yy + 60
      if (ry < b.bottom - 20) {
        const rx = W - ridgeOffset(bands, bi, ry, 'near', 'R')
        els.push(theme.deco(rx - 16, ry, 0.7, `dr${bi}_${k}`))
      }
    }
    // vereinzelte, weiche Wolken
    if (b.bottom - b.top > 120) {
      els.push(<ellipse key={`c${bi}`} cx={bi % 2 ? 255 : 150} cy={(b.top + b.bottom) / 2} rx="32" ry="9" fill="#FFFFFF" opacity={b.theme === 'city' ? 0.25 : 0.4} />)
    }
  })
  return els
}

// Glatter Weg durch die Stationen (gewundene „Straße").
export function roadPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], my = (a[1] + b[1]) / 2
    d += ` Q${a[0]},${my} ${(a[0] + b[0]) / 2},${my} T${b[0]},${b[1]}`
  }
  return d
}

export const STATE_PALETTE = {
  done: ['#5E8A6A', '#4A7257'],
  current: ['#DA4A38', '#B23A2B'],
  locked: ['#E0DAC8', '#C7BFA9'],
}
