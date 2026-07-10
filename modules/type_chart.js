/**
 * 统一属性克制表
 * 所有战斗系统（PvE、PvP）都应使用此模块，避免重复定义和不一致
 * 效果拔群：2x | 无效：0x | 效果不佳：0.5x
 */

// 属性克制表（防御方视角）
export const typeChart = {
  normal:   { weakTo: ["fighting"],                           immuneTo: ["ghost"] },
  fire:     { weakTo: ["water", "ground", "rock"],            immuneTo: [] },
  water:    { weakTo: ["electric", "grass"],                  immuneTo: [] },
  electric: { weakTo: ["ground"],                             immuneTo: [] },
  grass:    { weakTo: ["fire", "ice", "poison", "flying", "bug"], immuneTo: [] },
  ice:      { weakTo: ["fire", "fighting", "rock", "steel"],  immuneTo: [] },
  fighting: { weakTo: ["flying", "psychic", "fairy"],        immuneTo: [] },
  poison:   { weakTo: ["ground", "psychic"],                 immuneTo: [] },
  ground:   { weakTo: ["water", "grass", "ice"],              immuneTo: ["electric"] },
  flying:   { weakTo: ["electric", "ice", "rock"],            immuneTo: ["ground"] },
  psychic:  { weakTo: ["bug", "ghost", "dark"],               immuneTo: [] },
  bug:      { weakTo: ["fire", "flying", "rock"],             immuneTo: [] },
  rock:     { weakTo: ["water", "grass", "fighting", "ground", "steel"], immuneTo: [] },
  ghost:    { weakTo: ["ghost", "dark"],                      immuneTo: ["normal", "fighting"] },
  dragon:   { weakTo: ["ice", "dragon", "fairy"],              immuneTo: [] },
  dark:     { weakTo: ["fighting", "bug", "fairy"],           immuneTo: ["psychic"] },
  steel:    { weakTo: ["fire", "fighting", "ground"],          immuneTo: ["poison"] },
  fairy:    { weakTo: ["poison", "steel"],                     immuneTo: ["dragon"] },
};

// 属性克制倍率常量
export const TYPE_MUL = {
  SUPER_EFFECTIVE: 2,   // 效果拔群
  NOT_EFFECTIVE: 0,      // 无效
  WEAK: 0.5,            // 效果不佳（预留）
  NORMAL: 1,            // 正常
};

/**
 * 获取单属性对单属性的倍率（攻击方 → 防御方）
 * @param {string} atkType - 攻击方属性
 * @param {string} defType - 防御方属性
 * @returns {number} 倍率：2(效果拔群), 0(无效), 1(正常)
 */
export function getTypeMul(atkType, defType) {
  if (!atkType || !defType) return TYPE_MUL.NORMAL;
  const c = typeChart[defType];
  if (!c) return TYPE_MUL.NORMAL;
  if (Array.isArray(c.immuneTo) && c.immuneTo.includes(atkType)) return TYPE_MUL.NOT_EFFECTIVE;
  if (Array.isArray(c.weakTo) && c.weakTo.includes(atkType)) return TYPE_MUL.SUPER_EFFECTIVE;
  return TYPE_MUL.NORMAL;
}

/**
 * 计算攻击方多属性 vs 防御方多属性的综合倍率
 * @param {string[]} atkTypes - 攻击方属性数组
 * @param {string[]} defTypes - 防御方属性数组
 * @returns {number} 综合倍率（任意免疫则返回0）
 */
export function calcTypeMul(atkTypes, defTypes) {
  if (!Array.isArray(atkTypes) || !Array.isArray(defTypes)) return TYPE_MUL.NORMAL;
  let totalMul = TYPE_MUL.NORMAL;
  for (const dt of defTypes) {
    let bestForDef = TYPE_MUL.NORMAL;
    for (const at of atkTypes) {
      const m = getTypeMul(at, dt);
      if (m === TYPE_MUL.NOT_EFFECTIVE) return TYPE_MUL.NOT_EFFECTIVE;
      if (m > bestForDef) bestForDef = m;
    }
    totalMul *= bestForDef;
  }
  return totalMul;
}

/**
 * 获取属性的中文名称（需要配合外部 TYPE_ZH 使用）
 */
export const TYPE_KEYS = Object.keys(typeChart);
