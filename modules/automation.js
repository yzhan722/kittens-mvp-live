import { bumpEraCounter, eraPokeballBonusCrafted } from "./systems/era.js";

export function ensureAutoState(state) {
  if (!state.auto || typeof state.auto !== "object") {
    state.auto = {
      autoBuildOn: false,
      autoBuildMode: "prod",
      autoBuildCarrySec: 0,
      autoBallOn: false,
      autoBallQty: 1,
      autoBallCarrySec: 0,
      autoExchangeOn: false,
      autoExchangeLevel: 0,
      autoExchangeCarrySec: 0,
      autoCraft: {
        evolutionEnergy: false,
        evolutionStone: false,
        linkRope: false,
        hugeBerry: false,
        megaStone: false,
      },
    };
    return;
  }

  const a = state.auto;
  const ensureBool = (obj, key, def = false) => { if (typeof obj[key] !== "boolean") obj[key] = def; };
  const ensureFiniteNum = (obj, key, def = 0) => { if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) obj[key] = def; };

  ensureBool(a, "autoBuildOn");
  if (typeof a.autoBuildMode !== "string") a.autoBuildMode = "prod";
  if (a.autoBuildMode === "cheap" || a.autoBuildMode === "list") a.autoBuildMode = "prod";
  ensureFiniteNum(a, "autoBuildCarrySec");

  ensureBool(a, "autoBallOn");
  ensureFiniteNum(a, "autoBallQty", 1);
  ensureFiniteNum(a, "autoBallCarrySec");

  ensureBool(a, "autoExchangeOn");
  ensureFiniteNum(a, "autoExchangeLevel");
  a.autoExchangeLevel = Math.max(0, Math.min(10, Math.floor(a.autoExchangeLevel)));
  ensureFiniteNum(a, "autoExchangeCarrySec");

  if (!a.autoCraft || typeof a.autoCraft !== "object") {
    a.autoCraft = { evolutionEnergy: false, evolutionStone: false, linkRope: false, hugeBerry: false, megaStone: false };
  } else {
    const ac = a.autoCraft;
    ensureBool(ac, "evolutionEnergy");
    ensureBool(ac, "evolutionStone");
    ensureBool(ac, "linkRope");
    ensureBool(ac, "hugeBerry");
    ensureBool(ac, "megaStone");
  }
}

function costScore(cost) {
  if (!cost || typeof cost !== "object") return Infinity;
  let s = 0;
  for (const v of Object.values(cost)) {
    const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
    s += Math.max(0, n);
  }
  return s;
}

function isCapBuilding(bdef, state) {
  if (!bdef || typeof bdef !== "object") return false;
  if (typeof bdef.effects !== "function") return false;
  let e = null;
  try {
    e = bdef.effects(state);
  } catch {
    e = null;
  }
  if (!e || typeof e !== "object") return false;
  return Object.keys(e).some((k) => typeof k === "string" && k.startsWith("cap") && k.endsWith("Add"));
}

function isProdBuilding(bdef, state) {
  if (!bdef || typeof bdef !== "object") return false;
  if (typeof bdef.effects !== "function") return false;
  let e = null;
  try {
    e = bdef.effects(state);
  } catch {
    e = null;
  }
  if (!e || typeof e !== "object") return false;
  return Object.keys(e).some((k) => typeof k === "string" && k.endsWith("PerSec"));
}

function pickAutoBuildBid({ state, defs, BUILDING_MAX_LEVEL, getBuildingCost, canAfford }) {
  const mode = typeof state.auto?.autoBuildMode === "string" ? state.auto.autoBuildMode : "prod";

  const candidates = [];
  for (const [bid, bdef] of Object.entries(defs.buildings)) {
    if (!bdef || typeof bdef !== "object") continue;
    if (typeof bdef.visible === "function" && !bdef.visible(state)) continue;
    const owned = state.buildings?.[bid]?.owned ?? 0;
    const maxLvl = typeof bdef.maxLevel === "number" && Number.isFinite(bdef.maxLevel) ? Math.max(1, Math.floor(bdef.maxLevel)) : BUILDING_MAX_LEVEL;
    if (owned >= maxLvl) continue;
    const cost = getBuildingCost(bid);
    if (!canAfford(cost)) continue;
    candidates.push({ bid, bdef, cost, owned });
  }

  if (candidates.length === 0) return null;

  if (mode === "storage") {
    const caps = candidates.filter((x) => isCapBuilding(x.bdef, state));
    if (caps.length > 0) {
      caps.sort((a, b) => costScore(a.cost) - costScore(b.cost));
      return caps[0].bid;
    }
  }

  if (mode === "prod") {
    const prods = candidates.filter((x) => isProdBuilding(x.bdef, state));
    if (prods.length > 0) {
      prods.sort((a, b) => costScore(a.cost) - costScore(b.cost));
      return prods[0].bid;
    }
  }

  candidates.sort((a, b) => costScore(a.cost) - costScore(b.cost));
  return candidates[0].bid;
}

export function runAutomation({
  state,
  defs,
  ui,
  dtSec,
  BUILDING_MAX_LEVEL,
  getBuildingCost,
  canAfford,
  pay,
  getPokeballMakeCost,
  addRes,
  addLog,
}) {
  ensureAutoState(state);

  // Auto build
  if (state.unlocks?.autoBuild && state.auto.autoBuildOn) {
    state.auto.autoBuildCarrySec = Math.min(10, Math.max(0, state.auto.autoBuildCarrySec + dtSec));
    while (state.auto.autoBuildCarrySec >= 1) {
      state.auto.autoBuildCarrySec -= 1;
      const bid = pickAutoBuildBid({ state, defs, BUILDING_MAX_LEVEL, getBuildingCost, canAfford });
      if (!bid) break;
      const cost = getBuildingCost(bid);
      if (!canAfford(cost)) break;
      pay(cost);
      if (!state.buildings[bid]) state.buildings[bid] = { owned: 0 };
      state.buildings[bid].owned += 1;
      addLog(`自动建造：${defs.buildings[bid]?.name ?? bid} +1`);
    }
  } else {
    state.auto.autoBuildCarrySec = 0;
  }

  // Auto pokeball crafting
  if (state.unlocks?.autoBall && state.auto.autoBallOn) {
    state.auto.autoBallCarrySec = Math.min(10, Math.max(0, state.auto.autoBallCarrySec + dtSec));
    while (state.auto.autoBallCarrySec >= 1) {
      state.auto.autoBallCarrySec -= 1;

      if (!state.unlocks?.pokeball) break;
      const woodCap = state.res.wood?.cap ?? 0;
      const woodVal = state.res.wood?.value ?? 0;
      if (woodVal < woodCap || woodCap <= 0) break;

      const space = Math.max(0, (state.res.pokeball?.cap ?? 0) - (state.res.pokeball?.value ?? 0));
      const qty = Math.min(1, space);
      if (qty <= 0) break;

      const cost = getPokeballMakeCost(qty, { consume: true });
      if (!canAfford(cost)) break;

      pay(cost);
      const before = state.res.pokeball.value;
      addRes("pokeball", qty);
      const after = state.res.pokeball.value;
      const made = Math.max(0, after - before);
      const bonus = eraPokeballBonusCrafted(state, made);
      if (bonus > 0) addRes("pokeball", bonus);
      const afterBonus = state.res.pokeball.value;
      const bonusMade = Math.max(0, afterBonus - after);
      state.pokeballMade = Math.max(0, (state.pokeballMade ?? 0) + made + bonusMade);
      if (made + bonusMade > 0) bumpEraCounter(state, "pokeball_earned", made + bonusMade);
      if (made > 0) addLog(`自动制作：精灵球 +${made + bonusMade}${bonusMade > 0 ? `（时代加成 +${bonusMade}）` : ""}`);

      ui.captureDirty = true;
    }
  } else {
    state.auto.autoBallCarrySec = 0;
  }

  if (state.auto.autoExchangeOn) {
    const lvl0 = typeof state.auto.autoExchangeLevel === "number" && Number.isFinite(state.auto.autoExchangeLevel) ? state.auto.autoExchangeLevel : 0;
    const lvl = Math.max(0, Math.min(10, Math.floor(lvl0)));
    if (lvl <= 0) {
      state.auto.autoExchangeCarrySec = 0;
    } else {
      const intervalSec = Math.max(1, (100 / lvl) * 60);
      state.auto.autoExchangeCarrySec = Math.min(intervalSec * 2, Math.max(0, state.auto.autoExchangeCarrySec + dtSec));
      let guard = 0;
      while (state.auto.autoExchangeCarrySec >= intervalSec && guard < 5) {
        guard += 1;
        state.auto.autoExchangeCarrySec -= intervalSec;

        const rates = { catnip: 1000, wood: 500 };
        let totalCoin = 0;
        const parts = [];
        for (const [rid, perCoin] of Object.entries(rates)) {
          const have0 = state.res?.[rid]?.value ?? 0;
          const have = typeof have0 === "number" && Number.isFinite(have0) ? Math.max(0, Math.floor(have0)) : 0;
          const n = Math.max(0, Math.floor(have / perCoin));
          if (n <= 0) continue;
          const cost = perCoin * n;
          if (!state.res?.[rid]) continue;
          state.res[rid].value = Math.max(0, state.res[rid].value - cost);
          addRes("futurecoin", n);
          totalCoin += n;
          parts.push(`${defs.resources?.[rid]?.name ?? rid} -${cost}`);
        }
        if (totalCoin > 0) {
          addLog(`自动兑币：${parts.join(" · ")} → 未来币 +${totalCoin}`);
          ui.futureDirty = true;
        }
      }
    }
  } else {
    state.auto.autoExchangeCarrySec = 0;
  }
}
