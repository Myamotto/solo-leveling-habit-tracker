import { useData } from '../lib/store'
import { HISTORY_MIN, QUESTS, RANKS, avg30, fullDays, levelOf, questProgress, rankIdx, rankOf, totalXp } from '../lib/ranking'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { statValues } from '../lib/attributes'
import { Card } from './ui'
import { SysWindow } from './System'

export function usePlayer() {
  const data = useData()
  const xp = totalXp(data)
  return {
    data,
    player: data.player,
    xp,
    ...levelOf(xp),
    avg: avg30(data),
    history: fullDays(data).length,
    quest: questProgress(data, data.player),
  }
}

export const RankLetter = ({ id, size = 64 }) => {
  const c = rankOf(id).color
  return (
    <span className="rank-letter" style={{ fontSize: size, color: c, textShadow: `0 0 ${size / 3}px ${c}` }}>{id}</span>
  )
}

// Pastille de la barre du haut
export function RankPill() {
  const { player, level } = usePlayer()
  const c = rankOf(player.rank).color
  return (
    <span className="rank-pill" style={{ '--c': c }}>
      Rang <b>{player.rank}</b> · Niv <b>{level}</b>
    </span>
  )
}

// Carte « Joueur » de la page Aujourd'hui
export function PlayerCard() {
  const { player, xp, level, into, need, avg, history, quest } = usePlayer()
  const r = rankOf(player.rank)

  return (
    <Card className="player-card">
      <div className="player-rank">
        <RankLetter id={player.rank} size={84} />
        <span className="player-rank-label">Rang</span>
      </div>

      <div className="player-main">
        <div className="player-level">
          <span className="player-lv">Niv. {level}</span>
          <span className="muted small">{xp.toLocaleString('fr-FR')} XP au total</span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${(into / need) * 100}%`, background: r.color, boxShadow: `0 0 14px ${r.color}` }} />
        </div>
        <div className="muted small">{into} / {need} XP avant le niveau {level + 1}</div>

        <ul className="ladder">
          {RANKS.map((x) => (
            <li
              key={x.id}
              className={`${x.id === player.rank ? 'cur' : ''} ${rankIdx(x.id) < rankIdx(player.rank) ? 'past' : ''}`}
              style={{ '--c': x.color }}
              title={`Rang ${x.id} : ${x.min} % de moyenne sur 30 jours`}
            >
              {x.id}
            </li>
          ))}
        </ul>
      </div>

      <div className="player-side">
        {history < HISTORY_MIN ? (
          <>
            <span className="sys-tag blue">[Évaluation]</span>
            <p className="player-note">Le Système t'observe. Classement dans <b>{HISTORY_MIN - history} jour{HISTORY_MIN - history > 1 ? 's' : ''}</b>.</p>
          </>
        ) : quest ? (
          <>
            <span className="sys-tag blue">[Quête de promotion · rang {quest.rank}]</span>
            <p className="player-note">{quest.label}</p>
            <div className="quest-pips">
              {Array.from({ length: quest.n }, (_, i) => (
                <span key={i} className={i < quest.streak ? 'on' : i === quest.streak && quest.todayOk ? 'today' : ''} />
              ))}
            </div>
            <p className="muted small">
              {Math.min(quest.streak, quest.n)}/{quest.n} jours{quest.todayOk ? " · aujourd'hui en bonne voie" : ''}
              {quest.blocked && <><br /><span className="bad">Bloquée : pénalité ratée ces 30 derniers jours.</span></>}
            </p>
          </>
        ) : (
          <>
            <span className="sys-tag blue">[Moyenne 30 jours]</span>
            <p className="player-avg" style={{ color: r.color }}>{avg ?? '–'} %</p>
            <p className="muted small">
              {player.rank === 'S' ? 'Rang maximal. Tiens-le.' : `Rang ${RANKS[rankIdx(player.rank) + 1].id} à ${RANKS[rankIdx(player.rank) + 1].min} %`}
            </p>
          </>
        )}
      </div>

      <PlayerStats />
    </Card>
  )
}

// Fiche de stats : radar + valeurs
function PlayerStats() {
  const data = useData()
  const stats = statValues(data)
  const max = Math.max(20, ...stats.map((s) => s.value))
  return (
    <div className="player-stats">
      <div className="stats-radar">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={stats} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="short" tick={{ fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }} />
            <Radar dataKey="value" stroke="var(--sys)" fill="var(--sys)" fillOpacity={0.25} strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 6px var(--sys))' }} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ul className="stats-list">
        {stats.map((s) => (
          <li key={s.key}>
            <span className="stats-name" style={{ color: s.color }}>{s.short}</span>
            <span className="stats-label">{s.label}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(s.value / max) * 100}%`, background: s.color, boxShadow: `0 0 10px ${s.color}` }} /></div>
            <b className="stats-val">{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Alertes de classement : événement non vu (promotion, rétrogradation, quête), sinon montée de niveau
export function RankAlert() {
  const { data, player, level } = usePlayer()
  if (!data.playerReady) return null
  const ev = data.rankEvents.find((e) => !e.seen)

  if (ev) {
    const close = () => data.seeRankEvent(ev.id)
    if (ev.kind === 'quest_start') {
      const q = QUESTS[ev.rank]
      return (
        <SysWindow title="Quête" icon="↑" tone="blue">
          <p className="sys-line">Ta régularité a attiré l'attention du Système.</p>
          <div className="sys-quest blue">
            <span className="sys-tag blue">[Quête de promotion · rang {ev.rank}]</span>
            <h2 className="sys-quest-title">{q.label}</h2>
            <p className="sys-quest-detail">La quête commence aujourd'hui. Un jour raté remet le compteur à zéro.</p>
          </div>
          <button className="sys-btn" onClick={close} autoFocus>Accepter</button>
        </SysWindow>
      )
    }
    if (ev.kind === 'promotion') {
      return (
        <SysWindow title="Promotion" icon="★" tone="blue">
          <p className="sys-line">Quête de promotion accomplie.</p>
          <div className="rank-reveal"><RankLetter id={ev.rank} size={120} /></div>
          <p className="sys-line">Le joueur est désormais <b className="blue">rang {ev.rank}</b>.</p>
          <button className="sys-btn" onClick={close} autoFocus>Continuer</button>
        </SysWindow>
      )
    }
    return (
      <SysWindow title="Alerte">
        <p className="sys-line">Ta moyenne sur 30 jours est tombée sous le seuil de ton rang.</p>
        <div className="rank-reveal"><RankLetter id={ev.rank} size={120} /></div>
        <p className="sys-line">Le joueur est rétrogradé <b>rang {ev.rank}</b>.</p>
        <button className="sys-btn" onClick={close} autoFocus>Compris</button>
      </SysWindow>
    )
  }

  if (level > player.seen_level) {
    return (
      <SysWindow title="Level up" icon="↑" tone="blue">
        <p className="sys-line">Tu as gagné un niveau.</p>
        <div className="rank-reveal"><span className="level-big">{level}</span></div>
        <button className="sys-btn" onClick={() => data.updatePlayer({ seen_level: level })} autoFocus>Continuer</button>
      </SysWindow>
    )
  }
  return null
}
