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
  const suffix = [season, wins >= 2 ? `${wins} 连胜` : ""].filter(Boolean).join(" · ");
  return `${headline} — ${detail}${suffix ? ` · ${suffix}` : ""}`;
}
