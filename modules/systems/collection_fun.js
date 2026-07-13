/** Collection dopamine — shiny gallery + season relics (non-FC unique loot). */

import { REMOTE_CONFIG_DEFAULTS } from "../remote_config.js";

/** Season relics: unique named loot (existing item grants), not another FC daily. */
export const SEASON_RELIC_TABLE = Object.freeze({
  s1: { id: "ember_sigil", name: "余烬印记", item: "rareCandy", chance: 0.14, blurb: "远征余烬凝成印记。" },
  s2: { id: "vial_sigil", name: "药剂印记", item: "hpPotion", chance: 0.18, blurb: "药瓶残液凝成印记。" },
  s3: { id: "peak_sigil", name: "峰顶印记", item: "expCandy", chance: 0.16, blurb: "高阶副本的峰顶印记。" },
});

const DEFAULT_RELIC = SEASON_RELIC_TABLE.s1;

export function resolveSeasonRelicDef(seasonId) {
  const sid = typeof seasonId === "string" && seasonId.trim() ? seasonId.trim() : REMOTE_CONFIG_DEFAULTS.seasonId;
  return SEASON_RELIC_TABLE[sid] || DEFAULT_RELIC;
}

/** @returns {null|{id,name,item,blurb}} */
export function rollSeasonRelic(seasonId, randFloat = Math.random) {
  const def = resolveSeasonRelicDef(seasonId);
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  if (roll >= def.chance) return null;
  return { id: def.id, name: def.name, item: def.item, blurb: def.blurb };
}

export function ensureSeasonRelics(state) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.seasonRelics || typeof state.meta.seasonRelics !== "object") {
    state.meta.seasonRelics = {};
  }
  return state.meta.seasonRelics;
}

/** Record relic + return grant payload. Caller applies addRes. */
export function noteSeasonRelic(state, relic) {
  if (!relic || typeof relic !== "object" || !relic.id) return null;
  const bag = ensureSeasonRelics(state);
  const prev = Math.max(0, Math.floor(bag[relic.id] || 0));
  bag[relic.id] = prev + 1;
  return { id: relic.id, name: relic.name, item: relic.item, count: bag[relic.id], blurb: relic.blurb || "" };
}

export function seasonRelicLines(state) {
  const bag = state?.meta?.seasonRelics;
  if (!bag || typeof bag !== "object") return [];
  const out = [];
  for (const def of Object.values(SEASON_RELIC_TABLE)) {
    const n = Math.max(0, Math.floor(bag[def.id] || 0));
    if (n > 0) out.push({ id: def.id, name: def.name, count: n, item: def.item });
  }
  return out;
}

/** Shiny species gallery — unique pid keys. */
export function ensureShinyDex(state) {
  if (!state.dex || typeof state.dex !== "object") state.dex = { caught: {} };
  if (!state.dex.shiny || typeof state.dex.shiny !== "object") state.dex.shiny = {};
  return state.dex.shiny;
}

/** Register shiny species; returns milestone payload if a threshold unlocked. */
export function noteShinySpecies(state, species, { silent = false } = {}) {
  if (!species || typeof species !== "object") return null;
  const pid = species.id;
  if (!pid) return null;
  const shiny = ensureShinyDex(state);
  const wasNew = !shiny[pid];
  shiny[pid] = {
    dex: typeof species.dex === "number" ? species.dex : 0,
    name: typeof species.name === "string" ? species.name : String(pid),
    at: Date.now(),
  };
  if (!wasNew || silent) return null;
  const unique = Object.keys(shiny).length;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.shinyMilestones || typeof state.meta.shinyMilestones !== "object") {
    state.meta.shinyMilestones = {};
  }
  const ms = state.meta.shinyMilestones;
  const thresholds = [
    { n: 1, id: "s1", item: "rareCandy", label: "首枚闪光图鉴：神奇糖果 ×1" },
    { n: 3, id: "s3", item: "expCandy", label: "闪光图鉴×3：经验糖果 ×1" },
    { n: 5, id: "s5", item: "affectionTreat", label: "闪光图鉴×5：亲密点心 ×1" },
  ];
  for (const t of thresholds) {
    if (unique >= t.n && !ms[t.id]) {
      ms[t.id] = true;
      return { id: t.id, item: t.item, label: t.label, unique };
    }
  }
  return null;
}

export function shinyGalleryEntries(state, limit = 12) {
  const shiny = state?.dex?.shiny;
  if (!shiny || typeof shiny !== "object") return [];
  const entries = Object.entries(shiny)
    .map(([pid, v]) => ({
      pid,
      dex: typeof v?.dex === "number" ? v.dex : 0,
      name: typeof v?.name === "string" ? v.name : pid,
      at: typeof v?.at === "number" ? v.at : 0,
    }))
    .sort((a, b) => b.at - a.at);
  const lim = Math.max(0, Math.floor(limit));
  return lim > 0 ? entries.slice(0, lim) : entries;
}

export function shinyUniqueCount(state) {
  const shiny = state?.dex?.shiny;
  if (!shiny || typeof shiny !== "object") return 0;
  return Object.keys(shiny).length;
}

/** Sync gallery from owned shiny mons (migration / repair; no milestone grants). */
export function syncShinyGalleryFromMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  let added = 0;
  for (const m of list) {
    if (!m || !m.isShiny || !m.pid) continue;
    const before = shinyUniqueCount(state);
    noteShinySpecies(state, { id: m.pid, dex: m.dex, name: m.name }, { silent: true });
    if (shinyUniqueCount(state) > before) added += 1;
  }
  return added;
}
