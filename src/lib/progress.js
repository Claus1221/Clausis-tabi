// Aggregiert XP nach Zeitraum (Woche/Monat/Jahr) fuer die Fortschritt-Diagramme.
export function periodBuckets(xpByDate, period) {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const out = []
  if (period === 'woche') {
    const names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    for (let o = -6; o <= 0; o++) { const d = new Date(); d.setDate(d.getDate() + o); out.push({ label: names[d.getDay()], xp: xpByDate[fmt(d)] || 0 }) }
  } else if (period === 'monat') {
    for (let w = 3; w >= 0; w--) {
      let sum = 0
      for (let day = 0; day < 7; day++) { const d = new Date(); d.setDate(d.getDate() - (w * 7 + day)); sum += xpByDate[fmt(d)] || 0 }
      const s = new Date(); s.setDate(s.getDate() - (w * 7 + 6))
      out.push({ label: `${s.getDate()}.${s.getMonth() + 1}.`, xp: sum })
    }
  } else {
    const mn = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const sums = {}
    Object.keys(xpByDate).forEach(k => { const p = k.slice(0, 7); sums[p] = (sums[p] || 0) + (xpByDate[k] || 0) })
    for (let m = 11; m >= 0; m--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); out.push({ label: mn[d.getMonth()], xp: sums[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] || 0 }) }
  }
  return out
}
