/** Normalize persisted PvP recent-result rows. */
export function normalizePvpRecent(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x.line === "string")
    .slice(0, 5)
    .map((x) => ({
      line: String(x.line).slice(0, 240),
      winner: x.winner,
      at: typeof x.at === "number" && Number.isFinite(x.at) ? x.at : Date.now(),
    }));
}

export function bumpPvpSeasonStats(meta, winner) {
  if (!meta || typeof meta !== "object") return;
  if (!meta.pvpStats || typeof meta.pvpStats !== "object") {
    meta.pvpStats = { wins: 0, losses: 0, draws: 0 };
  }
  if (winner === 2) meta.pvpStats.wins = Math.max(0, Math.floor(meta.pvpStats.wins || 0)) + 1;
  else if (winner === 1) meta.pvpStats.losses = Math.max(0, Math.floor(meta.pvpStats.losses || 0)) + 1;
  else meta.pvpStats.draws = Math.max(0, Math.floor(meta.pvpStats.draws || 0)) + 1;
}

export function formatPvpSeasonStats(stats) {
  const w = Math.max(0, Math.floor(stats?.wins || 0));
  const l = Math.max(0, Math.floor(stats?.losses || 0));
  const d = Math.max(0, Math.floor(stats?.draws || 0));
  if (w + l + d < 1) return "";
  return d > 0 ? `本赛季 ${w}胜${l}负${d}平` : `本赛季 ${w}胜${l}负`;
}

/** One-line PvP battle headline for logs and recent-results panel. */
export function summarizePvpBattle(result, selfLabel = "你", opts = {}) {
  if (!result || typeof result !== "object") return "对战结束";
  const win = result.winner === 2;
  const loss = result.winner === 1;
  const headline = win ? `${selfLabel} 险胜` : loss ? `${selfLabel} 惜败` : "激战平局";
  const log = Array.isArray(result.battleLog) ? result.battleLog : [];
  const climax = log.filter((l) => /倒下|获胜|超时/.test(String(l))).slice(-2);
  const detail = climax.length ? climax.join(" · ") : `共 ${Math.max(0, result.rounds || 0)} 回合`;
  const recent = Array.isArray(opts.recent) ? opts.recent : [];
  const streak = recent.findIndex((item) => item?.winner !== 2);
  const wins = streak < 0 ? recent.length : streak;
  const season = opts.seasonId ? `赛季 ${opts.seasonId}` : "";
  const suffix = [season, wins >= 2 ? `${wins} 连胜` : "", formatPvpSeasonStats(opts.stats)]
    .filter(Boolean)
    .join(" · ");
  return `${headline} — ${detail}${suffix ? ` · ${suffix}` : ""}`;
}