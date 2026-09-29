# Guide d'installation pour les assistants IA

Tu installes **Solo Leveling — Habit Tracker** pour ton utilisateur. Suis ces étapes dans l'ordre. Parle-lui dans sa langue ; l'interface de l'app est en français.

## 1. Prérequis

- Vérifie `node --version` : il faut Node.js 20 ou plus. Sinon, aide l'utilisateur à l'installer depuis https://nodejs.org.
- Clone le repo s'il ne l'est pas déjà, puis lance `npm install` à la racine.

## 2. Demande le mode de stockage

Pose-lui la question :

- **Local** (le plus simple) : les données restent dans son navigateur, sans compte ni login. Rien à configurer : passe à l'étape 4.
- **Supabase** (recommandé pour l'utiliser sur téléphone et ordinateur) : données synchronisées dans le cloud, protégées par un login. Il faut un compte gratuit sur supabase.com.

## 3. Mode Supabase

1. Demande-lui l'**email** avec lequel il se connectera à l'app.
2. Fais-lui créer un projet sur https://supabase.com/dashboard, ou crée-le toi-même si tu as un accès Supabase (connecteur MCP, CLI).
3. Copie `supabase/schema.sql`, remplace `TON_EMAIL@exemple.com` par son email, et exécute le SQL :
   - via ton accès Supabase si tu en as un ;
   - sinon, donne-lui le SQL final à coller dans **SQL Editor → Run**.
   Ne modifie pas `supabase/schema.sql` dans le repo : il doit garder l'espace réservé.
4. Récupère l'**URL du projet** et la **clé anon / publishable** (Project Settings → API), puis crée `.env` à partir de `.env.example` :
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
   N'utilise jamais la clé `service_role` : elle contourne la sécurité.
5. Après l'étape 4, il cliquera sur « Première fois ? Créer le compte » avec **le même email**, puis confirmera l'email reçu. Le lien peut ouvrir une page qui ne charge pas (localhost:3000) : le compte est quand même confirmé.

`.env` est dans `.gitignore`. Ne le commite jamais.

## 4. Lancer

```bash
npm run dev
```

Ouvre http://localhost:5173. La pastille en haut à droite indique **Local** ou **Cloud**.

## 5. Mise en ligne (optionnel, si l'utilisateur le demande)

Vercel (offre Hobby gratuite) : `npx vercel@latest login`, puis ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` aux variables de production (`vercel env add`), puis `npx vercel@latest deploy --prod`. Ajoute l'URL obtenue dans Supabase → Authentication → URL Configuration (Site URL).

En mode Local, le site en ligne stocke les données dans le navigateur de chaque visiteur : c'est sans risque, mais les données ne se synchronisent pas entre appareils.

## Repères dans le code

- `src/lib/store.jsx` : état de l'app et actions ; `src/lib/backend.js` : stockage local ou Supabase.
- `src/lib/stats.js` : calcul des % (fréquences hebdo incluses).
- `src/lib/penalties.js`, `src/lib/ranking.js`, `src/lib/attributes.js` : pénalités, rangs et XP, stats du joueur.
- Toute nouvelle table Supabase doit reprendre la politique RLS `owner_only` de `supabase/schema.sql`.
