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

/** Random flavor event on expedition complete — small bonus already in tick rewards. */
export const EXPEDITION_EVENT_CARDS = [
  { id: "scout_trail", title: "侦察小径", blurb: "队伍抄近路归来，士气高涨。", bonusFuturecoin: 2 },
  { id: "berry_cache", title: "树果储藏", blurb: "在废墟中发现补给，分给了全队。", bonusFuturecoin: 1 },
  { id: "rival_echo", title: "劲敌残影", blurb: "远处传来对战呐喊，你们加快了脚步。", bonusFuturecoin: 3 },
  { id: "ancient_mark", title: "古代刻痕", blurb: "岩壁上刻着未知图腾，研究员记下坐标。", bonusFuturecoin: 2 },
  { id: "lucky_find", title: "意外拾遗", blurb: "草丛里滚出一枚完好精灵球。", bonusFuturecoin: 1 },
];

export function pickExpeditionEventCard(randFloat = Math.random) {
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  const idx = Math.floor(roll * EXPEDITION_EVENT_CARDS.length);
  return EXPEDITION_EVENT_CARDS[Math.max(0, Math.min(EXPEDITION_EVENT_CARDS.length - 1, idx))];
}

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
