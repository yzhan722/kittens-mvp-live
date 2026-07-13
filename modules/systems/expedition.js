// 远征属性克制倍率 + 赛季文案（纯函数）
// 维护者窗口：B
import { getExpLevelKeys } from "../expedition_defs.js";
import { REMOTE_CONFIG_DEFAULTS } from "../remote_config.js";
import { getTypeMul, TYPE_MUL } from "../type_chart.js";

/** @type {Record<string, string>} */
export const EXPEDITION_SEASON_BLURBS = {
  s1: "赛季奖励：标准经验与未来币",
  s2: "赛季奖励：药剂掉落权重提升",
  s3: "赛季奖励：高阶副本额外未来币",
};

export function resolveExpeditionSeasonLabel(remoteConfig) {
  const label = remoteConfig?.expeditionSeasonLabel;
  return typeof label === "string" && label.trim() ? label.trim() : REMOTE_CONFIG_DEFAULTS.expeditionSeasonLabel;
}

export function resolveSeasonId(remoteConfig) {
  const id = remoteConfig?.seasonId;
  return typeof id === "string" && id.trim() ? id.trim() : REMOTE_CONFIG_DEFAULTS.seasonId;
}

export function getExpeditionSeasonBlurb(seasonId) {
  const sid = typeof seasonId === "string" && seasonId.trim() ? seasonId.trim() : REMOTE_CONFIG_DEFAULTS.seasonId;
  return EXPEDITION_SEASON_BLURBS[sid] ?? EXPEDITION_SEASON_BLURBS.s1;
}

/**
 * 随机生成 3 个属性副本（纯函数）
 * @param {string[]} typeKeys
 */
export function pickExpeditionDungeons(typeKeys) {
  const keys = Array.isArray(typeKeys) ? typeKeys.filter((t) => typeof t === "string" && t) : [];
  if (keys.length === 0) return [];
  const picks = [];
  const seen = new Set();
  let guard = 0;
  while (picks.length < 3 && guard < 200) {
    guard += 1;
    const t = keys[Math.floor(Math.random() * keys.length)];
    if (!t || seen.has(t)) continue;
    seen.add(t);
    picks.push({ key: `${t}_${Math.floor(Math.random() * 1e9)}`, type: t });
  }
  return picks;
}

/** 补齐缺失等级副本池（就地修改 dungeons） */
export function ensureExpeditionDungeonTiers(dungeons, typeKeys, levelKeys = getExpLevelKeys()) {
  if (!dungeons || typeof dungeons !== "object") return false;
  const keys = Array.isArray(levelKeys) ? levelKeys : getExpLevelKeys();
  let changed = false;
  for (const k of keys) {
    const list = dungeons[k];
    if (!Array.isArray(list) || list.length === 0) {
      dungeons[k] = pickExpeditionDungeons(typeKeys);
      changed = true;
    }
  }
  return changed;
}

/**
 * 远征有效战力属性倍率
 * @param {string[]} monTypes
 * @param {string|null|undefined} dungeonType
 * @returns {1.5|1|0.5}
 */
export function expeditionTypeMulFromTypes(monTypes, dungeonType) {
  if (!dungeonType || !Array.isArray(monTypes) || monTypes.length === 0) return 1;
  const atkGood = monTypes.some((t) => getTypeMul(t, dungeonType) === TYPE_MUL.SUPER_EFFECTIVE);
  const defBad = monTypes.some(
    (t) =>
      getTypeMul(dungeonType, t) === TYPE_MUL.SUPER_EFFECTIVE ||
      getTypeMul(t, dungeonType) === TYPE_MUL.NOT_EFFECTIVE
  );
  if (atkGood) return 1.5;
  if (defBad) return 0.5;
  return 1;
}

/**
 * @param {{ dex?: number }} mon
 * @param {string|null|undefined} dungeonType
 * @param {(dex: number) => { types?: string[] } | null | undefined} getPokeApiDataByDex
 */
export function expeditionTypeMul(mon, dungeonType, getPokeApiDataByDex) {
  const monTypes = getMonTypesForExpedition(mon, getPokeApiDataByDex);
  return expeditionTypeMulFromTypes(monTypes, dungeonType);
}

export function getMonTypesForExpedition(mon, getPokeApiDataByDex) {
  const localTypes = globalThis.POKEMON_TYPES;
  if (localTypes && typeof localTypes === "object" && mon && mon.dex != null) {
    const lt = localTypes[mon.dex];
    if (Array.isArray(lt) && lt.length > 0) return lt;
  }
  const api = typeof getPokeApiDataByDex === "function" ? getPokeApiDataByDex(mon?.dex) : null;
  const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
  return types.filter((x) => typeof x === "string");
}
