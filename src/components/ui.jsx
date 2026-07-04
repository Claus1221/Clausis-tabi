import { C, JP } from '../theme.js'

// ─── Twemoji-Grafiken (CC-BY, in public/twemoji/) ────────────────────────────
// Name → Unicode-Codepoint; gerendert als <img> aus dem öffentlichen Ordner.
const EMOJI = {
  airplane: '2708', ship: '1f6a2', car: '1f697', train: '1f686', station: '1f689',
  city: '1f3d9', mountain: '26f0', fuji: '1f5fb', wave: '1f30a', river: '1f3de',
  water: '1f4a7', sun: '2600', tree: '1f332', tea: '1f375', coffee: '2615',
  bread: '1f35e', map: '1f5fa', rain: '1f327', bird: '1f426', dog: '1f415',
  cat: '1f431', fish: '1f41f', horse: '1f434', eye: '1f441', mouth: '1f444',
  hand: '270b', foot: '1f9b6', ear: '1f442', house: '1f3e0', hotel: '1f3e8',
  food: '1f374', taxi: '1f695', bus: '1f68c', torii: '26e9', oldwoman: '1f475',
  person: '1f9cd', star: '2b50', night: '1f303', party: '1f389', japan: '1f5fe', hello: '1f44b',
  up: '2b06', down: '2b07', right: '27a1', left: '2b05', door: '1f6aa', restroom: '1f6bb',
  man: '1f468', woman: '1f469', camera: '1f4f7', gift: '1f381', restaurant: '1f37d',
  elephant: '1f418', ant: '1f41c', sky: '1f324',
  bag: '1f392', ticket: '1f3ab', town: '1f3d8', road: '1f6e3', flower: '1f338',
  tree2: '1f333', rock: '1faa8', cloud: '2601', sunrise: '1f305', rice: '1f35a',
  meat: '1f356', chopsticks: '1f962', onigiri: '1f359', money: '1f4b4', metro: '1f687',
  hospital: '1f3e5', photo: '1f4f8', plant: '1fab4', bridge: '1f309', coin: '1fa99',
  gem: '1f48e', pricetag: '1f3f7', shopping: '1f6cd', airport: '1f6eb', luggage: '1f9f3',
  friends: '1f91d', bug: '1f41b', cow: '1f404', deer: '1f98c',
}
export function Emoji({ name, size = 48, style }) {
  const cp = EMOJI[name]
  if (!cp) return null
  return <img src={`${import.meta.env.BASE_URL}twemoji/${cp}.svg`} width={size} height={size} alt=""
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} />
}

// ─── Tiny components ─────────────────────────────────────────────────────────

export function TabBar({ active, setActive }) {
  const tabs = [
    { id: 'reise', label: '旅', sub: 'Reise' },
    { id: 'lernen', label: '辞書', sub: 'Bibliothek' },
    { id: 'ueben', label: '練習', sub: 'Üben' },
    { id: 'fortschritt', label: '進歩', sub: 'Fortschritt' },
  ]
  return (
    <nav style={{
      display: 'flex', borderTop: `1px solid ${C.washiDark}`,
      background: 'rgba(252,250,245,0.9)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      position: 'fixed', bottom: 0, left: 0, right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50, boxShadow: '0 -10px 24px -18px rgba(33,31,27,0.5)',
    }}>
      {tabs.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, padding: '9px 0 8px', border: 'none', background: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? C.shu : C.textMuted, position: 'relative',
            transition: 'color 0.25s ease',
          }}>
            <span aria-hidden="true" style={{
              position: 'absolute', top: 0, width: 4, height: 4, borderRadius: 99,
              background: C.shu, opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.3)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }} />
            <span style={{ fontSize: 20, fontFamily: JP, transform: on ? 'translateY(-1px)' : 'none', transition: 'transform 0.25s ease' }}>{t.label}</span>
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: 0.2 }}>{t.sub}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px',
      border: '1px solid rgba(33,31,27,0.05)',
      boxShadow: 'var(--shadow-card)', ...style,
    }}>{children}</div>
  )
}

export function Btn({ children, onClick, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.shu : variant === 'secondary' ? C.indigo : C.washiDark
  const color = variant === 'ghost' ? C.sumi : '#fff'
  const shadow = variant === 'primary' ? '0 2px 5px rgba(218,74,56,0.30), 0 8px 18px -10px rgba(218,74,56,0.5)'
    : variant === 'secondary' ? '0 2px 5px rgba(30,67,104,0.26), 0 8px 18px -10px rgba(30,67,104,0.45)'
    : 'none'
  return (
    <button onClick={onClick} className="tabi-press" style={{
      background: bg, color, border: 'none', borderRadius: 10,
      padding: '12px 24px', fontSize: 15, fontWeight: 600,
      fontFamily: 'inherit', cursor: 'pointer', boxShadow: shadow,
      transition: 'transform 0.12s ease, filter 0.12s ease', ...style,
    }}>{children}</button>
  )
}

export function Stars({ count, max = 5, size = 13, gap = 1 }) {
  return (
    <span style={{ display: 'inline-flex', gap, lineHeight: 1, whiteSpace: 'nowrap' }} aria-label={`${count} von ${max} Sternen`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize: size, color: i < count ? '#E8B84B' : C.washiDark }}>{i < count ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

// Bottom-Sheet-Hülle für die Nachschlage-Bibliotheken.
export function LibSheet({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 15, fontFamily: JP, color: C.indigo }}>{title}</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>
    </div>
  )
}
