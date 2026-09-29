import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/store'
import { MONTHS, daysInMonth, dayKey } from '../lib/dates'
import { dayRate, doneThisWeek, perWeek } from '../lib/stats'
import { AddRow, Card, ChartTooltip, Check, ColorPicker, Dot, FreqSelect, StatChip, StatSelect, freqLabel } from '../components/ui'
import { habitStat } from '../lib/attributes'

export default function Habits() {
  const data = useData()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [editing, setEditing] = useState(null)

  const n = daysInMonth(ym.y, ym.m)
  const days = Array.from({ length: n }, (_, i) => new Date(ym.y, ym.m, i + 1))
  const todayKey = dayKey(now)
  const isFuture = (d) => dayKey(d) > todayKey

  const past = days.filter((d) => !isFuture(d))
  const trend = past.map((d) => ({ name: d.getDate(), rate: dayRate(data, dayKey(d)) }))
  const monthRate = past.length ? Math.round(trend.reduce((a, b) => a + b.rate, 0) / past.length) : 0
  const totalChecks = data.logs.filter((l) => l.day.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`)).length

  const shift = (k) => setYm(({ y, m }) => {
    const d = new Date(y, m + k, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h-xl">Habitudes</h1>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mois précédent">‹</button>
            <span className="month-label">{MONTHS[ym.m]} {ym.y}</span>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Mois suivant">›</button>
            <span className="muted">· Résumé mensuel</span>
          </div>
        </div>
      </div>

      <div className="month-pill" style={{ '--p': `${Math.max(monthRate, 4)}%` }}>
        <div className="month-pill-fill" />
        <span className="month-pill-text">QUOTIDIEN · {monthRate}% ce mois · {totalChecks} coches</span>
        <span className="month-pill-text on-fill" aria-hidden>QUOTIDIEN · {monthRate}% ce mois · {totalChecks} coches</span>
      </div>

      <Card title={<><Dot color="var(--mint)" /> Tendance</>}>
        <div className="chart-h180">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="linear" dataKey="rate" name="Réalisé %" stroke="var(--mint)" strokeWidth={2}
                dot={{ r: 3, fill: '#050607', stroke: 'var(--mint)', strokeWidth: 1.5 }}
                style={{ filter: 'drop-shadow(0 0 6px var(--mint))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="grid-card">
        <div className="habit-grid" style={{ '--days': n }}>
          <div className="hg-head hg-name">Habitude</div>
          {days.map((d) => (
            <div key={d.getDate()} className={`hg-head hg-day ${dayKey(d) === todayKey ? 'is-today' : ''}`}>{d.getDate()}</div>
          ))}
          <div className="hg-head" />

          {data.habits.map((h) => (
            <HabitRow key={h.id} h={h} days={days} isFuture={isFuture} todayKey={todayKey}
              editing={editing === h.id} setEditing={setEditing} />
          ))}
        </div>
        {data.habits.length === 0 && <p className="empty">Ajoute ta première habitude ci-dessous 👇</p>}
      </Card>

      <Card title="Nouvelle habitude">
        <AddRow placeholder="Ex : Réveil à 5h, Courir…" withColor withFreq withStat onAdd={({ text, color, freq, stat }) => data.addHabit(text, color, freq, stat)} />
      </Card>
    </>
  )
}

function HabitRow({ h, days, isFuture, todayKey, editing, setEditing }) {
  const data = useData()
  const [name, setName] = useState(h.name)

  return (
    <>
      <div className="hg-name hg-label">
        {editing ? (
          <div className="hg-edit">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { data.updateHabit(h.id, { name }); setEditing(null) } }} />
            <ColorPicker value={h.color} onChange={(c) => data.updateHabit(h.id, { color: c })} />
            <FreqSelect value={perWeek(h)} onChange={(n) => data.updateHabit(h.id, { per_week: n })} />
            <StatSelect value={h.stat} name={name} onChange={(v) => data.updateHabit(h.id, { stat: v })} />
            <div className="row-gap">
              <button className="btn-mint sm" onClick={() => { data.updateHabit(h.id, { name }); setEditing(null) }}>OK</button>
              <button className="btn-ghost sm danger" onClick={() => { if (window.confirm(`Supprimer « ${h.name} » ?`)) data.deleteHabit(h.id) }}>Supprimer</button>
            </div>
          </div>
        ) : (
          <>
            <Dot color={h.color} />
            <span className="hg-title-wrap">
              <span className="hg-title">{h.name} <StatChip k={habitStat(h)} /></span>
              {perWeek(h) < 7 && <span className="hg-freq">{freqLabel(perWeek(h))} · {doneThisWeek(data, h)}/{perWeek(h)} cette semaine</span>}
            </span>
          </>
        )}
      </div>
      {days.map((d) => {
        const k = dayKey(d)
        const fut = isFuture(d)
        return (
          <div key={k} className={`hg-cell ${k === todayKey ? 'is-today' : ''}`}>
            <Check on={data.isDone(h.id, k)} size={26} dim={fut}
              onClick={fut ? undefined : () => data.toggleLog(h.id, k)} title={`${h.name} — ${d.getDate()}`} />
          </div>
        )
      })}
      <div className="hg-cell">
        <button className="icon-btn" onClick={() => setEditing(editing ? null : h.id)} aria-label="Modifier">✎</button>
      </div>
    </>
  )
}
