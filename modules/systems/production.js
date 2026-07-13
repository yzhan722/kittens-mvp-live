// 资源产量/上限纯计算 + computeDerived 写入辅助
// 维护者窗口：A
// 纯函数不写 state；apply*/ensure* 显式写回

import { natureResProdMul } from "./gameplay_fun.js";

/**
 * 建筑 effects 汇总为产量/上限/解锁字段
 */
export function accumulateBuildingEffects(state, defs) {
  const eff = {
    catnipPerSec: 0,
    woodPerSec: 0,
    mineralsPerSec: 0,
    capCatnipAdd: 0,
    capWoodAdd: 0,
    capMineralsAdd: 0,
    capPokeballAdd: 0,
    capCatnipMul: 1,
    capWoodMul: 1,
    capMineralsMul: 1,
    capPokeballMul: 1,
    unlockWood: false,
    unlockMinerals: false,
    unlockPokeball: false,
  };
  const buildings = defs?.buildings && typeof defs.buildings === "object" ? defs.buildings : {};
  for (const [, bdef] of Object.entries(buildings)) {
    if (!bdef || typeof bdef.effects !== "function") continue;
    let e = null;
    try { e = bdef.effects(state); } catch { e = null; }
    if (!e || typeof e !== "object") continue;
    for (const [k, v] of Object.entries(e)) {
      if (typeof v === "number") eff[k] = (eff[k] ?? 0) + v;
      else eff[k] = v;
    }
  }
  return eff;
}

/**
 * 应用科技/全服 Buff 到产量与上限乘数（就地修改 eff）
 */
export function applyTechAndServerCapToEff(eff, techEff, serverCapMul) {
  if (!eff || !techEff) return eff;
  eff.catnipPerSec *= techEff.catnipPerSecMul ?? 1;
  eff.capCatnipAdd += techEff.capCatnipAdd ?? 0;
  eff.capWoodAdd += techEff.capWoodAdd ?? 0;
  eff.capMineralsAdd += techEff.capMineralsAdd ?? 0;
  eff.capPokeballAdd += techEff.capPokeballAdd ?? 0;
  eff.capCatnipMul *= techEff.capCatnipMul ?? 1;
  eff.capWoodMul *= techEff.capWoodMul ?? 1;
  eff.capMineralsMul *= techEff.capMineralsMul ?? 1;
  eff.capPokeballMul *= techEff.capPokeballMul ?? 1;
  const sb = typeof serverCapMul === "number" && Number.isFinite(serverCapMul) ? serverCapMul : 1;
  eff.capCatnipMul *= sb;
  eff.capWoodMul *= sb;
  eff.capMineralsMul *= sb;
  eff.capPokeballMul *= sb;
  return eff;
}

/**
 * 基础资源 cap（未乘永久增益）
 */
export function computeBaseResourceCaps(defs, eff) {
  const r = defs?.resources ?? {};
  return {
    catnip: ((r.catnip?.baseCap ?? 0) + (eff.capCatnipAdd ?? 0)) * (eff.capCatnipMul ?? 1),
    wood: ((r.wood?.baseCap ?? 0) + (eff.capWoodAdd ?? 0)) * (eff.capWoodMul ?? 1),
    minerals: ((r.minerals?.baseCap ?? 0) + (eff.capMineralsAdd ?? 0)) * (eff.capMineralsMul ?? 1),
    pokeball: ((r.pokeball?.baseCap ?? 0) + (eff.capPokeballAdd ?? 0)) * (eff.capPokeballMul ?? 1),
  };
}

/** 永久增益等级 → 乘数（每级 +10%，上限 10 级） */
export function permanentBoostMul(level, perLvl = 0.1, maxLvl = 10) {
  const lvl =
    typeof level === "number" && Number.isFinite(level)
      ? Math.max(0, Math.min(maxLvl, Math.floor(level)))
      : 0;
  return 1 + lvl * perLvl;
}

/**
 * 非核心资源的 baseCap 表（纯数据）
 * @returns {Record<string, number>}
 */
export function computeStaticItemCaps(defs) {
  const r = defs?.resources ?? {};
  const cap = (id, fallback = 0) => Math.max(0, Math.floor(r[id]?.baseCap ?? fallback));
  return {
    rareCandy: cap("rareCandy"),
    futurecoin: cap("futurecoin"),
    evolutionEnergy: cap("evolutionEnergy"),
    evolutionStone: cap("evolutionStone"),
    linkRope: cap("linkRope"),
    bigBerry: cap("bigBerry"),
    hugeBerry: cap("hugeBerry"),
    megaStone: cap("megaStone"),
    masterball: cap("masterball"),
    hpPotion: cap("hpPotion"),
    atkPotion: cap("atkPotion"),
    defPotion: cap("defPotion"),
    spaPotion: cap("spaPotion"),
    spdPotion: cap("spdPotion"),
    spePotion: cap("spePotion"),
    expCandy: cap("expCandy", 999),
    expCandyL: cap("expCandyL", 999),
    expCandyXL: cap("expCandyXL", 999),
    ultraball: cap("ultraball", 999),
    quickball: cap("quickball", 999),
    luxuryball: cap("luxuryball", 999),
    affectionTreat: cap("affectionTreat", 999),
    friendshipBracelet: cap("friendshipBracelet", 999),
    shinyCharm: cap("shinyCharm", 99),
    luckyEgg: cap("luckyEgg", 99),
    bottleCap: cap("bottleCap", 999),
    goldBottleCap: cap("goldBottleCap", 99),
  };
}

/** 必须存在的核心资源 id（始终写 cap） */
const CORE_ALWAYS = new Set([
  "rareCandy", "futurecoin", "evolutionEnergy", "evolutionStone", "linkRope",
  "bigBerry", "hugeBerry", "megaStone", "masterball",
  "hpPotion", "atkPotion", "defPotion", "spaPotion", "spdPotion", "spePotion",
]);

/**
 * 写回核心四资源 cap
 */
export function applyCoreResourceCaps(state, caps, unlockPokeball, permCapMul) {
  if (!state?.res) return;
  const mul = typeof permCapMul === "number" && Number.isFinite(permCapMul) ? permCapMul : 1;
  state.res.catnip.cap = Math.max(0, Math.floor((caps?.catnip ?? 0) * mul));
  state.res.wood.cap = Math.max(0, Math.floor((caps?.wood ?? 0) * mul));
  state.res.minerals.cap = Math.max(0, Math.floor((caps?.minerals ?? 0) * mul));
  state.res.pokeball.cap = unlockPokeball ? Math.max(0, Math.floor((caps?.pokeball ?? 0) * mul)) : 0;
}

/**
 * 写回道具/商店资源 cap（核心 always；可选资源仅在 state.res 已有时写）
 */
export function applyStaticItemCaps(state, itemCaps) {
  if (!state?.res || !itemCaps) return;
  for (const [rid, cap] of Object.entries(itemCaps)) {
    if (CORE_ALWAYS.has(rid)) {
      if (!state.res[rid] || typeof state.res[rid] !== "object") state.res[rid] = { value: 0, cap: 0 };
      state.res[rid].cap = cap;
    } else if (state.res[rid]) {
      state.res[rid].cap = cap;
    }
  }
}

/**
 * 确保 buildings / training / breeding 容器形状，并裁剪训练槽
 * @param {(n:number,min:number,max:number)=>number} clampFn
 */
export function ensureDerivedContainers(state, clampFn) {
  if (!state || typeof state !== "object") return;
  if (!state.buildings || typeof state.buildings !== "object") state.buildings = {};
  if (!state.buildings.trainingGround || typeof state.buildings.trainingGround !== "object") {
    state.buildings.trainingGround = { owned: 0 };
  }
  if (!state.buildings.breedingHouse || typeof state.buildings.breedingHouse !== "object") {
    state.buildings.breedingHouse = { owned: 0 };
  }
  if (!state.buildings.expeditionPost || typeof state.buildings.expeditionPost !== "object") {
    state.buildings.expeditionPost = { owned: 0 };
  }
  if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
  if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
  const owned = typeof state.buildings.trainingGround.owned === "number" ? state.buildings.trainingGround.owned : 0;
  const trainingSlots = clampFn(owned, 0, 10);
  state.training.slotSize = trainingSlots;
  if (trainingSlots <= 0) {
    state.training.activeIds = [];
  } else {
    const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const alive = new Set(
      mons.map((m) => (m && typeof m.id === "number" ? m.id : null)).filter((x) => typeof x === "number")
    );
    state.training.activeIds = state.training.activeIds.filter((id) => alive.has(id)).slice(0, trainingSlots);
  }
  if (!state.breeding || typeof state.breeding !== "object") {
    state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
  }
}

/**
 * 解锁后的木材/矿物基础产量（未乘 normal/全局 nerf/server）
 */
export function computeUnlockedResourceRates(state, techEff) {
  const woodUnlocked = Boolean(state?.unlocks?.wood);
  const mineralsUnlocked = Boolean(state?.unlocks?.minerals);
  const b = state?.buildings ?? {};
  let woodPerSec = 0;
  let mineralsPerSec = 0;
  if (woodUnlocked) {
    woodPerSec =
      (0.02 * (b.hut?.owned ?? 0) +
        0.0025 * (b.workshop?.owned ?? 0) +
        0.015 * (b.lumberYard?.owned ?? 0)) *
      (techEff?.woodRateMul ?? 1) *
      2;
  }
  if (mineralsUnlocked) {
    mineralsPerSec =
      (0.005 * (b.workshop?.owned ?? 0) + 0.0075 * (b.quarry?.owned ?? 0)) *
      (techEff?.mineralsRateMul ?? 1) *
      2;
  }
  return { woodPerSec, mineralsPerSec };
}

/**
 * 产量终算：normal 技能、全局 ×0.5、全服产量、永久产量、饲养消耗
 * 调用方须先写入 unlocks，并用 computeUnlockedResourceRates 覆盖 wood/minerals（若已解锁）
 */
export function finalizeProductionRates(eff, state, serverProdMul) {
  if (!eff) return eff;

  const normalStacks = Array.isArray(state?.skills?.normalBoostStacks) ? state.skills.normalBoostStacks.length : 0;
  const normalMul = Math.max(1, 1 + normalStacks);
  eff.catnipPerSec *= normalMul;
  eff.woodPerSec *= normalMul;
  eff.mineralsPerSec *= normalMul;

  eff.catnipPerSec *= 0.5;
  eff.woodPerSec *= 0.5;
  eff.mineralsPerSec *= 0.5;

  const sb = typeof serverProdMul === "number" && Number.isFinite(serverProdMul) ? serverProdMul : 1;
  eff.catnipPerSec *= sb;
  eff.woodPerSec *= sb;
  eff.mineralsPerSec *= sb;

  const permProdMul = permanentBoostMul(state?.permanentBoosts?.production);
  if (permProdMul > 1) {
    eff.catnipPerSec *= permProdMul;
    eff.woodPerSec *= permProdMul;
    eff.mineralsPerSec *= permProdMul;
  }

  const calmMul = natureResProdMul(state);
  if (calmMul !== 1) {
    eff.catnipPerSec *= calmMul;
    eff.woodPerSec *= calmMul;
    eff.mineralsPerSec *= calmMul;
  }

  const breedingOn = Boolean(state?.breeding?.on);
  const breedingUnlocked = (state?.buildings?.breedingHouse?.owned ?? 0) > 0;
  const aId = typeof state?.breeding?.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
  const bId = typeof state?.breeding?.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
  if (breedingOn && breedingUnlocked && aId && bId && aId !== bId) {
    eff.catnipPerSec -= 10;
  }

  return eff;
}

