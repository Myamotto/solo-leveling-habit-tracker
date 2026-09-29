import { addDays, dayKey } from './dates'
import { existsOn, isDue } from './stats'

// Banque de pénalités. tier 1 = journée ratée de peu, tier 2 = journée ratée lourdement (< 50 %)
// ou pénalité de la veille non accomplie.
export const PENALTIES = [
  // --- Tier 1 ---
  { id: 'pompes-100', tier: 1, title: '100 pompes', detail: 'Réparties comme tu veux dans la journée, mais les 100 avant minuit.' },
  { id: 'squats-150', tier: 1, title: '150 squats', detail: 'Descente complète. Chaque répétition compte.' },
  { id: 'douche-froide', tier: 1, title: 'Douche froide — 5 minutes', detail: "Eau froide du début à la fin. Pas d'eau chaude avant." },
  { id: 'zero-reseaux', tier: 1, title: 'Zéro réseaux sociaux', detail: "Instagram, TikTok, X, YouTube : rien jusqu'à minuit." },
  { id: 'zero-sucre', tier: 1, title: 'Zéro sucre', detail: 'Aucun sucre ajouté, aucun soda, aucun dessert aujourd\'hui.' },
  { id: 'planche-5', tier: 1, title: '5 minutes de gainage', detail: 'Cumulées, par séries de 1 minute minimum.' },
  { id: 'marche-10k', tier: 1, title: '10 000 pas', detail: 'Minimum. Le compteur fait foi.' },
  { id: 'ecrans-21h', tier: 1, title: 'Aucun écran après 21h', detail: 'Téléphone, ordinateur, télé : tout est coupé à 21h.' },
  { id: 'lettre-echec', tier: 1, title: "Rapport d'échec", detail: "Écris à la main une page entière : pourquoi tu as échoué hier, et ce que tu changes aujourd'hui." },
  { id: 'lecture-40', tier: 1, title: 'Lire 40 pages', detail: 'Un vrai livre. Pas un article, pas un écran.' },
  { id: 'meditation-20', tier: 1, title: '20 minutes de méditation', detail: "D'une traite, assis, sans musique." },
  { id: 'noir-blanc', tier: 1, title: 'Téléphone en noir et blanc', detail: "Active le mode niveaux de gris jusqu'à minuit." },
  { id: 'eau-seulement', tier: 1, title: 'Eau uniquement', detail: 'Pas de café, pas de thé, pas de soda, pas d\'alcool.' },
  { id: 'tache-repoussee', tier: 1, title: 'La tâche que tu repousses', detail: 'Celle à laquelle tu penses en lisant ça. Aujourd\'hui, jusqu\'au bout.' },
  { id: 'silence', tier: 1, title: 'Silence total', detail: "Aucune musique, aucun podcast, aucune vidéo de la journée." },
  { id: 'rangement', tier: 1, title: 'Grand ménage', detail: "Ta chambre ou ton bureau, entièrement rangé et nettoyé. Même les tiroirs." },
  { id: 'escaliers', tier: 1, title: '30 étages à pied', detail: "Cumulés dans la journée. Pas d'ascenseur." },
  { id: 'fentes-60', tier: 1, title: '60 fentes par jambe', detail: 'Soit 120 au total.' },
  // --- Tier 2 ---
  { id: 'burpees-100', tier: 2, title: '100 burpees', detail: 'Avec la pompe et le saut. Avant minuit.' },
  { id: 'course-5k', tier: 2, title: 'Courir 5 km', detail: "Sans t'arrêter de marcher. Lent s'il faut, mais en courant." },
  { id: 'reveil-5h', tier: 2, title: 'Réveil à 5h demain', detail: 'Réveil à 5h00, debout dans la minute. Pas de snooze.' },
  { id: 'combo-froid', tier: 2, title: 'Douche froide + 100 pompes', detail: "Les 100 pompes d'abord, la douche froide de 5 minutes ensuite." },
  { id: 'detox-24h', tier: 2, title: 'Détox totale', detail: 'Aucun divertissement de la journée : pas de séries, pas de jeux, pas de réseaux, pas de YouTube.' },
  { id: 'pompes-200', tier: 2, title: '200 pompes', detail: 'Réparties dans la journée. Toutes avant minuit.' },
  { id: 'marche-15k', tier: 2, title: '15 000 pas', detail: 'Minimum. Sans exception.' },
  { id: 'squats-300', tier: 2, title: '300 squats', detail: 'Par séries de 50.' },
  { id: 'rapport-3', tier: 2, title: 'Rapport de 3 pages', detail: "À la main : ce que ton échec t'a coûté, ce que tu veux vraiment, ton plan pour demain heure par heure." },
  { id: 'saitama', tier: 2, title: 'Le circuit du chasseur', detail: '100 pompes, 100 abdos, 100 squats et 3 km de course. Le tout avant minuit.' },
  { id: 'lit-22h', tier: 2, title: 'Couché à 22h, sans téléphone', detail: 'Le téléphone reste dans une autre pièce. Réveil à 6h.' },
  { id: 'reseaux-48h', tier: 2, title: '48h sans réseaux sociaux', detail: "Aujourd'hui et demain. Désinstalle les applis s'il le faut." },
]

// Le Système évalue la veille : la pénalité du jour est due si hier n'était pas à 100 %.
export function evaluate(data, now = new Date()) {
  const today = dayKey(now)
  const yesterday = dayKey(addDays(now, -1))
  // Habitudes qui existaient déjà hier et qui comptaient ce jour-là (les jours de repos des habitudes hebdo sont exclus)
  const habits = data.habits.filter((h) => existsOn(h, yesterday) && isDue(data, h, yesterday))
  if (!habits.length) return null
  const done = habits.filter((h) => data.isDone(h.id, yesterday)).length
  if (done === habits.length) return null
  const prev = data.penalties.find((p) => p.day === yesterday)
  return {
    today,
    yesterday,
    done,
    total: habits.length,
    rate: Math.round((done / habits.length) * 100),
    escalated: !!prev && !prev.done,
  }
}

// Tirage au sort, en évitant les 7 dernières pénalités
export function draw(verdict, history) {
  const tier = verdict.escalated || verdict.rate < 50 ? 2 : 1
  const recent = new Set(
    [...history].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 7).map((p) => p.penalty_id),
  )
  let pool = PENALTIES.filter((p) => p.tier === tier && !recent.has(p.id))
  if (!pool.length) pool = PENALTIES.filter((p) => p.tier === tier)
  return pool[Math.floor(Math.random() * pool.length)]
}
