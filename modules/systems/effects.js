// ===== modules/systems/effects.js =====
// 游戏效果计算纯函数：computeTechEffects / computeDexEffects / getResearchCost 等
// 维护者窗口：A
// 所有函数均为纯函数（输入 state/defs/ui，无副作用），可独立测试
// 使用方式：在 app.js 中通过依赖注入调用，或直接导入用于单元测试
// ======================================

import { clamp } from "../utils.js";
import { serverBuffPct, serverBuffResearchTimeMul as _serverBuffResearchTimeMul } from "./server_buffs.js";

/**
 * 图鉴捕获统计
 * @param {{ dex?: { caught?: Record<string, number> } }} state
 * @returns {{ unique: number, total: number }}
 */
export function dexCaughtCount(state) {
  const caught = state.dex?.caught ?? {};
  let unique = 0;
  let total = 0;
  for (const v of Object.values(caught)) {
    const n = typeof v === "number" ? v : 0;
    if (n > 0) unique++;
    total += n;
  }
  return { unique, total };
}

/**
 * 图鉴加成效果（每种精灵提升资源产量）
 */
export function computeDexEffects(state) {
  const { unique } = dexCaughtCount(state);
  return {
    catnipPerSecMul: 1 + unique * 0.01,
    woodRateMul:     1 + unique * 0.005,
    mineralsRateMul: 1 + unique * 0.005,
    buildingCostMul: 1,
  };
}

/**
 * 科技效果汇总（遍历所有已研究科技的 effects，叠加 dex 加成和全服 Buff）
 * @param {{ tech: object }} state
 * @param {{ tech: Record<string, { effects?: object }> }} defs
 * @param {object} ui  — 用于 serverBuffPct
 * @returns {object} eff
 */
export function computeTechEffects(state, defs, ui) {
  const eff = {
    catnipPerSecMul:   1,
    woodRateMul:       1,
    mineralsRateMul:   1,
    buildingCostMul:   1,
    capCatnipAdd:      0,
    capWoodAdd:        0,
    capMineralsAdd:    0,
    capPokeballAdd:    0,
    capCatnipMul:      1,
    capWoodMul:        1,
    capMineralsMul:    1,
    capPokeballMul:    1,
    pokeballMakeCostMul: 1,
    catchChanceAdd:    0,
  };

  const CAP_ADD_KEYS = new Set(["capCatnipAdd", "capWoodAdd", "capMineralsAdd", "capPokeballAdd"]);
  const techDefs = defs?.tech && typeof defs.tech === "object" ? defs.tech : {};

  for (const [tid, tdef] of Object.entries(techDefs)) {
    if (!state.tech?.[tid]) continue;
    for (const [k, v] of Object.entries(tdef.effects ?? {})) {
      if (typeof v !== "number") continue;
      if (CAP_ADD_KEYS.has(k)) continue;
      if (k.endsWith("Mul")) eff[k] *= v;
      else eff[k] += v;
    }
  }

  const dexEff = computeDexEffects(state);
  for (const [k, v] of Object.entries(dexEff)) {
    if (typeof v !== "number") continue;
    if (k.endsWith("Mul")) eff[k] *= v;
    else eff[k] += v;
  }

  eff.catchChanceAdd += serverBuffPct("capture", ui);

  // 永久增益：捕获率加成（与 app.js 闭包版对齐）
  const permCaptureLvl =
    typeof state.permanentBoosts?.capture === "number"
      ? Math.max(0, Math.min(10, Math.floor(state.permanentBoosts.capture)))
      : 0;
  if (permCaptureLvl > 0) {
    eff.catchChanceAdd += permCaptureLvl * 0.05;
  }

  return eff;
}

/**
 * 建筑成本计算（考虑已建数量、科技折扣、上限保护）
 */
export function getBuildingCost(id, state, defs, ui) {
  const b = defs.buildings[id];
  const owned = state.buildings[id].owned;
  const m = Math.pow(b.costMul, owned);
  const cost = {};
  for (const [rid, v] of Object.entries(b.baseCost)) {
    cost[rid] = Math.ceil(v * m);
  }
  const techEff = computeTechEffects(state, defs, ui);
  for (const [rid, v] of Object.entries(cost)) {
    cost[rid] = Math.max(1, Math.ceil(v * techEff.buildingCostMul));
  }

  if (b && typeof b.effects === "function") {
    let buildingEffects = null;
    try { buildingEffects = b.effects(state); } catch {}
    if (buildingEffects && typeof buildingEffects === "object") {
      const resourceMap = {
        capCatnipAdd: "catnip", capWoodAdd: "wood",
        capMineralsAdd: "minerals", capPokeballAdd: "pokeball",
      };
      for (const [capKey, rid] of Object.entries(resourceMap)) {
        if (typeof buildingEffects[capKey] === "number" && buildingEffects[capKey] > 0) {
          if (rid && state.res[rid]) {
            const maxCost = Math.max(1, Math.floor((state.res[rid].cap ?? 0) * 0.9));
            if (cost[rid] && cost[rid] > maxCost) cost[rid] = maxCost;
          }
        }
      }
    }
  }

  if (id === "researchLab" && state.res?.minerals) {
    const maxCost = Math.max(1, Math.floor((state.res.minerals.cap ?? 0) * 0.9));
    if (cost.minerals && cost.minerals > maxCost) cost.minerals = maxCost;
  }

  for (const [rid, v] of Object.entries(cost)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    cost[rid] = Math.min(100000, Math.max(1, Math.floor(v)));
  }
  return cost;
}

/**
 * 研究成本（带上限保护）
 */
export function getResearchCost(tdef, state) {
  const cost0 = tdef?.cost && typeof tdef.cost === "object" ? tdef.cost : {};
  const cost = {};
  for (const [rid, v0] of Object.entries(cost0)) {
    if (typeof v0 !== "number" || !Number.isFinite(v0)) continue;
    const v = Math.max(0, Math.floor(v0));
    if (v <= 0) continue;
    const cap0 = state?.res?.[rid]?.cap;
    const cap = typeof cap0 === "number" && Number.isFinite(cap0) ? Math.max(0, Math.floor(cap0)) : 0;
    cost[rid] = (cap > 0 && v > cap) ? Math.max(1, Math.floor(cap * 0.9)) : v;
  }
  return cost;
}

/**
 * 研究时间（秒），考虑研究室等级和全服科研Buff
 */
export function computeResearchTimeSec(tdef, state, ui) {
  const forced0 = tdef?.timeSec;
  const sbTimeMul = _serverBuffResearchTimeMul(ui, clamp);
  if (typeof forced0 === "number" && Number.isFinite(forced0) && forced0 > 0) {
    return clamp(Math.ceil(forced0 * sbTimeMul), 1, Number.MAX_SAFE_INTEGER);
  }
  const base = 90;
  const cost = getResearchCost(tdef, state);
  const eq =
    (typeof cost.catnip === "number" ? cost.catnip : 0) +
    (typeof cost.wood === "number" ? cost.wood * 3 : 0) +
    (typeof cost.minerals === "number" ? cost.minerals * 4 : 0) +
    (typeof cost.pokeball === "number" ? cost.pokeball * 10 : 0);
  const mul = Math.max(1, Math.pow(Math.max(1, eq) / 20, 0.75));
  const n = Math.max(0, state.buildings.researchLab.owned);
  const n40 = Math.min(40, n);
  const n50 = Math.min(50, n);
  const reduce = Math.min(0.9, 0.02 * n40 + 0.01 * Math.max(0, n50 - 40));
  const timeMul = typeof tdef?.timeMul === "number" && tdef.timeMul > 0 ? tdef.timeMul : 1;
  const t = base * mul * (1 - reduce) * timeMul * sbTimeMul;
  return clamp(Math.ceil(t), 60, Number.MAX_SAFE_INTEGER);
}

/**
 * 研究效率（用于UI展示）
 */
export function getResearchEfficiency(state) {
  const n = Math.max(0, state.buildings.researchLab.owned);
  const n40 = Math.min(40, n);
  const n50 = Math.min(50, n);
  const reduce = Math.min(0.9, 0.02 * n40 + 0.01 * Math.max(0, n50 - 40));
  return { n, reduce };
}

/**
 * 精灵球制作成本
 * @param {number} qty
 * @param {object} state
 * @param {object} ui
 * @param {{ consume?: boolean } | null} opts
 * @param {{ tech?: object } | null} defs  — 需传入以应用 pokeballMakeCostMul 科技
 */
export function getPokeballMakeCost(qty = 1, state, ui, opts = null, defs = null) {
  const techEff = computeTechEffects(state, defs, ui);
  const mul = typeof techEff.pokeballMakeCostMul === "number" ? techEff.pokeballMakeCostMul : 1;

  const consume = Boolean(opts && typeof opts === "object" && opts.consume);
  const steelCharges0 =
    typeof state.skills?.steelBallDiscountCharges === "number" && Number.isFinite(state.skills.steelBallDiscountCharges)
      ? Math.max(0, Math.floor(state.skills.steelBallDiscountCharges)) : 0;

  const base0 = 6;
  const step = 1;
  const baseMax = 120;
  const made0 = typeof state.pokeballMade === "number" && Number.isFinite(state.pokeballMade)
    ? Math.max(0, Math.floor(state.pokeballMade)) : 0;
  const n = Math.max(0, Math.floor(qty));

  let wood = 0;
  let steelUsed = 0;
  for (let i = 0; i < n; i++) {
    const base = Math.min(baseMax, base0 + step * (made0 + i));
    const discounted = i < steelCharges0;
    const mul2 = discounted ? mul * 0.9 : mul;
    wood += Math.max(1, Math.ceil(base * mul2));
    if (discounted) steelUsed++;
  }

  if (consume && steelUsed > 0 && state.skills && typeof state.skills === "object") {
    state.skills.steelBallDiscountCharges = Math.max(0, steelCharges0 - steelUsed);
  }
  return { wood };
}
