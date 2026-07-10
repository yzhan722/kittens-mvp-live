// 远征属性克制倍率（纯函数）
// 维护者窗口：B
import { getTypeMul, TYPE_MUL } from "../type_chart.js";

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
