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
export function verticalRidge(side, yTop, yBottom, base, amp, period, phase, color, key, W = 400) {
  let d = side === 'L' ? `M0,${yTop} L${base},${yTop}` : `M${W},${yTop} L${W - base},${yTop}`
  for (let yy = yTop; yy <= yBottom; yy += 34) {
    const o = base + amp * Math.sin(yy / period + phase)
    d += ` L${side === 'L' ? o : W - o},${yy}`
  }
  d += side === 'L' ? ` L0,${yBottom} Z` : ` L${W},${yBottom} Z`
  return <path key={key} d={d} fill={color} />
}

// Kulissen-Themen je Reise-Welt: Land (Ankunft) → Berge (Natur/Aufstieg) →
// Stadt (Tokyo) → Tempelgarten (Schluss). `deco` ist die Dekor-Funktion entlang
// des nahen Rückens, `period`/`amp` formen die Silhouette (eng+hoch = Häuserzeile).
const SCENE_THEMES = {
  country: { sky: ['#E8EEDC', '#EEEEDC', '#F2EEDE'], far: '#DCE2CB', near: '#B9CE9F', period: 360, amp: 30, deco: sceneBush },
  mountain: { sky: ['#DCE7EE', '#E7EDE6', '#EEEADF'], far: '#D3DBD7', near: '#C0D2B9', period: 360, amp: 36, deco: sceneTree },
  city: { sky: ['#D3DEE8', '#DDE0E3', '#E9E4DA'], far: '#C6CCD5', near: '#5B6478', period: 140, amp: 30, deco: sceneWindow },
  garden: { sky: ['#E2E9DC', '#ECE8DB', '#F1E7DB'], far: '#CFD9C6', near: '#7F9C73', period: 360, amp: 30, deco: sceneLantern },
}

// Themen-Hintergrund für den Parallax-Track: `bands` = [{top,bottom,theme}, …],
// lückenlos aneinandergereiht (vom Aufrufer auf die volle Höhe ausgedehnt).
// Jedes Band bekommt eigenen Himmel, fernen/nahen Rücken und passendes Dekor –
// so wandelt sich die Kulisse mit der erzählten Welt statt einer Landschaft
// über die ganze Reise.
export function buildBackdrop(bands) {
  const W = 400
  const els = []
  bands.forEach((b, bi) => {
    const theme = SCENE_THEMES[b.theme] || SCENE_THEMES.mountain
    const gid = `tabiSky${bi}`
    els.push(
      <linearGradient key={`grad${bi}`} id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={theme.sky[0]} />
        <stop offset="0.5" stopColor={theme.sky[1]} />
        <stop offset="1" stopColor={theme.sky[2]} />
      </linearGradient>,
    )
    els.push(<rect key={`sky${bi}`} x="0" y={b.top} width={W} height={b.bottom - b.top} fill={`url(#${gid})`} />)
    // ferner, blasser Rücken
    els.push(verticalRidge('L', b.top, b.bottom, 96, 24, theme.period + 200, bi, theme.far, `fl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, 96, 24, theme.period + 240, 1.4 + bi, theme.far, `fr${bi}`))
    // naher Rücken
    els.push(verticalRidge('L', b.top, b.bottom, 58, theme.amp, theme.period, 0.6 + bi, theme.near, `nl${bi}`))
    els.push(verticalRidge('R', b.top, b.bottom, 58, theme.amp, theme.period + 20, 2.1 + bi, theme.near, `nr${bi}`))
    // Dekor entlang der nahen Rücken
    let k = 0
    for (let yy = b.top + 30; yy < b.bottom - 30; yy += 110, k++) {
      const lx = 58 + theme.amp * Math.sin(yy / theme.period + 0.6 + bi)
      els.push(theme.deco(lx + 16, yy, 0.8, `dl${bi}_${k}`))
      const ry = yy + 60
      if (ry < b.bottom - 20) {
        const rx = W - (58 + theme.amp * Math.sin(ry / (theme.period + 20) + 2.1 + bi))
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
