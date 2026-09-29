import { useEffect, useState } from 'react'
import { useData } from './lib/store'
import { fmtShort } from './lib/dates'
import Today from './pages/Today'
import Habits from './pages/Habits'
import Mindset from './pages/Mindset'
import Goals from './pages/Goals'
import Insights from './pages/Insights'
import { SystemAlert } from './components/Penalty'
import { RankAlert, RankPill } from './components/Rank'
import { useAuth } from './components/AuthGate'

const I = {
  today: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  habits: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  mindset: <path d="M3 17l5-6 4 3 5-7 4 4" />,
  goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  insights: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
}

const TABS = [
  { id: 'today', label: "Aujourd'hui", C: Today },
  { id: 'habits', label: 'Habitudes', C: Habits },
  { id: 'mindset', label: 'Mindset', C: Mindset },
  { id: 'goals', label: 'Objectifs', C: Goals },
  { id: 'insights', label: 'Insights', C: Insights },
]

export default function App() {
  const data = useData()
  const { signOut } = useAuth()
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('sl:tab') || 'today' } catch { return 'today' }
  })
  useEffect(() => {
    try { localStorage.setItem('sl:tab', tab) } catch { /* ignore */ }
  }, [tab])

  const [sysOpen, setSysOpen] = useState(false)
  const pending = data.penalty && !data.penalty.done
  const penaltyShowing = pending && (sysOpen || !data.penalty.accepted)

  const Page = TABS.find((t) => t.id === tab)?.C || Today

  return (
    <div className="app">
      <div className="bg-glow" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">SOLO LEVELING</span>
          <span className="pill-mint">{fmtShort(new Date())}</span>
          <RankPill />
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I[t.id]}</svg>
              {t.label}
            </button>
          ))}
        </nav>
        {pending && (
          <button className="penalty-pill" onClick={() => setSysOpen(true)} title="Quête de pénalité en cours">
            ! Pénalité
          </button>
        )}
        <div className={`sync ${data.backendName}`} title={data.backendName === 'supabase' ? 'Synchronisé avec Supabase' : 'Données enregistrées dans ce navigateur'}>
          <span className="sync-dot" />
          {data.backendName === 'supabase' ? 'Cloud' : 'Local'}
          {signOut && <button className="logout" onClick={signOut} title="Se déconnecter">Déconnexion</button>}
        </div>
      </header>

      {data.error && (
        <div className="toast" onClick={data.clearError}>⚠ {data.error} <small>(cliquer pour fermer)</small></div>
      )}

      <main className="page" key={tab}>
        <Page go={setTab} openSystem={() => setSysOpen(true)} />
      </main>

      {penaltyShowing ? <SystemAlert open={sysOpen} onClose={() => setSysOpen(false)} /> : <RankAlert />}
    </div>
  )
}
