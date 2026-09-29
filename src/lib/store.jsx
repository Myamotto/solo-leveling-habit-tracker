import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend, backendName } from './backend'
import { dayKey } from './dates'
import { draw, evaluate } from './penalties'
import { DEFAULT_PLAYER, judge, levelOf, totalXp } from './ranking'

const Ctx = createContext(null)
export const useData = () => useContext(Ctx)

export const MINDSET = [
  { key: 'humeur', label: 'Humeur', color: '#FF4D6D' },
  { key: 'sommeil', label: 'Sommeil', color: '#B26BFF' },
  { key: 'energie', label: 'Énergie', color: '#2EE6B6' },
]

export const PALETTE = ['#2EE6B6', '#FF4D6D', '#B26BFF', '#4DA3FF', '#FFB84D', '#FF6BD6', '#7CFF6B', '#4DFFF3']

const uid = () => crypto.randomUUID()

export function DataProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    backend.load().then(setState).catch((e) => setError(e.message || String(e)))
  }, [])

  useEffect(() => {
    if (state) backend.save(state)
  }, [state])

  // Mise à jour optimiste + écriture distante
  const run = (updater, kind, payload) => {
    setState((s) => updater(s))
    backend.op(kind, payload).catch((e) => setError(e.message || String(e)))
  }

  const logSet = useMemo(
    () => new Set((state?.logs || []).map((l) => `${l.habit_id}|${l.day}`)),
    [state?.logs],
  )
  const mindsetByDay = useMemo(
    () => Object.fromEntries((state?.mindset || []).map((m) => [m.day, m])),
    [state?.mindset],
  )

  const actions = {
    addHabit(name, color, per_week = 7, stat = null) {
      const h = { id: uid(), name, color, per_week, stat, position: state.habits.length, archived: false, created_at: new Date().toISOString() }
      run((s) => ({ ...s, habits: [...s.habits, h] }), 'habit:upsert', h)
    },
    updateHabit(id, patch) {
      const h = { ...state.habits.find((x) => x.id === id), ...patch }
      run((s) => ({ ...s, habits: s.habits.map((x) => (x.id === id ? h : x)) }), 'habit:upsert', h)
    },
    deleteHabit(id) {
      run(
        (s) => ({ ...s, habits: s.habits.filter((x) => x.id !== id), logs: s.logs.filter((l) => l.habit_id !== id) }),
        'habit:delete', id,
      )
    },
    toggleLog(habit_id, day) {
      const on = logSet.has(`${habit_id}|${day}`)
      const row = { habit_id, day }
      if (on) {
        run((s) => ({ ...s, logs: s.logs.filter((l) => !(l.habit_id === habit_id && l.day === day)) }), 'log:remove', row)
      } else {
        run((s) => ({ ...s, logs: [...s.logs, row] }), 'log:add', row)
      }
    },
    setMindset(day, key, value) {
      const row = { humeur: null, sommeil: null, energie: null, ...mindsetByDay[day], day, [key]: value }
      run((s) => ({ ...s, mindset: [...s.mindset.filter((m) => m.day !== day), row] }), 'mindset:upsert', row)
    },
    addGoal(title, deadline, color) {
      const g = { id: uid(), title, deadline: deadline || null, color, created_at: new Date().toISOString() }
      run((s) => ({ ...s, goals: [...s.goals, g] }), 'goal:upsert', g)
    },
    updateGoal(id, patch) {
      const g = { ...state.goals.find((x) => x.id === id), ...patch }
      run((s) => ({ ...s, goals: s.goals.map((x) => (x.id === id ? g : x)) }), 'goal:upsert', g)
    },
    deleteGoal(id) {
      run((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== id), steps: s.steps.filter((x) => x.goal_id !== id) }), 'goal:delete', id)
    },
    addStep(goal_id, title) {
      const st = { id: uid(), goal_id, title, done: false, position: state.steps.filter((x) => x.goal_id === goal_id).length }
      run((s) => ({ ...s, steps: [...s.steps, st] }), 'step:upsert', st)
    },
    toggleStep(id) {
      const st = state.steps.find((x) => x.id === id)
      const next = { ...st, done: !st.done }
      run((s) => ({ ...s, steps: s.steps.map((x) => (x.id === id ? next : x)) }), 'step:upsert', next)
    },
    deleteStep(id) {
      run((s) => ({ ...s, steps: s.steps.filter((x) => x.id !== id) }), 'step:delete', id)
    },
    updatePlayer(patch) {
      const p = { ...DEFAULT_PLAYER, ...state.player, ...patch }
      run((s) => ({ ...s, player: p }), 'player:upsert', p)
    },
    seeRankEvent(id) {
      const e = { ...state.rankEvents.find((x) => x.id === id), seen: true }
      run((s) => ({ ...s, rankEvents: s.rankEvents.map((x) => (x.id === id ? e : x)) }), 'rankEvents:upsert', [e])
    },
    updatePenalty(day, patch) {
      const p = { ...state.penalties.find((x) => x.day === day), ...patch }
      run((s) => ({ ...s, penalties: s.penalties.map((x) => (x.day === day ? p : x)) }), 'penalty:upsert', p)
    },
  }

  // Le Système : au chargement, si hier n'est pas à 100 %, on tire une pénalité pour aujourd'hui (une seule fois).
  const judged = useRef(false)
  useEffect(() => {
    if (!state || judged.current) return
    judged.current = true
    const today = dayKey()
    const habits = state.habits.filter((h) => !h.archived)
    const data = { ...state, habits, isDone: (id, d) => logSet.has(`${id}|${d}`) }

    const verdict = !state.penalties.some((p) => p.day === today) && evaluate(data)
    if (verdict) {
      const pick = draw(verdict, state.penalties)
      const p = {
        day: today, missed_day: verdict.yesterday, missed_rate: verdict.rate,
        penalty_id: pick.id, title: pick.title, detail: pick.detail, accepted: false, done: false,
      }
      run((s) => ({ ...s, penalties: [...s.penalties, p] }), 'penalty:upsert', p)
    }

    // Classement : premier lancement -> joueur créé sans alerte de niveau rétroactive
    const before = state.player || { ...DEFAULT_PLAYER, seen_level: levelOf(totalXp(data)).level }
    const { player, events } = judge(data, before)
    if (!state.player || JSON.stringify(player) !== JSON.stringify(before)) {
      run((s) => ({ ...s, player }), 'player:upsert', player)
    }
    if (events.length) run((s) => ({ ...s, rankEvents: [...s.rankEvents, ...events] }), 'rankEvents:upsert', events)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = state && {
    ...state,
    habits: state.habits.filter((h) => !h.archived).sort((a, b) => a.position - b.position),
    isDone: (habitId, day) => logSet.has(`${habitId}|${day}`),
    penalty: state.penalties.find((p) => p.day === dayKey()) || null,
    player: { ...DEFAULT_PLAYER, ...state.player },
    playerReady: !!state.player,
    mindsetByDay,
    backendName,
    error,
    clearError: () => setError(null),
    ...actions,
  }

  if (!state) {
    return (
      <div className="boot">
        {error ? <p className="boot-error">Erreur de chargement : {error}</p> : <div className="boot-spinner" />}
      </div>
    )
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
