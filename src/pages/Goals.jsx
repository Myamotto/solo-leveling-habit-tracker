import { useData } from '../lib/store'
import { fmtNum, parseDay } from '../lib/dates'
import { AddRow, Card, Check, Ring } from '../components/ui'

export default function Goals() {
  const data = useData()
  return (
    <>
      <div className="page-head">
        <h1 className="h-xl">Objectifs</h1>
      </div>

      <Card title="Nouvel objectif">
        <AddRow placeholder="Ex : Courir un semi-marathon" withDate withColor cta="Créer"
          onAdd={({ text, date, color }) => data.addGoal(text, date, color)} />
      </Card>

      {data.goals.length === 0 && <p className="empty">Aucun objectif pour l'instant. Fixe-toi un cap 🎯</p>}

      <div className="goal-grid">
        {data.goals.map((g) => <GoalCard key={g.id} g={g} />)}
      </div>
    </>
  )
}

function GoalCard({ g }) {
  const data = useData()
  const steps = data.steps.filter((s) => s.goal_id === g.id).sort((a, b) => a.position - b.position)
  const done = steps.filter((s) => s.done).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0

  let countdown = null
  if (g.deadline) {
    const diff = Math.ceil((parseDay(g.deadline) - new Date().setHours(0, 0, 0, 0)) / 864e5)
    countdown = diff > 0 ? `J-${diff}` : diff === 0 ? "Aujourd'hui" : `Dépassé de ${-diff} j`
  }

  return (
    <Card className="goal-card">
      <div className="goal-top">
        <div>
          <h3 className="goal-title">{g.title}</h3>
          {g.deadline && <p className="muted small">{fmtNum(parseDay(g.deadline))} · <b style={{ color: g.color }}>{countdown}</b></p>}
        </div>
        <Ring value={pct} size={86} stroke={8} color={g.color} />
      </div>

      <div className="step-head">Étapes <span className="muted">{done}/{steps.length}</span></div>
      <ul className="steps">
        {steps.map((s) => (
          <li key={s.id} className={`step ${s.done ? 'done' : ''}`}>
            <Check on={s.done} size={22} color={g.color} onClick={() => data.toggleStep(s.id)} />
            <span>{s.title}</span>
            <button className="icon-btn ghost" onClick={() => data.deleteStep(s.id)} aria-label="Supprimer l'étape">×</button>
          </li>
        ))}
      </ul>
      <AddRow placeholder="Ajouter une étape" cta="+" onAdd={({ text }) => data.addStep(g.id, text)} />
      <button className="btn-ghost sm danger goal-del" onClick={() => { if (window.confirm(`Supprimer l'objectif « ${g.title} » ?`)) data.deleteGoal(g.id) }}>
        Supprimer l'objectif
      </button>
    </Card>
  )
}
