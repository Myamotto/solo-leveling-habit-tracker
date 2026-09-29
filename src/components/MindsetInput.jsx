import { MINDSET, useData } from '../lib/store'
import { Dot } from './ui'

// Saisie 1–10 pour Humeur / Sommeil / Énergie
export default function MindsetInput({ day }) {
  const data = useData()
  const row = data.mindsetByDay[day] || {}
  return (
    <div className="mindset-input">
      {MINDSET.map((m) => (
        <div key={m.key} className="mi-row">
          <div className="mi-label"><Dot color={m.color} /> {m.label}</div>
          <div className="mi-scale">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                type="button"
                className={`mi-pip ${row[m.key] != null && v <= row[m.key] ? 'on' : ''}`}
                style={{ '--c': m.color }}
                onClick={() => data.setMindset(day, m.key, row[m.key] === v ? null : v)}
                title={`${m.label} : ${v}/10`}
              />
            ))}
          </div>
          <div className="mi-val" style={{ color: row[m.key] ? m.color : undefined }}>{row[m.key] ?? '–'}</div>
        </div>
      ))}
    </div>
  )
}
