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

// ─── Requisiten für die Kulissen ─────────────────────────────────────────────
// Bauernhaus mit dunklem Dach (Land).
function sceneHouse(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 9 * s} y={baseY - 10 * s} width={18 * s} height={10 * s} fill="#F1E8D4" />
      <polygon points={`${x - 12 * s},${baseY - 10 * s} ${x + 12 * s},${baseY - 10 * s} ${x},${baseY - 20 * s}`} fill="#8A6F55" />
      <rect x={x - 2 * s} y={baseY - 6 * s} width={4 * s} height={6 * s} fill="#9C8163" />
    </g>
  )
}
// Reisfeld-Terrasse mit hellen Wasserlinien (Land).
function sceneField(x, y, s, key, tone) {
  return (
    <g key={key}>
      <rect x={x - 17 * s} y={y} width={34 * s} height={13 * s} rx={4 * s} fill={tone} />
      <rect x={x - 13 * s} y={y + 3.5 * s} width={26 * s} height={1.5 * s} rx={0.7 * s} fill="#FFFFFF" opacity="0.4" />
      <rect x={x - 13 * s} y={y + 8 * s} width={26 * s} height={1.5 * s} rx={0.7 * s} fill="#FFFFFF" opacity="0.4" />
    </g>
  )
}
// Ferner Gipfel mit Schneekappe (Berge) – sitzt auf der Kante des fernen Rückens.
function scenePeak(x, baseY, s, key, color = '#C6D1CC') {
  return (
    <g key={key}>
      <polygon points={`${x - 17 * s},${baseY} ${x},${baseY - 24 * s} ${x + 17 * s},${baseY}`} fill={color} />
      <polygon points={`${x - 6 * s},${baseY - 15.5 * s} ${x},${baseY - 24 * s} ${x + 6 * s},${baseY - 15.5 * s} ${x + 3 * s},${baseY - 13 * s} ${x},${baseY - 16 * s} ${x - 3 * s},${baseY - 13 * s}`} fill="#F7F5EF" />
    </g>
  )
}
// Fels (Berge).
function sceneRock(x, baseY, s, key) {
  return <polygon key={key} points={`${x - 7 * s},${baseY} ${x - 3 * s},${baseY - 6 * s} ${x + 2 * s},${baseY - 7 * s} ${x + 7 * s},${baseY}`} fill="#B4AEA0" />
}
// Vogel-Paar (Himmel).
function sceneBirds(x, y, s, key) {
  const wing = (cx, cy) => `M${cx - 5 * s},${cy} Q${cx - 2.5 * s},${cy - 3.4 * s} ${cx},${cy} Q${cx + 2.5 * s},${cy - 3.4 * s} ${cx + 5 * s},${cy}`
  return <path key={key} d={`${wing(x, y)} ${wing(x + 13 * s, y - 6 * s)}`} fill="none" stroke="#8A94A0" strokeWidth={1.3 * s} strokeLinecap="round" />
}
// Weiche Wolke aus drei Ellipsen (Himmel).
function sceneCloud(x, y, s, key, opacity = 0.55) {
  return (
    <g key={key} fill="#FFFFFF" opacity={opacity}>
      <ellipse cx={x} cy={y} rx={20 * s} ry={6.5 * s} />
      <ellipse cx={x - 9 * s} cy={y - 4 * s} rx={10 * s} ry={5 * s} />
      <ellipse cx={x + 8 * s} cy={y - 3 * s} rx={12 * s} ry={5.5 * s} />
    </g>
  )
}
// Sonne mit weichem Hof (Land).
function sceneSun(x, y, s, key) {
  return (
    <g key={key}>
      <circle cx={x} cy={y} r={14 * s} fill="#F5D98A" opacity="0.35" />
      <circle cx={x} cy={y} r={8.5 * s} fill="#F5D98A" opacity="0.9" />
    </g>
  )
}
// Hochhaus mit leuchtenden Fenstern (Stadt). `body` hell genug wählen, wenn das
// Haus AUF dem dunklen Stadt-Rücken steht (sonst schweben nur die Fenster).
function sceneBuilding(x, baseY, s, key, floors = 3, body = '#5B6478') {
  const w = 14 * s, hh = floors * 8 * s
  const win = []
  for (let f = 0; f < floors; f++) {
    win.push(<rect key={`w${f}`} x={x - 4.6 * s} y={baseY - hh + f * 8 * s + 2.4 * s} width={3.4 * s} height={3.6 * s} fill="#F4E0A0" opacity="0.9" />)
    win.push(<rect key={`v${f}`} x={x + 1.2 * s} y={baseY - hh + f * 8 * s + 2.4 * s} width={3.4 * s} height={3.6 * s} fill="#F4E0A0" opacity="0.7" />)
  }
  return (
    <g key={key}>
      <rect x={x - w / 2} y={baseY - hh} width={w} height={hh} rx={1.5 * s} fill={body} />
      <rect x={x - 0.8 * s} y={baseY - hh - 4 * s} width={1.6 * s} height={4 * s} fill={body} />
      {win}
    </g>
  )
}
// Tokyo-Tower-Silhouette (Stadt).
function sceneTower(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 1 * s} y={baseY - 34 * s} width={2 * s} height={7 * s} fill="#D8604F" />
      <polygon points={`${x - 11 * s},${baseY} ${x - 2 * s},${baseY - 27 * s} ${x + 2 * s},${baseY - 27 * s} ${x + 11 * s},${baseY}`} fill="#D8604F" />
      <rect x={x - 7.6 * s} y={baseY - 9 * s} width={15.2 * s} height={2.2 * s} fill="#F4F1E8" />
      <rect x={x - 4.8 * s} y={baseY - 18 * s} width={9.6 * s} height={2 * s} fill="#F4F1E8" />
    </g>
  )
}
// Teich mit zwei Koi (Tempelgarten).
function scenePond(x, y, s, key) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={17 * s} ry={9 * s} fill="#AECAD3" />
      <ellipse cx={x - 4 * s} cy={y - 2.5 * s} rx={8 * s} ry={3 * s} fill="#C9DDE3" opacity="0.9" />
      <circle cx={x + 5 * s} cy={y + 2 * s} r={1.8 * s} fill="#E58A4E" />
      <circle cx={x - 3 * s} cy={y + 4 * s} r={1.4 * s} fill="#E5B04E" />
    </g>
  )
}
// Kirschbaum in Blüte (Tempelgarten).
function sceneSakura(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 1.6 * s} y={baseY - 7 * s} width={3.2 * s} height={8 * s} fill="#7A6242" />
      <circle cx={x} cy={baseY - 12 * s} r={7.5 * s} fill="#EFC4CE" />
      <circle cx={x - 6.5 * s} cy={baseY - 8 * s} r={5 * s} fill="#F3D2DA" />
      <circle cx={x + 6.5 * s} cy={baseY - 8 * s} r={5.5 * s} fill="#E9B4C1" />
    </g>
  )
}
// Ahorn in Herbstrot (Tempelgarten).
function sceneMomiji(x, baseY, s, key) {
  return (
    <g key={key}>
      <rect x={x - 1.5 * s} y={baseY - 6 * s} width={3 * s} height={7 * s} fill="#6E5138" />
      <circle cx={x} cy={baseY - 10.5 * s} r={6.5 * s} fill="#D8604F" />
      <circle cx={x - 5.5 * s} cy={baseY - 7 * s} r={4.4 * s} fill="#E07B5C" />
      <circle cx={x + 5.5 * s} cy={baseY - 7 * s} r={4.4 * s} fill="#C9584A" />
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
// Stadt (Tokyo) → Tempelgarten (Schluss). `period`/`amp` formen die Silhouette
// (eng+hoch = Häuserzeile); die Requisiten je Thema verteilt bandScenery().
const SCENE_THEMES = {
  country: { sky: ['#E8EEDC', '#EEEEDC', '#F2EEDE'], far: '#DCE2CB', near: '#B9CE9F', period: 360, amp: 30 },
  mountain: { sky: ['#DCE7EE', '#E7EDE6', '#EEEADF'], far: '#D3DBD7', near: '#C0D2B9', period: 360, amp: 32 },
  city: { sky: ['#D3DEE8', '#DDE0E3', '#E9E4DA'], far: '#C6CCD5', near: '#5B6478', period: 140, amp: 30 },
  garden: { sky: ['#E2E9DC', '#ECE8DB', '#F1E7DB'], far: '#CFD9C6', near: '#7F9C73', period: 360, amp: 30 },
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

// Deterministischer Pseudo-Zufall aus y (kein Math.random: die Kulisse soll
// bei jedem Render identisch stehen).
function jitter(y, salt = 0) {
  const v = Math.sin(y * 0.129898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// ─── Kulissen-Bestückung je Band ─────────────────────────────────────────────
// Statt weniger Rand-Bäume: je Thema eine erkennbare Landschaft. Requisiten
// stehen wechselseitig am Fuß der nahen Rücken (Talrand) und auf dem Terrain
// dahinter; Himmel bekommt Wolken/Vögel, jedes Band 1–2 Blickfänge (Sonne,
// Tokyo Tower, Teich, Schneegipfel-Kette).
function bandScenery(els, bands, bi, b, W) {
  const h = b.bottom - b.top
  if (h < 90) return
  let k = 0
  for (let yy = b.top + 44; yy < b.bottom - 34; yy += 58, k++) {
    const side = k % 2 ? 'R' : 'L'
    const near = ridgeOffset(bands, bi, yy, 'near', side)
    const j = jitter(yy, bi)
    const s = 0.75 + 0.45 * jitter(yy, bi + 40)
    const flip = side === 'L' ? 1 : -1
    const atValley = side === 'L' ? near + 14 : W - near - 14            // Talrand
    const terrainO = Math.max(16, near - 22 - 12 * j)                    // auf dem Rücken
    const onTerrain = side === 'L' ? terrainO : W - terrainO
    const key = `p${bi}_${k}`

    if (b.theme === 'country') {
      if (j < 0.3) els.push(sceneHouse(onTerrain, yy, s, key))
      else if (j < 0.62) els.push(sceneField(onTerrain, yy - 6, s * 0.9, key, jitter(yy, bi + 7) < 0.5 ? '#CBDCA8' : '#D8E4B4'))
      else {
        els.push(sceneBush(atValley, yy, s, key))
        if (jitter(yy, bi + 9) < 0.4) els.push(sceneBush(atValley + flip * 15 * s, yy + 8, s * 0.7, key + 'b'))
      }
    } else if (b.theme === 'mountain') {
      if (j < 0.34) {
        els.push(sceneTree(atValley, yy, s, key))
        els.push(sceneTree(atValley + flip * 14 * s, yy + 10, s * 0.65, key + 'b'))
      } else if (j < 0.62) els.push(sceneTree(onTerrain, yy, s, key, '#557E62', '#65906F'))
      else if (j < 0.8) els.push(sceneRock(atValley, yy, s, key))
      else els.push(sceneBush(atValley, yy, s * 0.9, key, '#7E9B78'))
    } else if (b.theme === 'city') {
      if (j < 0.6) {
        els.push(sceneBuilding(atValley, yy, s * 0.9, key, 2 + Math.floor(jitter(yy, bi + 11) * 3)))
        if (jitter(yy, bi + 13) < 0.45) els.push(sceneBuilding(atValley + flip * 13 * s, yy + 9, s * 0.65, key + 'b'))
      } else els.push(sceneBuilding(onTerrain, yy, s * 0.85, key, 2, '#79839E'))
    } else if (b.theme === 'garden') {
      if (j < 0.26) els.push(sceneSakura(atValley, yy, s, key))
      else if (j < 0.5) els.push(sceneMomiji(atValley, yy, s, key))
      else if (j < 0.68) els.push(sceneLantern(atValley, yy, s * 0.85, key))
      else els.push(sceneBush(atValley, yy, s * 0.9, key, '#8FAE7F'))
    }
  }

  // Schneegipfel-Kette auf dem fernen Rücken (nur Berge).
  if (b.theme === 'mountain') {
    let pk = 0
    for (let yy = b.top + 90; yy < b.bottom - 60; yy += 190, pk++) {
      const side = pk % 2 ? 'R' : 'L'
      const far = ridgeOffset(bands, bi, yy, 'far', side)
      const x = side === 'L' ? far - 5 : W - far + 5
      els.push(scenePeak(x, yy, 0.75 + 0.4 * jitter(yy, bi + 21), `pk${bi}_${pk}`))
    }
  }

  // Blickfänge: Sonne (Land), Tokyo Tower (Stadt), Teich + kleines Torii (Garten).
  const mid = (b.top + b.bottom) / 2
  if (b.theme === 'country') els.push(sceneSun(W - 72, b.top + 70, 1, `sun${bi}`))
  if (b.theme === 'city' && h > 220) {
    const near = ridgeOffset(bands, bi, mid, 'near', bi % 2 ? 'R' : 'L')
    const x = bi % 2 ? W - near - 18 : near + 18
    els.push(sceneTower(x, mid, 1.1, `tw${bi}`))
  }
  if (b.theme === 'garden' && h > 220) {
    const nearL = ridgeOffset(bands, bi, mid, 'near', 'L')
    els.push(scenePond(Math.max(26, nearL - 16), mid, 1, `po${bi}`))
    const nearR = ridgeOffset(bands, bi, mid + 130, 'near', 'R')
    if (mid + 130 < b.bottom - 50) els.push(sceneTorii(W - nearR - 16, mid + 130, 0.55, `to${bi}`))
  }

  // Himmel: weiche Wolken, im Grünen auch Vögel (nicht über der Stadtmitte zu grell).
  let c = 0
  for (let yy = b.top + 120; yy < b.bottom - 60; yy += 300, c++) {
    const jx = 130 + 140 * jitter(yy, bi + 31)
    if (jitter(yy, bi + 33) < 0.55) els.push(sceneCloud(jx, yy, 0.8 + 0.4 * jitter(yy, bi + 35), `cl${bi}_${c}`, b.theme === 'city' ? 0.3 : 0.55))
    else if (b.theme === 'mountain' || b.theme === 'country') els.push(sceneBirds(jx, yy, 1, `bd${bi}_${c}`))
  }
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
    // Landschafts-Requisiten, Blickfänge und Himmel dieses Bands
    bandScenery(els, bands, bi, b, W)
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
