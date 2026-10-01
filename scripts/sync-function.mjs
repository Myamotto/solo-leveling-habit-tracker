// Copie les règles du jeu (src/lib) dans la fonction serveur, pour que l'app et le Système appliquent exactement les mêmes.
// À relancer après chaque modification de ces fichiers : npm run sync:function
import { copyFileSync, mkdirSync } from 'node:fs'

const FILES = ['dates.js', 'stats.js', 'penalties.js', 'ranking.js']
const dest = 'supabase/functions/system-judge/lib'
mkdirSync(dest, { recursive: true })
for (const f of FILES) copyFileSync(`src/lib/${f}`, `${dest}/${f}`)
console.log(`✓ ${FILES.length} fichiers copiés dans ${dest}`)
