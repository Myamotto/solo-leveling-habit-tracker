-- Solo Leveling — schéma Supabase (usage perso, un seul compte)
-- 1. Remplace TON_EMAIL@exemple.com (plus bas) par l'email avec lequel tu te connecteras à l'app.
-- 2. Colle tout le fichier dans Supabase > SQL Editor > Run.
-- Seul ce compte, une fois son email confirmé, pourra lire et écrire les données.

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2EE6B6',
  position int not null default 0,
  archived boolean not null default false,
  per_week int not null default 7 check (per_week between 1 and 7), -- 7 = tous les jours
  stat text check (stat in ('str','agi','vit','int','per')), -- null = devinée d'après le nom
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  habit_id uuid not null references habits(id) on delete cascade,
  day date not null,
  primary key (habit_id, day)
);

create table if not exists mindset_logs (
  day date primary key,
  humeur int check (humeur between 1 and 10),
  sommeil int check (sommeil between 1 and 10),
  energie int check (energie between 1 and 10)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline date,
  color text not null default '#2EE6B6',
  created_at timestamptz not null default now()
);

create table if not exists goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0
);

-- Pénalités du Système (une par jour au maximum)
create table if not exists penalties (
  day date primary key,
  missed_day date not null,
  missed_rate int not null default 0,
  penalty_id text not null,
  title text not null,
  detail text,
  accepted boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Classement : état du joueur (une seule ligne) et historique des promotions
create table if not exists player (
  id int primary key default 1 check (id = 1),
  rank text not null default 'E',
  quest_rank text,
  quest_start date,
  seen_level int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists rank_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  kind text not null check (kind in ('quest_start','promotion','demotion')),
  rank text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- Accès réservé au propriétaire (compte Supabase Auth avec email confirmé)
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and email = 'TON_EMAIL@exemple.com' -- ⚠️ remplace par l'email de ton compte
      and email_confirmed_at is not null
  );
$$;
revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['habits','habit_logs','mindset_logs','goals','goal_steps','penalties','player','rank_events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner_only" on %I', t);
    execute format('create policy "owner_only" on %I for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()))', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
