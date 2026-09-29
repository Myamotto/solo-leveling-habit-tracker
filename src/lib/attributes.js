// Stats du joueur (comme la fiche de Jinwoo). Une habitude nourrit une seule stat.
export const STATS = [
  {
    key: 'str', label: 'Force', short: 'FOR', color: '#FF4D6D',
    words: ['muscu', 'workout', 'pompe', 'push', 'traction', 'pull', 'squat', 'dips', 'halt', 'fonte', 'gym', 'salle',
      'force', 'gainage', 'planche', 'abdo', 'crossfit', 'calisthen', 'street workout', 'sport', 'entrainement', 'training', 'fitness', 'bench', 'deadlift'],
  },
  {
    key: 'agi', label: 'Agilité', short: 'AGI', color: '#2EE6B6',
    words: ['run', 'course', 'courir', 'jog', 'footing', 'cardio', 'velo', 'bike', 'cycl', 'natation', 'nage', 'swim', 'boxe', 'box',
      'mma', 'jjb', 'judo', 'karate', 'combat', 'stretch', 'etirement', 'yoga', 'mobilite', 'souplesse', 'danse', 'marche', 'walk',
      'hiit', 'corde', 'sprint', 'foot', 'basket', 'tennis', 'padel', 'escalade', 'rando'],
  },
  {
    key: 'vit', label: 'Vitalité', short: 'VIT', color: '#FFB84D',
    words: ['sommeil', 'dormir', 'sleep', 'coucher', 'couche', 'reveil', 'wake', 'eau', 'water', 'hydrat', 'boire', 'manger', 'alimentation',
      'repas', 'nutrition', 'legume', 'fruit', 'proteine', 'sucre', 'alcool', 'jeun', 'fasting', 'douche', 'froid', 'cold', 'vitamine',
      'complement', 'regime', 'calorie', 'sante', 'dent', 'skincare', 'soin', 'sieste', 'cigarette', 'clope'],
  },
  {
    key: 'int', label: 'Intelligence', short: 'INT', color: '#4DA3FF',
    words: ['lire', 'lecture', 'livre', 'read', 'book', 'page', 'apprend', 'learn', 'etud', 'study', 'cours', 'formation', 'langue',
      'anglais', 'espagnol', 'english', 'duolingo', 'code', 'coder', 'program', 'dev', 'revision', 'reviser', 'podcast', 'ecri', 'write',
      'redac', 'blog', 'article', 'post', 'publi', 'contenu', 'content', 'video', 'montage', 'business', 'projet', 'prospect', 'client',
      'finance', 'invest', 'budget', 'echec', 'chess', 'newsletter', 'marketing', 'vente'],
  },
  {
    key: 'per', label: 'Perception', short: 'PER', color: '#B26BFF',
    words: ['medit', 'mindful', 'respir', 'breath', 'journal', 'gratitude', 'focus', 'concentration', 'priere', 'pray', 'reseau', 'social',
      'ecran', 'screen', 'telephone', 'phone', 'insta', 'tiktok', 'youtube', 'digital', 'detox', 'silence', 'visualis', 'affirmation',
      'reflexion', 'planif', 'plan', 'organis', 'agenda', 'bilan', 'intention', 'nature'],
  },
]

export const statOf = (key) => STATS.find((s) => s.key === key)

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Un mot-clé doit commencer un mot : « run » reconnaît « running » mais pas « brunch »
const RULES = STATS.map((s) => ({ key: s.key, re: new RegExp(`(^|[^a-z])(${s.words.map(escape).join('|')})`) }))

// Stat devinée d'après le libellé. Ordre de priorité : Force, Agilité, Vitalité, Intelligence, Perception.
// null si rien n'est reconnu.
export function detectStat(name) {
  const t = norm(name || '')
  return RULES.find((r) => r.re.test(t))?.key ?? null
}

// Stat effective : celle choisie à la main, sinon celle devinée
export const habitStat = (h) => h.stat || detectStat(h.name)

// Valeur de chaque stat : 10 de base (comme dans Solo Leveling) + 1 par coche d'une habitude de cette stat
export function statValues(data) {
  const byHabit = Object.fromEntries(data.habits.map((h) => [h.id, habitStat(h)]))
  const pts = Object.fromEntries(STATS.map((s) => [s.key, 0]))
  for (const l of data.logs) {
    const k = byHabit[l.habit_id]
    if (k) pts[k]++
  }
  return STATS.map((s) => ({ ...s, points: pts[s.key], value: 10 + pts[s.key] }))
}
