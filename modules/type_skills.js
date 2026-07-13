/** Type skills — single source of truth for names, UI, and activation gates. */

export const TYPE_SKILLS = {
  normal: "牛马",
  fire: "温暖",
  water: "浇水",
  electric: "充电",
  grass: "种植",
  ice: "保鲜",
  fighting: "训练",
  poison: "恶心",
  ground: "挖矿",
  flying: "飞翔",
  psychic: "妙手",
  bug: "恐吓林佬",
  rock: "打磨",
  ghost: "折磨",
  dragon: "震慑",
  dark: "霸凌",
  steel: "精工",
  fairy: "祝福",
};

/** Short effect blurbs for UI. */
export const TYPE_SKILL_DESC = {
  normal: "资源产量叠加 +1 层（60秒）",
  fire: "生蛋剩余时间 -15 分钟",
  water: "种植中的果树 -10 分钟",
  electric: "研究剩余时间 -10 分钟",
  grass: "消耗 1万树果，种植 8 小时后得大树果",
  ice: "饱腹自然下降减半（60分钟）",
  fighting: "训练经验叠加 +1 层（1小时）",
  poison: "建造/研究/搓球成本 -20%（60分钟）",
  ground: "挖矿 10 分钟后得进化能量",
  flying: "远征剩余时间 -30 分钟",
  psychic: "合成加速次数 +10",
  bug: "攻击全服林佬 Boss",
  rock: "建筑成本 -20%（60分钟）",
  ghost: "随机其他冷却中精灵 CD 减半",
  dragon: "捕获率 +10%（10分钟）",
  dark: "PvE 伤害 +50%（10分钟）",
  steel: "精灵球成本 -10%（+100 次）",
  fairy: "亲密度获取 ×2（60分钟）",
};

export const IMPLEMENTED_SKILL_TYPES = Object.freeze(Object.keys(TYPE_SKILLS));

/**
 * Global buff / charge skills: batch button only fires once（用第一只就绪精灵），
 * 避免 50 只牛马叠出夸张层数。
 */
export const BATCH_ONCE_SKILL_TYPES = Object.freeze([
  "normal",
  "fighting",
  "ice",
  "fairy",
  "dragon",
  "rock",
  "poison",
  "dark",
  "steel",
  "psychic",
  "bug",
]);

export function isSkillImplemented(typeId) {
  return Boolean(typeId && TYPE_SKILLS[typeId]);
}

export function skillCdSec(typeId) {
  return typeId === "grass" ? 8 * 3600 : 3600;
}

/** Active global buff lines for Mons UI. */
export function listActiveSkillBuffs(skills) {
  const s = skills && typeof skills === "object" ? skills : {};
  const lines = [];
  const fmt = (sec) => {
    const n = Math.max(0, Math.ceil(Number(sec) || 0));
    const mm = Math.floor(n / 60);
    const ss = n % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };
  const trainN = Array.isArray(s.trainingStacks) ? s.trainingStacks.length : 0;
  if (trainN > 0) lines.push(`训练叠层 ×${trainN}`);
  const normN = Array.isArray(s.normalBoostStacks) ? s.normalBoostStacks.length : 0;
  if (normN > 0) lines.push(`产量叠层 ×${normN}`);
  if ((s.iceSatietySlowRemainingSec ?? 0) > 0) lines.push(`保鲜 ${fmt(s.iceSatietySlowRemainingSec)}`);
  if ((s.fairyAffGainRemainingSec ?? 0) > 0) lines.push(`祝福 ${fmt(s.fairyAffGainRemainingSec)}`);
  if ((s.dragonCatchBoostRemainingSec ?? 0) > 0) lines.push(`震慑 ${fmt(s.dragonCatchBoostRemainingSec)}`);
  if ((s.rockBuildBoostRemainingSec ?? 0) > 0) lines.push(`打磨 ${fmt(s.rockBuildBoostRemainingSec)}`);
  if ((s.poisonResourceSaveRemainingSec ?? 0) > 0) lines.push(`恶心 ${fmt(s.poisonResourceSaveRemainingSec)}`);
  if ((s.darkPveDamageBoostRemainingSec ?? 0) > 0) lines.push(`霸凌 ${fmt(s.darkPveDamageBoostRemainingSec)}`);
  const steel = Math.max(0, Math.floor(s.steelBallDiscountCharges || 0));
  if (steel > 0) lines.push(`精工剩余 ${steel} 次`);
  const psychic = Math.max(0, Math.floor(s.psychicCraftBoostCharges || 0));
  if (psychic > 0) lines.push(`妙手剩余 ${psychic} 次`);
  return lines;
}

globalThis.TYPE_SKILLS = TYPE_SKILLS;
