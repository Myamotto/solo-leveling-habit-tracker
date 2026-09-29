import { useData } from '../lib/store'
import { parseDay, DAYS } from '../lib/dates'
import { SysWindow, useCountdown } from './System'

// Fenêtre bloquante du Système, tant que la pénalité n'est pas acceptée (ou rouverte depuis la carte)
export function SystemAlert({ open, onClose }) {
  const { penalty, updatePenalty } = useData()
  const left = useCountdown()
  if (!penalty || penalty.done || !(open || !penalty.accepted)) return null

  const missed = DAYS[parseDay(penalty.missed_day).getDay()].toLowerCase()
  const accept = () => {
    if (!penalty.accepted) updatePenalty(penalty.day, { accepted: true })
    onClose()
  }

  return (
    <SysWindow title="Alerte">
      <p className="sys-line">La quête journalière de {missed} n'a pas été accomplie <b>({penalty.missed_rate} %)</b>.</p>
      <p className="sys-line">Le joueur va recevoir une pénalité.</p>

      <div className="sys-quest">
        <span className="sys-tag">[Quête de pénalité]</span>
        <h2 className="sys-quest-title">{penalty.title}</h2>
        {penalty.detail && <p className="sys-quest-detail">{penalty.detail}</p>}
      </div>

      <div className="sys-timer">
        <span>Temps restant</span>
        <b>{left}</b>
      </div>
      <p className="sys-warn">Refuser n'est pas une option. Une pénalité non accomplie rend la suivante plus lourde.</p>

      <button className="sys-btn" onClick={accept} autoFocus>
        {penalty.accepted ? 'Fermer' : 'Accepter'}
      </button>
    </SysWindow>
  )
}

// Carte sur la page Aujourd'hui, une fois la pénalité acceptée
export function PenaltyCard({ onOpen }) {
  const { penalty, updatePenalty } = useData()
  const left = useCountdown()
  if (!penalty) return null

  if (penalty.done) {
    return (
      <div className="penalty-card cleared">
        <span className="sys-tag">[Système]</span>
        <span>Pénalité accomplie : <b>{penalty.title}</b>. Ne recommence pas.</span>
      </div>
    )
  }

  return (
    <div className="penalty-card">
      <div className="penalty-main" onClick={onOpen}>
        <span className="sys-tag">[Quête de pénalité]</span>
        <strong className="penalty-title">{penalty.title}</strong>
        {penalty.detail && <span className="penalty-detail">{penalty.detail}</span>}
      </div>
      <div className="penalty-side">
        <span className="penalty-timer">{left}</span>
        <button
          className="sys-btn sm"
          onClick={() => {
            if (window.confirm('Pénalité vraiment accomplie ? Le Système te fait confiance.')) updatePenalty(penalty.day, { done: true })
          }}
        >
          Accomplie
        </button>
      </div>
    </div>
  )
}
