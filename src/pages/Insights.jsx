import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MINDSET, useData } from '../lib/store'
import { DAYS_SHORT, dayKey, lastNDays } from '../lib/dates'
import { avg, bestStreak, currentStreak, dayRate, habitRate } from '../lib/stats'
import { Card, ChartTooltip, Dot } from '../components/ui'

export default function Insights() {
  const data = useData()
  const last30 = lastNDays(30)
  const rates30 = last30.map((d) => dayRate(data, dayKey(d)))
  const rate30 = data.habits.length ? Math.round(rates30.reduce((a, b) => a + b, 0) / 30) : 0
  const perfectDays = data.habits.length ? rates30.filter((r) => r === 100).length : 0

  const perHabit = data.habits.map((h) => ({
    name: h.name,
    color: h.color,
    rate: habitRate(data, h.id, last30),
    streak: currentStreak(data, h.id),
    best: bestStreak(data, h.id),
  })).sort((a, b) => b.rate - a.rate)

  const topStreak = perHabit.reduce((m, h) => Math.max(m, h.best), 0)

  // Performance par jour de la semaine (90 derniers jours)
  const last90 = lastNDays(90)
  const byDow = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const ds = last90.filter((d) => d.getDay() === dow)
    return { name: DAYS_SHORT[dow], rate: data.habits.length ? Math.round(ds.reduce((a, d) => a + dayRate(data, dayKey(d)), 0) / ds.length) : 0 }
  })
  const bestDow = byDow.reduce((a, b) => (b.rate > a.rate ? b : a), byDow[0])

  // Mindset : jours « forts » (≥ 70 %) vs « faibles » en habitudes
  const mindsetSplit = MINDSET.map((m) => {
    const hi = [], lo = []
    last90.forEach((d) => {
      const v = data.mindsetByDay[dayKey(d)]?.[m.key]
      if (v == null) return
      ;(dayRate(data, dayKey(d)) >= 70 ? hi : lo).push(v)
    })
    return { ...m, hi: avg(hi), lo: avg(lo) }
  })

  return (
    <>
      <div className="page-head">
        <h1 className="h-xl">Insights</h1>
      </div>

      <div className="kpi-row">
        <Kpi value={`${rate30}%`} label="Réussite 30 j" />
        <Kpi value={perfectDays} label="Jours parfaits (30 j)" />
        <Kpi value={topStreak} label="Meilleure série" suffix=" j" />
        <Kpi value={data.habits.length} label="Habitudes actives" />
      </div>

      <div className="grid-2">
        <Card title="Réussite par habitude · 30 jours">
          {perHabit.length === 0 ? <p className="empty">Pas encore de données.</p> : (
            <ul className="bars">
              {perHabit.map((h) => (
                <li key={h.name}>
                  <div className="bars-top"><span><Dot color={h.color} /> {h.name}</span><b>{h.rate}%</b></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${h.rate}%`, background: h.color, boxShadow: `0 0 10px ${h.color}` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Jour le plus productif" right={bestDow?.rate > 0 && <span className="pill-mint sm">{bestDow.name}</span>}>
          <div className="chart-h220">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDow} barCategoryGap="30%">
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                <Bar dataKey="rate" name="Moyenne %" radius={[8, 8, 8, 8]} minPointSize={6}>
                  {byDow.map((d, i) => <Cell key={i} fill={d === bestDow && d.rate > 0 ? 'var(--mint)' : 'var(--mint-dim)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Séries en cours">
          {perHabit.length === 0 ? <p className="empty">Pas encore de données.</p> : (
            <table className="streaks">
              <thead><tr><th>Habitude</th><th>Actuelle</th><th>Record</th></tr></thead>
              <tbody>
                {[...perHabit].sort((a, b) => b.streak - a.streak).map((h) => (
                  <tr key={h.name}>
                    <td><Dot color={h.color} /> {h.name}</td>
                    <td className={h.streak ? 'mint' : 'muted'}>{h.streak ? `🔥 ${h.streak} j` : '–'}</td>
                    <td>{h.best} j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Mindset vs habitudes · 90 jours">
          <p className="muted small">Moyenne quand tu fais ≥ 70 % de tes habitudes vs les autres jours.</p>
          <div className="split">
            {mindsetSplit.map((m) => (
              <div key={m.key} className="split-row">
                <span className="split-label"><Dot color={m.color} /> {m.label}</span>
                <span className="split-val" style={{ color: m.color }}>{m.hi ?? '–'}</span>
                <span className="muted">vs</span>
                <span className="split-val muted">{m.lo ?? '–'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

const Kpi = ({ value, label, suffix = '' }) => (
  <div className="card kpi-card">
    <div className="kpi-big">{value}{suffix}</div>
    <div className="kpi-label">{label}</div>
  </div>
)
