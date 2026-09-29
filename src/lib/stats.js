import { addDays, dayKey, parseDay } from './dates'

const createdDay = (h) => (h.created_at ? dayKey(new Date(h.created_at)) : '0000-00-00')
export const existsOn = (h, key) => createdDay(h) <= key
export const perWeek = (h) => h.per_week ?? 7

// Lundi de la semaine du jour donné
export const weekStart = (key) => {
  const d = parseDay(key)
  return addDays(d, -((d.getDay() + 6) % 7))
}

// Nombre de coches d'une habitude dans la semaine, avant le jour donné (exclu)
const doneInWeekBefore = (data, h, key) => {
  let n = 0
  for (let d = weekStart(key); dayKey(d) < key; d = addDays(d, 1)) if (data.isDone(h.id, dayKey(d))) n++
  return n
}

export const doneThisWeek = (data, h, key = dayKey()) =>
  doneInWeekBefore(data, h, key) + (data.isDone(h.id, key) ? 1 : 0)

// Une habitude compte-t-elle ce jour-là ?
// Quotidienne : toujours. X fois/semaine : si elle est cochée ce jour-là,
// ou si le quota ne peut plus être atteint sans la faire chaque jour restant de la semaine.
export function isDue(data, h, key) {
  const per = perWeek(h)
  if (per >= 7 || data.isDone(h.id, key)) return true
  const remaining = 7 - ((parseDay(key).getDay() + 6) % 7) // jours restants, aujourd'hui compris
  return per - doneInWeekBefore(data, h, key) >= remaining
}

// % du jour sur les habitudes qui comptent ce jour-là. null si aucune habitude n'existait encore.
export function rateOn(data, key) {
  const habits = data.habits.filter((h) => existsOn(h, key))
  if (!habits.length) return null
  const due = habits.filter((h) => isDue(data, h, key))
  if (!due.length) return 100
  const done = due.filter((h) => data.isDone(h.id, key)).length
  return Math.round((done / due.length) * 100)
}

// % des habitudes cochées un jour donné (0–100)
export const dayRate = (data, key) => rateOn(data, key) ?? 0

// Série en cours : jours dus consécutifs réussis (les jours de repos d'une habitude hebdo ne cassent pas la série).
// Aujourd'hui ne compte que s'il est déjà coché.
export const currentStreak = (data, habitId, today = new Date()) => {
  const h = data.habits.find((x) => x.id === habitId)
  if (!h) return 0
  let n = 0
  for (let d = today; existsOn(h, dayKey(d)); d = addDays(d, -1)) {
    const k = dayKey(d)
    if (data.isDone(h.id, k)) n++
    else if (k !== dayKey(today) && isDue(data, h, k)) break
  }
  return n
}

// Meilleure série de tous les temps (même règle)
export const bestStreak = (data, habitId, today = new Date()) => {
  const h = data.habits.find((x) => x.id === habitId)
  if (!h) return 0
  let best = 0
  let run = 0
  for (let d = parseDay(createdDay(h) === '0000-00-00' ? dayKey(addDays(today, -365)) : createdDay(h)); d <= today; d = addDays(d, 1)) {
    const k = dayKey(d)
    if (data.isDone(h.id, k)) best = Math.max(best, ++run)
    else if (k !== dayKey(today) && isDue(data, h, k)) run = 0
  }
  return best
}

// Taux de réussite d'une habitude sur une liste de jours (jours où elle était due)
export const habitRate = (data, habitId, days) => {
  const h = data.habits.find((x) => x.id === habitId)
  const keys = days.map(dayKey).filter((k) => h && existsOn(h, k) && isDue(data, h, k))
  if (!keys.length) return 0
  const done = keys.filter((k) => data.isDone(habitId, k)).length
  return Math.round((done / keys.length) * 100)
}

export const avg = (arr) => {
  const v = arr.filter((x) => x != null)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}
