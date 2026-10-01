import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

export const backendName = supabase ? 'supabase' : 'local'

const EMPTY = { habits: [], logs: [], mindset: [], goals: [], steps: [], penalties: [], player: null, rankEvents: [] }
const LS_KEY = 'solo-leveling:v1'

// ---------- Local (navigateur) ----------
const local = {
  async load() {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }
    } catch {
      return { ...EMPTY }
    }
  },
  // En local on sauvegarde tout l'état d'un coup (voir store.jsx)
  save(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch { /* stockage indisponible */ }
  },
  op: async () => {},
}

// ---------- Supabase ----------
const check = ({ error }) => {
  if (error) {
    console.error('[Supabase]', error)
    throw error
  }
}

const remote = {
  async load() {
    const [habits, logs, mindset, goals, steps, penalties, player, rankEvents] = await Promise.all([
      supabase.from('habits').select('*').order('position'),
      supabase.from('habit_logs').select('*'),
      supabase.from('mindset_logs').select('*'),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('goal_steps').select('*').order('position'),
      supabase.from('penalties').select('*').order('day'),
      supabase.from('player').select('*').maybeSingle(),
      supabase.from('rank_events').select('*').order('created_at'),
    ])
    ;[habits, logs, mindset, goals, steps, penalties, player, rankEvents].forEach(check)
    return {
      habits: habits.data,
      logs: logs.data,
      mindset: mindset.data,
      goals: goals.data,
      steps: steps.data,
      penalties: penalties.data,
      player: player.data,
      rankEvents: rankEvents.data,
    }
  },
  save() {},
  async op(kind, payload) {
    const t = (name) => supabase.from(name)
    switch (kind) {
      case 'habit:upsert': return check(await t('habits').upsert(payload))
      case 'habit:delete': return check(await t('habits').delete().eq('id', payload))
      case 'log:add': return check(await t('habit_logs').upsert(payload))
      case 'log:remove':
        return check(await t('habit_logs').delete().eq('habit_id', payload.habit_id).eq('day', payload.day))
      case 'mindset:upsert': return check(await t('mindset_logs').upsert(payload))
      case 'goal:upsert': return check(await t('goals').upsert(payload))
      case 'goal:delete': return check(await t('goals').delete().eq('id', payload))
      case 'step:upsert': return check(await t('goal_steps').upsert(payload))
      case 'step:delete': return check(await t('goal_steps').delete().eq('id', payload))
      case 'penalty:upsert': return check(await t('penalties').upsert(payload))
      // Création : si le Système (serveur) l'a déjà tirée, on garde la sienne
      case 'penalty:create': return check(await t('penalties').upsert(payload, { onConflict: 'day', ignoreDuplicates: true }))
      case 'player:upsert': return check(await t('player').upsert({ ...payload, updated_at: new Date().toISOString() }))
      case 'rankEvents:upsert': return check(await t('rank_events').upsert(payload))
    }
  },
}

export const backend = supabase ? remote : local
