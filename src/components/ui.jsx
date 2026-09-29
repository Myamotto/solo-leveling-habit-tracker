import { useState } from 'react'
import { PALETTE } from '../lib/store'
import { STATS, detectStat, statOf } from '../lib/attributes'

// Anneau de progression néon (comme les cartes de la vidéo)
export function Ring({ value = 0, size = 120, stroke = 10, color = 'var(--mint)', label, sub }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ring-track)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: value > 0 ? `drop-shadow(0 0 6px ${color})` : 'none', transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-label">
        <span style={{ fontSize: size * 0.2 }}>{label ?? `${value}%`}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  )
}

// Cercle cochable
export function Check({ on, onClick, size = 30, color = 'var(--mint)', title, dim }) {
  return (
    <button
      type="button"
      className={`check ${on ? 'on' : ''} ${dim ? 'dim' : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={on}
      style={{ width: size, height: size, '--c': color }}
    >
      {on && (
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55}>
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#04110d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export function Card({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          {title && <h3 className="card-title">{title}</h3>}
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export const Dot = ({ color, size = 8 }) => (
  <span className="dot" style={{ background: color, width: size, height: size, boxShadow: `0 0 8px ${color}` }} />
)

export function ColorPicker({ value, onChange }) {
  return (
    <div className="palette">
      {PALETTE.map((c) => (
        <button
          key={c} type="button" className={`swatch ${value === c ? 'sel' : ''}`}
          style={{ background: c }} onClick={() => onChange(c)} aria-label={c}
        />
      ))}
    </div>
  )
}

export const freqLabel = (per) => (per >= 7 ? 'Tous les jours' : `${per}× / semaine`)

// Choix de fréquence d'une habitude
export function FreqSelect({ value, onChange }) {
  return (
    <select className="freq-select" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Fréquence">
      {[7, 6, 5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{freqLabel(n)}</option>)}
    </select>
  )
}

// Choix de la stat nourrie par une habitude. value '' = automatique (d'après le nom)
export function StatSelect({ value, name, onChange }) {
  const auto = statOf(detectStat(name))
  return (
    <select className="freq-select" value={value || ''} onChange={(e) => onChange(e.target.value || null)} aria-label="Stat">
      <option value="">{auto ? `Auto : ${auto.label}` : 'Auto : non reconnue'}</option>
      {STATS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  )
}

export const StatChip = ({ k }) => {
  const s = statOf(k)
  return s
    ? <span className="stat-chip" style={{ '--c': s.color }} title={s.label}>{s.short}</span>
    : <span className="stat-chip unknown" title="Stat non reconnue : choisis-la avec ✎">?</span>
}

// Formulaire d'ajout en une ligne
export function AddRow({ placeholder, onAdd, withColor, withDate, withFreq, withStat, cta = 'Ajouter' }) {
  const [text, setText] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [date, setDate] = useState('')
  const [freq, setFreq] = useState(7)
  const [stat, setStat] = useState(null)
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ text: text.trim(), color, date, freq, stat: stat || detectStat(text) })
    setText('')
    setStat(null)
    setDate('')
  }
  return (
    <form className="add-row" onSubmit={submit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      {withFreq && <FreqSelect value={freq} onChange={setFreq} />}
      {withStat && <StatSelect value={stat} name={text} onChange={setStat} />}
      {withDate && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="date-input" />}
      {withColor && <ColorPicker value={color} onChange={setColor} />}
      <button className="btn-mint" type="submit">{cta}</button>
    </form>
  )
}

export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      <div className="tip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tip-row">
          <Dot color={p.color || p.stroke} size={6} /> {p.name} <b>{p.value ?? '–'}</b>
        </div>
      ))}
    </div>
  )
}
