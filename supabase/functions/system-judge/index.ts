// Le Système, côté serveur : appelé toutes les heures par pg_cron (voir supabase/cron.sql).
// Juge la veille dans le fuseau du joueur, tire la pénalité, met à jour le rang,
// et envoie un email (Resend) quand quelque chose de nouveau tombe.
// Idempotent : rien ne se passe si la journée a déjà été jugée (par le serveur ou par l'app).
//
// Les règles viennent des mêmes fichiers que l'app (copiés dans ./lib par `npm run sync:function`).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { dayKey } from './lib/dates.js'
import { draw, evaluate } from './lib/penalties.js'
import { DEFAULT_PLAYER, QUESTS, judge, levelOf, samePlayer, totalXp } from './lib/ranking.js'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Date dont les champs « locaux » (getDate, getHours…) valent l'heure murale du fuseau donné.
// Les règles utilisent ces champs : on les fait tourner comme si le serveur était dans le fuseau du joueur.
const wallClock = (d: Date, tz: string) => new Date(d.toLocaleString('en-US', { timeZone: tz }))

async function load() {
  const q = (t: string) => db.from(t).select('*')
  const res = await Promise.all([
    q('habits').order('position'), q('habit_logs'), q('goals'), q('goal_steps'),
    q('penalties').order('day'), db.from('player').select('*').maybeSingle(), q('rank_events').order('created_at'),
  ])
  const err = res.find((r) => r.error)?.error
  if (err) throw err
  const [habits, logs, goals, steps, penalties, player, rankEvents] = res.map((r) => r.data)
  return { habits, logs, goals, steps, penalties, player, rankEvents }
}

Deno.serve(async (req) => {
  const { data: settings, error: settingsError } = await db.rpc('system_settings')
  if (settingsError) return json({ error: settingsError.message }, 500)
  if (!settings.system_cron_secret || req.headers.get('x-cron-secret') !== settings.system_cron_secret) {
    return json({ error: 'unauthorized' }, 401)
  }
  const body = await req.json().catch(() => ({}))
  const dry = body.dry === true // simulation : calcule sans rien écrire ni envoyer

  const raw = await load()
  const tz = raw.player?.timezone || 'Europe/Paris'
  const now = wallClock(new Date(), tz)
  const today = dayKey(now)

  // Même forme de données que dans l'app (src/lib/store.jsx)
  const logSet = new Set(raw.logs.map((l: { habit_id: string; day: string }) => `${l.habit_id}|${l.day}`))
  const habits = raw.habits
    .filter((h: { archived: boolean }) => !h.archived)
    .map((h: { created_at: string }) => ({ ...h, created_at: wallClock(new Date(h.created_at), tz).toISOString() }))
  const data = { ...raw, habits, isDone: (id: string, d: string) => logSet.has(`${id}|${d}`) }

  if (body.test === 'email') {
    const sent = await notify(settings, { penalty: { title: '100 pompes', detail: 'Email de test du Système.', missed_rate: 60 }, events: [] }, today)
    return json({ test: true, sent })
  }

  // 1. Pénalité du jour
  let penalty = null
  const verdict = !raw.penalties.some((p: { day: string }) => p.day === today) && evaluate(data, now)
  if (verdict) {
    const pick = draw(verdict, raw.penalties)
    const row = {
      day: today, missed_day: verdict.yesterday, missed_rate: verdict.rate,
      penalty_id: pick.id, title: pick.title, detail: pick.detail, accepted: false, done: false,
    }
    if (dry) penalty = row
    else {
      // Si l'app l'a créée entre-temps, on ne l'écrase pas
      const { data: inserted, error } = await db.from('penalties').upsert(row, { onConflict: 'day', ignoreDuplicates: true }).select()
      if (error) return json({ error: error.message }, 500)
      if (inserted?.length) penalty = row
    }
  }

  // 2. Classement (promotion, rétrogradation, nouvelle quête)
  const before = raw.player || { ...DEFAULT_PLAYER, timezone: tz, seen_level: levelOf(totalXp(data, now)).level }
  const { player, events } = judge(data, before, now)
  if (dry) {
    return json({ dry: true, today, timezone: tz, verdict, penalty: penalty?.title ?? null, player, events: events.map((e) => `${e.kind}:${e.rank}`) })
  }
  if (!samePlayer(player, raw.player)) {
    const { error } = await db.from('player').upsert({ ...player, updated_at: new Date().toISOString() })
    if (error) return json({ error: error.message }, 500)
  }
  if (events.length) {
    const { error } = await db.from('rank_events').insert(events)
    if (error) return json({ error: error.message }, 500)
  }

  const sent = penalty || events.length ? await notify(settings, { penalty, events }, today) : false
  return json({ today, timezone: tz, penalty: penalty?.title ?? null, events: events.map((e) => `${e.kind}:${e.rank}`), sent })
})

// ---------- Email ----------
type Notice = {
  penalty: { title: string; detail?: string; missed_rate: number } | null
  events: { kind: string; rank: string }[]
}

async function notify(settings: Record<string, string>, n: Notice, today: string) {
  if (!settings.resend_api_key || !settings.notify_email) return false
  const subject = n.penalty
    ? `⚠ [Système] Quête de pénalité : ${n.penalty.title}`
    : `[Système] ${eventTitle(n.events[0])}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.resend_api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Système <onboarding@resend.dev>', to: [settings.notify_email], subject, html: emailHtml(n, settings.app_url, today) }),
  })
  if (!res.ok) console.error('[Resend]', res.status, await res.text())
  return res.ok
}

const eventTitle = (e: { kind: string; rank: string }) =>
  e.kind === 'promotion' ? `Promotion : rang ${e.rank}`
    : e.kind === 'demotion' ? `Rétrogradation : rang ${e.rank}`
    : `Quête de promotion vers le rang ${e.rank}`

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function emailHtml(n: Notice, appUrl: string | undefined, today: string) {
  const block = (tag: string, color: string, title: string, detail = '') => `
    <tr><td style="padding:18px 22px;border:1px solid ${color};border-radius:4px;background:#0b1424;text-align:center">
      <div style="font:800 11px/1.4 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${color}">${tag}</div>
      <div style="font:900 italic 26px/1.15 Arial,sans-serif;text-transform:uppercase;color:#ffffff;margin-top:8px">${esc(title)}</div>
      ${detail ? `<div style="font:13px/1.5 Arial,sans-serif;color:#c7d3e3;margin-top:8px">${esc(detail)}</div>` : ''}
    </td></tr><tr><td style="height:14px"></td></tr>`

  const blocks = [
    n.penalty && block('[Quête de pénalité]', '#ff4d6d', n.penalty.title, n.penalty.detail),
    ...n.events.map((e) => block(
      e.kind === 'quest_start' ? `[Quête de promotion · rang ${e.rank}]` : '[Classement]',
      e.kind === 'demotion' ? '#ff4d6d' : '#4da3ff',
      e.kind === 'quest_start' ? QUESTS[e.rank]?.label ?? eventTitle(e) : eventTitle(e),
    )),
  ].filter(Boolean).join('')

  const intro = n.penalty
    ? `La quête journalière d'hier n'a pas été accomplie (${n.penalty.missed_rate} %). Le joueur va recevoir une pénalité.`
    : 'Le Système a une notification pour toi.'

  return `<!doctype html><html><body style="margin:0;background:#050607;padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#07101e;border:1.5px solid #4da3ff;border-radius:6px">
    <tr><td style="padding:18px;text-align:center;border-bottom:1px solid #1f3a5c;font:900 20px Arial,sans-serif;letter-spacing:6px;color:#eaf4ff">
      <span style="color:#ff4d6d">⚠</span> ALERTE</td></tr>
    <tr><td style="padding:22px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font:14px/1.5 Arial,sans-serif;color:#c7dcf5;text-align:center;padding-bottom:16px">${intro}</td></tr>
        ${blocks}
        <tr><td style="font:12px/1.5 Arial,sans-serif;color:#6f8aab;text-align:center">Temps limite : minuit (${today}). Refuser n'est pas une option.</td></tr>
        ${appUrl ? `<tr><td align="center" style="padding-top:18px"><a href="${esc(appUrl)}" style="display:inline-block;padding:11px 26px;border:1px solid #4da3ff;border-radius:3px;color:#eaf4ff;text-decoration:none;font:800 13px Arial,sans-serif;letter-spacing:3px">OUVRIR LE SYSTÈME</a></td></tr>` : ''}
      </table>
    </td></tr>
  </table></td></tr></table></body></html>`
}
