import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MINDSET, useData } from '../lib/store'
import { DAYS_SHORT, dayKey, lastNDays } from '../lib/dates'
import { avg } from '../lib/stats'
import { Card, ChartTooltip, Dot } from '../components/ui'
import MindsetInput from '../components/MindsetInput'

const RANGES = [
  { id: 7, label: 'Cette semaine' },
  { id: 30, label: '30 jours' },
  { id: 90, label: '90 jours' },
]

export default function Mindset() {
  const data = useData()
  const [range, setRange] = useState(7)
  const [day, setDay] = useState(dayKey())

  const series = lastNDays(range).map((d) => {
    const row = data.mindsetByDay[dayKey(d)] || {}
    return {
      name: range === 7 ? DAYS_SHORT[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`,
      ...Object.fromEntries(MINDSET.map((m) => [m.key, row[m.key] ?? null])),
    }
  })

  return (
    <>
      <div className="page-head">
        <h1 className="h-xl">Mindset tracker</h1>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <Card
        title="Évolution"
        right={<div className="legend">{MINDSET.map((m) => <span key={m.key}><Dot color={m.color} size={7} /> {m.label}</span>)}</div>}
      >
        <div className="chart-h320">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              {MINDSET.map((m) => (
                <Line key={m.key} type="linear" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2.2}
                  dot={false} activeDot={{ r: 4 }} connectNulls style={{ filter: `drop-shadow(0 0 5px ${m.color})` }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Noter une journée" right={<input type="date" className="date-input" value={day} max={dayKey()} onChange={(e) => e.target.value && setDay(e.target.value)} />}>
          <MindsetInput day={day} />
        </Card>
        <Card title={`Moyennes · ${RANGES.find((r) => r.id === range).label}`}>
          <div className="kpis">
            {MINDSET.map((m) => {
              const v = avg(series.map((s) => s[m.key]))
              return (
                <div key={m.key} className="kpi">
                  <div className="kpi-val" style={{ color: m.color, textShadow: `0 0 18px ${m.color}66` }}>{v ?? '–'}</div>
                  <div className="kpi-label">{m.label}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </>
  )
}
