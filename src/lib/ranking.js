import { addDays, dayKey, parseDay } from './dates.js'
import { rateOn } from './stats.js'

// Rangs, du plus bas au plus haut. min = réussite moyenne sur 30 jours pour être éligible.
export const RANKS = [
  { id: 'E', min: 0, color: '#8a9796' },
  { id: 'D', min: 40, color: '#7CFF6B' },
  { id: 'C', min: 55, color: '#4DA3FF' },
  { id: 'B', min: 70, color: '#B26BFF' },
  { id: 'A', min: 80, color: '#FFB84D' },
  { id: 'S', min: 90, color: '#FF4D6D' },
]

// Quête de promotion vers chaque rang : n jours d'affilée à min % ou plus
export const QUESTS = {
  D: { n: 3, min: 70, label: "3 jours d'affilée à 70 % ou plus" },
  C: { n: 5, min: 80, label: "5 jours d'affilée à 80 % ou plus" },
  B: { n: 5, min: 100, label: "5 jours parfaits d'affilée" },
  A: { n: 7, min: 100, label: "7 jours parfaits d'affilée" },
  S: { n: 90, min: 100, noFailedPenalty: true, label: "90 jours parfaits d'affilée, sans pénalité ratée sur 30 jours" },
}

// Jours à tenir son rang avant que la quête suivante puisse commencer.
// A → S : pas d'attente, la quête S (90 jours) est déjà l'épreuve.
export const COOLDOWN = { E: 0, D: 7, C: 7, B: 10, A: 0 }

export const HISTORY_MIN = 7
export const WINDOW = 30

export const XP = { perfectBonus: 25, step: 20, goal: 150, penaltyDone: 30, penaltyFailed: -50 }

export const rankIdx = (id) => RANKS.findIndex((r) => r.id === id)
export const rankOf = (id) => RANKS[Math.max(0, rankIdx(id))]
const rankForRate = (rate) => [...RANKS].reverse().find((r) => rate >= r.min)

const createdDay = (h) => (h.created_at ? dayKey(new Date(h.created_at)) : '0000-00-00')

// Jours terminés (jusqu'à hier) depuis la création de la première habitude, du plus ancien au plus récent
export function fullDays(data, now = new Date()) {
  if (!data.habits.length) return []
  const first = data.habits.map(createdDay).sort()[0]
  const yesterday = dayKey(addDays(now, -1))
  const out = []
  for (let d = parseDay(first); dayKey(d) <= yesterday; d = addDays(d, 1)) out.push(dayKey(d))
  return out
}

export function avg30(data, now = new Date()) {
  const days = fullDays(data, now).slice(-WINDOW)
  const rates = days.map((k) => rateOn(data, k)).filter((r) => r != null)
  if (!rates.length) return null
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
}

const failedPenalties = (data, now) => {
  const today = dayKey(now)
  const from = dayKey(addDays(now, -WINDOW))
  return data.penalties.filter((p) => !p.done && p.day < today && p.day >= from).length
}

// ---------- XP & niveaux ----------
export function totalXp(data, now = new Date()) {
  let xp = 0
  const days = [...fullDays(data, now), dayKey(now)]
  for (const k of days) {
    const r = rateOn(data, k)
    if (r == null) continue
    xp += r
    if (r === 100) xp += XP.perfectBonus
  }
  xp += data.steps.filter((s) => s.done).length * XP.step
  for (const g of data.goals) {
    const steps = data.steps.filter((s) => s.goal_id === g.id)
    if (steps.length && steps.every((s) => s.done)) xp += XP.goal
  }
  const today = dayKey(now)
  for (const p of data.penalties) {
    if (p.done) xp += XP.penaltyDone
    else if (p.day < today) xp += XP.penaltyFailed
  }
  return Math.max(0, xp)
}

// XP pour passer du niveau n au niveau n+1
export const xpForNext = (n) => 100 + 30 * (n - 1)

export function levelOf(xp) {
  let level = 1
  let rest = xp
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level)
    level++
  }
  return { level, into: rest, need: xpForNext(level) }
}

// ---------- Quête de promotion ----------
// Série de jours qualifiants se terminant hier, depuis le début de la quête (+ aujourd'hui si déjà qualifiant)
export function questProgress(data, player, now = new Date()) {
  const q = player.quest_rank && QUESTS[player.quest_rank]
  if (!q) return null
  const days = fullDays(data, now).filter((k) => k >= player.quest_start)
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const r = rateOn(data, days[i])
    if (r == null || r < q.min) break
    streak++
  }
  const todayRate = rateOn(data, dayKey(now))
  const todayOk = todayRate != null && todayRate >= q.min
  const blocked = q.noFailedPenalty && failedPenalties(data, now) > 0
  return { ...q, rank: player.quest_rank, streak, todayOk, blocked }
}

// Jour où le joueur a obtenu son rang actuel (dernière promotion ou rétrogradation), null si jamais classé
export function rankSince(data, player) {
  const evs = (data.rankEvents || []).filter((e) => (e.kind === 'promotion' || e.kind === 'demotion') && e.rank === player.rank)
  return evs.length ? evs.map((e) => e.day).sort().at(-1) : null
}

// Premier jour où la quête suivante peut commencer
export function nextQuestDay(data, player, since = rankSince(data, player)) {
  const wait = COOLDOWN[player.rank] ?? 0
  return since && wait ? dayKey(addDays(parseDay(since), wait)) : null
}

export const DEFAULT_PLAYER = { id: 1, rank: 'E', quest_rank: null, quest_start: null, seen_level: 1, timezone: 'Europe/Paris' }

// Le joueur a-t-il changé ? (champs utiles seulement, quel que soit leur ordre)
const PLAYER_FIELDS = ['rank', 'quest_rank', 'quest_start', 'seen_level', 'timezone']
export const samePlayer = (a, b) => !!a && !!b && PLAYER_FIELDS.every((k) => (a[k] ?? null) === (b[k] ?? null))

// Le Système juge les jours terminés : rétrogradation, fin de quête, nouvelle quête.
export function judge(data, player, now = new Date()) {
  const today = dayKey(now)
  const p = { ...DEFAULT_PLAYER, ...player }
  const events = []
  const ev = (kind, rank) => events.push({ id: crypto.randomUUID(), day: today, kind, rank, seen: false })

  if (fullDays(data, now).length < HISTORY_MIN) return { player: p, events }
  const avg = avg30(data, now)
  if (avg == null) return { player: p, events }
  let since = rankSince(data, p)
  const eligible = rankForRate(avg).id

  if (rankIdx(eligible) < rankIdx(p.rank)) {
    p.rank = eligible
    p.quest_rank = null
    p.quest_start = null
    since = today
    ev('demotion', eligible)
  }
  // Plus assez de niveau pour la quête en cours : elle est annulée
  if (p.quest_rank && rankIdx(eligible) < rankIdx(p.quest_rank)) {
    p.quest_rank = null
    p.quest_start = null
  }
  if (p.quest_rank) {
    const prog = questProgress(data, p, now)
    if (prog.streak >= prog.n && !prog.blocked) {
      p.rank = p.quest_rank
      p.quest_rank = null
      p.quest_start = null
      since = today
      ev('promotion', p.rank)
    }
  }
  const ready = !nextQuestDay(data, p, since) || today >= nextQuestDay(data, p, since)
  if (!p.quest_rank && rankIdx(eligible) > rankIdx(p.rank) && ready) {
    p.quest_rank = RANKS[rankIdx(p.rank) + 1].id
    p.quest_start = today
    ev('quest_start', p.quest_rank)
  }
  return { player: p, events }
}
