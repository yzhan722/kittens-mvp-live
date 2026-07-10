// Boss bully pure helpers (mirrored from legacy worker)
export const HOUR_MS = 60 * 60 * 1000;
export const BOSS_KEY = "bully";
export const BOSS_MAX_HP = 1000;

export function applyBossRegen(hp, maxHp, updatedAt, now) {
  const hp0 = Math.floor(hp || 0);
  const max0 = Math.floor(maxHp || 0);
  const ts0 = Math.floor(updatedAt || 0);
  if (max0 <= 0) return { hp: hp0, ts: ts0 };
  if (hp0 >= max0) return { hp: max0, ts: ts0 };
  if (ts0 <= 0) return { hp: hp0, ts: ts0 };
  const hours = Math.max(0, Math.floor((now - ts0) / HOUR_MS));
  if (hours <= 0) return { hp: hp0, ts: ts0 };
  const hp2 = Math.min(max0, hp0 + hours);
  const ts2 = ts0 + hours * HOUR_MS;
  return { hp: hp2, ts: ts2 };
}

export function buildBossRewards(rng = Math.random) {
  const randInt = (a, b) => Math.floor(a + rng() * (b - a + 1));
  return {
    futurecoin: randInt(5000, 30000),
    rareCandy: randInt(10, 50),
    masterball: randInt(2, 5),
  };
}

export function parseRewards(rewardJson, rewardType, rewardQty) {
  if (typeof rewardJson === "string" && rewardJson.trim()) {
    try {
      const obj = JSON.parse(rewardJson);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          const q = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0;
          if (k && q > 0) out[String(k)] = q;
        }
        return out;
      }
    } catch {
    }
  }
  const rt = typeof rewardType === "string" ? rewardType : String(rewardType || "");
  const rq =
    typeof rewardQty === "number" && Number.isFinite(rewardQty)
      ? Math.floor(rewardQty)
      : Number(rewardQty || 0);
  if (rt && rq > 0) return { [rt]: Math.floor(rq) };
  return {};
}

/** Fixed damage per attack (legacy used ~1–3% of max; keep simple 10) */
export function bossAttackDamage(maxHp) {
  const max0 = Math.max(1, Math.floor(maxHp || BOSS_MAX_HP));
  return Math.max(1, Math.floor(max0 / 100));
}
