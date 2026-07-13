import { monPower } from "../mons.js";

export const BOX_SOFT_LIMIT = 120;
export const BOX_RELEASE_BATCH = 24;

export function releaseCandyRefund(power) {
  const p = typeof power === "number" && Number.isFinite(power) ? power : 0;
  return Math.max(0, Math.floor(p / 100));
}

/** Ids of mons busy in train / expedition / pve / breed — skip on batch release. */
export function busyMonIds(state) {
  const ids = new Set();
  for (const id of state?.training?.activeIds || []) if (id != null) ids.add(id);
  for (const id of state?.expedition?.selectedIds || []) if (id != null) ids.add(id);
  for (const id of state?.expedition?.activeIds || []) if (id != null) ids.add(id);
  for (const id of state?.pve?.selectedIds || []) if (id != null) ids.add(id);
  const breed = state?.breeding;
  if (breed && typeof breed === "object") {
    for (const id of breed.parentIds || breed.parents || []) if (id != null) ids.add(id);
  }
  return ids;
}

/** Weakest mon ids to drop when box exceeds soft limit. */
export function pickWeakMonIds(list, opts = {}) {
  const softLimit = opts.softLimit ?? BOX_SOFT_LIMIT;
  const batch = opts.batch ?? BOX_RELEASE_BATCH;
  const protect = opts.protectIds ?? new Set();
  if (!Array.isArray(list) || list.length <= softLimit) return [];
  const ranked = list
    .filter((m) => m && !protect.has(m.id))
    .slice()
    .sort((a, b) => monPower(a) - monPower(b) || (a.lvl || 1) - (b.lvl || 1));
  const dropN = Math.min(batch, list.length - softLimit);
  return ranked.slice(0, dropN).map((m) => m.id);
}

/** Remove mons by id; returns { removed, candy, sampleNames }. */
export function releaseMonIds(state, ids, ctx = {}) {
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  if (!idSet.size || !state?.mons?.list) return { removed: 0, candy: 0, sampleNames: [] };
  const { addRes } = ctx;
  let candy = 0;
  const sampleNames = [];
  let removed = 0;
  state.mons.list = state.mons.list.filter((m) => {
    if (!m || !idSet.has(m.id)) return true;
    candy += releaseCandyRefund(monPower(m));
    if (sampleNames.length < 3) sampleNames.push(m.name || "未知精灵");
    removed += 1;
    return false;
  });
  if (candy > 0 && typeof addRes === "function") addRes("rareCandy", candy);
  return { removed, candy, sampleNames };
}
