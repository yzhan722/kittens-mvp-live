#!/usr/bin/env node
// Minimal self-check for pure modules (no test framework)
import {
  computeTechEffects,
  computeDexEffects,
  getPokeballMakeCost,
  getResearchCost,
} from "../modules/systems/effects.js";
import {
  accumulateBuildingEffects,
  applyTechAndServerCapToEff,
  computeBaseResourceCaps,
  permanentBoostMul,
  computeStaticItemCaps,
  applyCoreResourceCaps,
  applyStaticItemCaps,
  ensureDerivedContainers,
  computeUnlockedResourceRates,
  finalizeProductionRates,
} from "../modules/systems/production.js";
import { expeditionTypeMulFromTypes } from "../modules/systems/expedition.js";
import {
  SERVER_BUFF_KEYS,
  getServerBuffLevel,
  serverBuffMul,
  serverBuffEffectText,
  serverBuffResearchTimeMul,
} from "../modules/systems/server_buffs.js";
import { EXP_LEVELS, getExpLevelDef } from "../modules/expedition_defs.js";
import { getTypeMul, TYPE_MUL } from "../modules/type_chart.js";
import {
  getStarUpgradeNeed,
  getStarUpgradeGate,
  meetsStarUpgradeGate,
  getStarBonusMul,
  clampStar,
} from "../modules/stars.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

// expedition_defs
assert(EXP_LEVELS.length === 5, "EXP_LEVELS length");
assert(getExpLevelDef("master").req === 30000, "master req");
assert(getExpLevelDef("nope").key === "basic", "fallback basic");

// type / expedition
assert(getTypeMul("water", "fire") === TYPE_MUL.SUPER_EFFECTIVE, "water>fire");
assert(expeditionTypeMulFromTypes(["water"], "fire") === 1.5, "exp mul SE");
assert(expeditionTypeMulFromTypes(["fire"], "water") === 0.5, "exp mul weak");
assert(expeditionTypeMulFromTypes(["electric"], "ground") === 0.5, "exp mul immune path");
assert(expeditionTypeMulFromTypes(["normal"], "normal") === 1, "exp mul neutral");

// server_buffs
assert(SERVER_BUFF_KEYS.includes("capture"), "sbuff keys");
{
  const uiMap = { serverBuffLevels: new Map([["exp", 3], ["research", 2]]) };
  assert(getServerBuffLevel("exp", uiMap) === 3, "sbuff level map");
  assert(Math.abs(serverBuffMul("exp", uiMap) - 1.3) < 1e-9, "sbuff mul");
  assert(serverBuffEffectText("capture", 2) === "捕获成功率 +20%", "sbuff text");
  const clamp0 = (n, a, b) => Math.max(a, Math.min(b, n));
  assert(Math.abs(serverBuffResearchTimeMul(uiMap, clamp0) - 1 / 1.4) < 1e-9, "sbuff research time");
  assert(getServerBuffLevel("nope", uiMap) === 0, "sbuff bad key");
}

// effects
const state = {
  tech: { woodWorking: true, ballCheap: true },
  dex: { caught: { 1: 1, 2: 1 } },
  permanentBoosts: { capture: 2 },
  pokeballMade: 0,
  skills: { steelBallDiscountCharges: 0 },
  buildings: { researchLab: { owned: 0 } },
  res: { catnip: { cap: 100 } },
};
const defs = {
  tech: {
    woodWorking: { effects: { woodRateMul: 1.1, catchChanceAdd: 0.01 } },
    ballCheap: { effects: { pokeballMakeCostMul: 0.5 } },
  },
};
const ui = { serverBuffLevels: new Map([["capture", 1]]) };
const eff = computeTechEffects(state, defs, ui);
assert(Math.abs(eff.woodRateMul - 1.1 * 1.01) < 1e-9, "woodRateMul");
// catch: 0.01 + server(0.1) + perm(0.1) = 0.21
assert(Math.abs(eff.catchChanceAdd - 0.21) < 1e-9, "catchChanceAdd got " + eff.catchChanceAdd);
assert(computeDexEffects(state).catnipPerSecMul === 1.02, "dex catnip");
assert(getPokeballMakeCost(1, state, ui, null, defs).wood === 3, "pokeball cost");
assert(getResearchCost({ cost: { catnip: 200 } }, state).catnip === 90, "research cap");

// production
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pdefs = {
  buildings: { hut: { effects: () => ({ catnipPerSec: 2, unlockWood: true }) } },
  resources: {
    catnip: { baseCap: 100 }, wood: { baseCap: 50 }, minerals: { baseCap: 30 }, pokeball: { baseCap: 10 },
    rareCandy: { baseCap: 5 }, futurecoin: { baseCap: 1 }, evolutionEnergy: { baseCap: 1 },
    evolutionStone: { baseCap: 1 }, linkRope: { baseCap: 1 }, bigBerry: { baseCap: 1 }, hugeBerry: { baseCap: 1 },
    megaStone: { baseCap: 1 }, masterball: { baseCap: 1 },
    hpPotion: { baseCap: 1 }, atkPotion: { baseCap: 1 }, defPotion: { baseCap: 1 },
    spaPotion: { baseCap: 1 }, spdPotion: { baseCap: 1 }, spePotion: { baseCap: 1 },
  },
};
const ps = {
  permanentBoosts: { capacity: 2, production: 1 },
  skills: { normalBoostStacks: [1, 2] },
  buildings: {
    hut: { owned: 1 }, workshop: { owned: 0 }, lumberYard: { owned: 0 }, quarry: { owned: 0 },
    breedingHouse: { owned: 1 }, trainingGround: { owned: 2 }, expeditionPost: { owned: 0 },
  },
  unlocks: {},
  breeding: { on: true, aId: 1, bId: 2 },
  mons: { list: [{ id: 1 }, { id: 2 }] },
  training: { activeIds: [1, 999, 2], slotSize: 0 },
  res: {
    catnip: { value: 0, cap: 0 }, wood: { value: 0, cap: 0 }, minerals: { value: 0, cap: 0 }, pokeball: { value: 0, cap: 0 },
    rareCandy: { value: 0, cap: 0 },
  },
};
const pe = accumulateBuildingEffects(ps, pdefs);
applyTechAndServerCapToEff(pe, {
  catnipPerSecMul: 1, woodRateMul: 1, mineralsRateMul: 1,
  capCatnipAdd: 0, capWoodAdd: 0, capMineralsAdd: 0, capPokeballAdd: 0,
  capCatnipMul: 1, capWoodMul: 1, capMineralsMul: 1, capPokeballMul: 1,
}, 1);
pe.unlockPokeball = true;
applyCoreResourceCaps(ps, computeBaseResourceCaps(pdefs, pe), true, permanentBoostMul(2));
assert(ps.res.catnip.cap === 120, "core cap");
applyStaticItemCaps(ps, computeStaticItemCaps(pdefs));
assert(ps.res.rareCandy.cap === 5, "item cap");
ps.unlocks.wood = true;
ensureDerivedContainers(ps, clamp);
assert(ps.training.slotSize === 2, "training slots");
assert(JSON.stringify(ps.training.activeIds) === "[1,2]", "training filter");
const rates = computeUnlockedResourceRates(ps, { woodRateMul: 1, mineralsRateMul: 1 });
pe.woodPerSec = rates.woodPerSec;
finalizeProductionRates(pe, ps, 1);
assert(Math.abs(pe.catnipPerSec - (2 * 3 * 0.5 * 1.1 - 10)) < 1e-9, "finalize rates");

// stars curve: catch starts ★0; early upgrade gated; costs steeper
assert(getStarUpgradeNeed(0) === 5, "star need ★0→1");
assert(getStarUpgradeNeed(4) === 80, "star need ★4→5");
assert(getStarUpgradeGate(0)?.lvl === 5 && getStarUpgradeGate(0)?.aff === 10, "star gate ★1");
assert(getStarUpgradeGate(4)?.lvl === 70 && getStarUpgradeGate(4)?.aff === 90, "star gate ★5");
assert(!meetsStarUpgradeGate({ lvl: 1, affection: 0, stars: 0 }, 0), "fresh catch cannot ★1");
assert(meetsStarUpgradeGate({ lvl: 5, affection: 10, stars: 0 }, 0), "gate met for ★1");
assert(clampStar(9) === 5, "clamp star");
assert(Math.abs(getStarBonusMul(5) - 2.4) < 1e-9, "★5 mul");

if (failed) {
  console.error(`selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("selfcheck: OK");
