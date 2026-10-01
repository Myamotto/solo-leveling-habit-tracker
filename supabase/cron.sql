-- Le Système côté serveur (optionnel) : juge ta journée chaque nuit et t'envoie un email,
-- même si tu n'ouvres pas l'app. À exécuter APRÈS schema.sql, et après avoir déployé la fonction :
--   npx supabase functions deploy system-judge --no-verify-jwt --project-ref TON_PROJECT_REF
--
-- Remplace avant d'exécuter :
--   TON_PROJECT_REF       → l'identifiant du projet (dans l'URL : https://TON_PROJECT_REF.supabase.co)
--   TON_EMAIL@exemple.com → l'adresse qui recevra les alertes
--   https://ton-app.exemple.com → l'adresse de ton app (lien dans l'email), ou laisse tel quel
--   re_TA_CLE_RESEND      → ta clé API Resend (resend.com, gratuit). Sans clé, le Système juge quand même, sans email.

create extension if not exists pg_net schema extensions;
create extension if not exists pg_cron;

-- Secrets (chiffrés dans Vault). Le secret du cron est généré ici, tu n'as pas besoin de le connaître.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'system_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'system_cron_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'notify_email') then
    perform vault.create_secret('TON_EMAIL@exemple.com', 'notify_email');
  end if;
  if not exists (select 1 from vault.secrets where name = 'app_url') then
    perform vault.create_secret('https://ton-app.exemple.com', 'app_url');
  end if;
end $$;
-- Clé Resend (décommente et remplace) :
-- select vault.create_secret('re_TA_CLE_RESEND', 'resend_api_key');

-- Passage toutes les heures à hh:05 : la fonction ne fait rien si la journée est déjà jugée,
-- donc la pénalité tombe au premier passage après minuit dans ton fuseau horaire.
select cron.unschedule('system-judge') where exists (select 1 from cron.job where jobname = 'system-judge');
select cron.schedule(
  'system-judge',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://TON_PROJECT_REF.supabase.co/functions/v1/system-judge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'system_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
