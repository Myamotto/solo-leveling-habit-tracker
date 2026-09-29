import { useEffect, useState } from 'react'
import { pad } from '../lib/dates'

// Temps restant avant minuit, mis à jour chaque seconde
export function useCountdown() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  const s = Math.max(0, Math.floor((end - now) / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

// Fenêtre du Système (style Solo Leveling). icon : '!' pour une alerte, sinon un texte court.
export function SysWindow({ title, icon = '!', tone = 'red', children }) {
  return (
    <div className="sys-overlay" role="dialog" aria-modal="true" aria-labelledby="sys-title">
      <div className="sys-window">
        <div className="sys-head">
          <span className={`sys-bang ${tone}`}>{icon}</span>
          <span id="sys-title">{title}</span>
        </div>
        <div className="sys-body">{children}</div>
      </div>
    </div>
  )
}
