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

// Ein durchgängiger, vertikaler Bergrücken (gewundene Silhouette) für den Hintergrund.
export function verticalRidge(side, H, base, amp, period, phase, color, key, W = 400) {
  let d = side === 'L' ? `M0,0 L${base},0` : `M${W},0 L${W - base},0`
  for (let yy = 0; yy <= H; yy += 34) {
    const o = base + amp * Math.sin(yy / period + phase)
    d += ` L${side === 'L' ? o : W - o},${yy}`
  }
  d += side === 'L' ? ` L0,${H} Z` : ` L${W},${H} Z`
  return <path key={key} d={d} fill={color} />
}

// Durchgängige Tal-Landschaft über die volle Höhe H (für den Parallax-Hintergrund).
export function buildBackdrop(H) {
  const W = 400
  const els = [<rect key="sky" x="0" y="0" width={W} height={H} fill="url(#tabiSky)" />]
  // ferne, blasse Rücken
  els.push(verticalRidge('L', H, 96, 26, 560, 0.0, '#D3DBD7', 'fl'))
  els.push(verticalRidge('R', H, 96, 26, 600, 1.4, '#D3DBD7', 'fr'))
  // nahe, grüne Rücken
  els.push(verticalRidge('L', H, 58, 36, 360, 0.6, '#C0D2B9', 'nl'))
  els.push(verticalRidge('R', H, 58, 36, 380, 2.1, '#C0D2B9', 'nr'))
  // Bäume entlang der nahen Rücken
  let k = 0
  for (let yy = 70; yy < H - 40; yy += 188, k++) {
    const lx = 58 + 36 * Math.sin(yy / 360 + 0.6)
    els.push(sceneTree(lx + 16, yy, 0.8, `btl${k}`, '#5E8A6A', '#6E9A78'))
    const rx = W - (58 + 36 * Math.sin((yy + 94) / 380 + 2.1))
    els.push(sceneTree(rx - 16, yy + 94, 0.7, `btr${k}`, '#5E8A6A', '#6E9A78'))
  }
  // wenige, weiche Wolken
  let c = 0
  for (let yy = 240; yy < H; yy += 820, c++) {
    els.push(<ellipse key={`bc${c}`} cx={c % 2 ? 255 : 150} cy={yy} rx="32" ry="9" fill="#FFFFFF" opacity="0.4" />)
  }
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
