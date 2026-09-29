import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useData } from '../lib/store'
import { DAYS, DAYS_SHORT, dayKey, fmtNum, lastNDays } from '../lib/dates'
import { currentStreak, dayRate, doneThisWeek, isDue, perWeek } from '../lib/stats'
import { Card, ChartTooltip, Check, Dot, Ring } from '../components/ui'
import MindsetInput from '../components/MindsetInput'
import { PenaltyCard } from '../components/Penalty'
import { PlayerCard } from '../components/Rank'

export default function Today({ go, openSystem }) {
  const data = useData()
  const now = new Date()
  const today = dayKey(now)
  const rate = dayRate(data, today)
  const dueToday = data.habits.filter((h) => isDue(data, h, today))
  const doneCount = dueToday.filter((h) => data.isDone(h.id, today)).length

  const week = lastNDays(7).map((d) => ({
    name: DAYS_SHORT[d.getDay()],
    rate: dayRate(data, dayKey(d)),
    today: dayKey(d) === today,
  }))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h-xl">{DAYS[now.getDay()]}</h1>
          <p className="muted">{fmtNum(now)}</p>
        </div>
      </div>

      <PenaltyCard onOpen={openSystem} />
      <PlayerCard />

      <div className="grid-today">
        <Card title="Progression globale" className="span-2">
          <div className="chart-h200">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} barCategoryGap="28%">
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                <Bar dataKey="rate" name="Réalisé %" radius={[8, 8, 8, 8]} minPointSize={6}>
                  {week.map((d, i) => (
                    <Cell key={i} fill={d.today ? 'var(--mint)' : 'var(--mint-dim)'} style={{ filter: d.today ? 'drop-shadow(0 0 8px var(--mint))' : 'none' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="center-card">
          <Ring value={rate} size={170} stroke={13} />
          <p className="muted small">{doneCount}/{dueToday.length} habitudes du jour</p>
        </Card>

        <Card title="Habitudes du jour" className="span-2">
          {data.habits.length === 0 ? (
            <div className="empty">
              <p>Aucune habitude pour l'instant.</p>
              <button className="btn-mint" onClick={() => go('habits')}>Créer mes habitudes</button>
            </div>
          ) : (
            <ul className="today-list">
              {data.habits.map((h) => {
                const on = data.isDone(h.id, today)
                const streak = currentStreak(data, h.id)
                const per = perWeek(h)
                const rest = per < 7 && !isDue(data, h, today)
                return (
                  <li key={h.id} className={`today-item ${on ? 'done' : ''} ${rest ? 'optional' : ''}`} onClick={() => data.toggleLog(h.id, today)}>
                    <Check on={on} size={26} />
                    <span className="today-name">
                      <Dot color={h.color} /> {h.name}
                      {per < 7 && (
                        <small className={`today-week ${!rest && !on ? 'must' : ''}`}>
                          {doneThisWeek(data, h, today)}/{per} cette semaine{rest ? ' · repos possible' : !on ? ' · à faire aujourd\'hui' : ''}
                        </small>
                      )}
                    </span>
                    {streak > 0 && <span className="streak">🔥 {streak}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Mindset du jour">
          <MindsetInput day={today} />
        </Card>
      </div>
    </>
  )
}
