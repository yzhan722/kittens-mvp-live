#!/usr/bin/env node
// Minimal self-check for pure modules (no test framework)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  computeTechEffects,
  computeDexEffects,
  getPokeballMakeCost,
  getResearchCost,
  getBuildingCost,
  computeResearchTimeSec,
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
import { expeditionTypeMulFromTypes, pickExpeditionEventCard } from "../modules/systems/expedition.js";
import {
  SERVER_BUFF_KEYS,
  getServerBuffLevel,
  serverBuffMul,
  serverBuffEffectText,
  serverBuffResearchTimeMul,
} from "../modules/systems/server_buffs.js";
import { EXP_LEVELS, getExpLevelDef } from "../modules/expedition_defs.js";
import { BUILDING_DEFS } from "../modules/defs_buildings.js";
import { computeDerived as computeDerivedCore } from "../modules/systems/compute_derived.js";
import { awardCaughtPokemon as awardCaughtCore } from "../modules/app/capture_award.js";
import { pickWeakMonIds, releaseCandyRefund } from "../modules/systems/mon_release.js";
import { resetEvoFamilyCacheForTest, isSameEvoFamily } from "../modules/evo_utils.js";
import {
  bumpPvpSeasonStats,
  formatPvpSeasonStats,
  formatPvpSeasonHeadline,
  normalizePvpRecent,
  summarizePvpBattle,
} from "../modules/systems/pvp_narrative.js";
import { techReqHint } from "../modules/tech_req_hint.js";
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
assert(EXP_LEVELS.length === 7, "EXP_LEVELS length");
assert(getExpLevelDef("master").req === 30000, "master req");
assert(getExpLevelDef("super").coin === 300, "super expedition coin");
assert(getExpLevelDef("master").coin === 800, "master expedition coin");
assert(getExpLevelDef("nope").key === "basic", "fallback basic");

// type / expedition
assert(getTypeMul("water", "fire") === TYPE_MUL.SUPER_EFFECTIVE, "water>fire");
assert(expeditionTypeMulFromTypes(["water"], "fire") === 1.5, "exp mul SE");
assert(expeditionTypeMulFromTypes(["fire"], "water") === 0.5, "exp mul weak");
assert(expeditionTypeMulFromTypes(["electric"], "ground") === 0.5, "exp mul immune path");
assert(expeditionTypeMulFromTypes(["normal"], "normal") === 1, "exp mul neutral");
{
  const clamp0 = (n, a, b) => Math.max(a, Math.min(b, n));
  const rewardMul = (muls) => clamp0(muls.reduce((s, x) => s + x, 0) / muls.length, 0.75, 1.5);
  assert(rewardMul([expeditionTypeMulFromTypes(["fire"], "water")]) === 0.75, "exp reward mul clamps weak");
  assert(rewardMul([expeditionTypeMulFromTypes(["water"], "fire")]) === 1.5, "exp reward mul keeps SE");
}

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
{
  const capState = {
    buildings: {
      trainingGround: { owned: 1 },
      breedingHouse: { owned: 1 },
      expeditionPost: { owned: 0 },
    },
    res: {
      catnip: { value: 100, cap: 100 },
      wood: { value: 100, cap: 100 },
      minerals: { value: 30, cap: 30 },
    },
    unlocks: { minerals: true, wood: true },
    tech: {},
  };
  const expCost = getBuildingCost("expeditionPost", capState, { buildings: BUILDING_DEFS, tech: {} }, ui);
  assert((expCost.minerals ?? 0) <= 27, "expeditionPost minerals affordable at cap 30");
  assert((expCost.catnip ?? 0) <= 90 && (expCost.wood ?? 0) <= 90, "expeditionPost res within 90% cap");
}

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

// early research pacing: cheap tech should not sit on a 60s floor
{
  const cheap = { cost: { catnip: 20 } };
  const tCheap = computeResearchTimeSec(cheap, { buildings: { researchLab: { owned: 0 } } }, {});
  assert(tCheap >= 8 && tCheap <= 25, "cheap research soft-capped");
  const forced = computeResearchTimeSec(
    { cost: { catnip: 20 }, timeSec: 10 },
    { buildings: { researchLab: { owned: 0 } } },
    {}
  );
  assert(forced === 10, "forced timeSec");
}

{
  const hint = techReqHint({ buildings: { field: { owned: 1 } } }, "irrigation", {
    req: (s) => (s.buildings?.field?.owned ?? 0) >= 2,
  });
  assert(hint.includes("树果田") && hint.includes("Lv.2"), "tech req hint irrigation");
  const capState = {
    buildings: { hut: { owned: 1 } },
    tech: {},
    res: {
      catnip: { value: 0, cap: 100 },
      wood: { value: 0, cap: 40 },
      minerals: { value: 0, cap: 30 },
      pokeball: { value: 0, cap: 10 },
      rareCandy: { value: 0, cap: 5 },
      futurecoin: { value: 0, cap: 1 },
      evolutionEnergy: { value: 0, cap: 1 },
      evolutionStone: { value: 0, cap: 1 },
      linkRope: { value: 0, cap: 1 },
      bigBerry: { value: 0, cap: 1 },
      hugeBerry: { value: 0, cap: 1 },
      megaStone: { value: 0, cap: 1 },
      masterball: { value: 0, cap: 1 },
      hpPotion: { value: 0, cap: 1 },
      atkPotion: { value: 0, cap: 1 },
      defPotion: { value: 0, cap: 1 },
      spaPotion: { value: 0, cap: 1 },
      spdPotion: { value: 0, cap: 1 },
      spePotion: { value: 0, cap: 1 },
    },
    unlocks: {},
    catchCount: 0,
    meta: {},
    permanentBoosts: {},
    skills: {},
  };
  const eff = computeDerivedCore(capState, {
    defs: { buildings: BUILDING_DEFS, resources: pdefs.resources, tech: {} },
    computeTechEffects: () => ({}),
    serverBuffMul: () => 1,
    clamp,
    addLog: null,
  });
  assert(capState.unlocks.wood === true, "computeDerived unlocks wood");
  assert(typeof eff.woodPerSec === "number", "computeDerived wood rate");
}

{
  const capSt = {
    dex: { caught: {} },
    catchCount: 0,
    shinyCount: 0,
    mons: { nextId: 1, list: [] },
  };
  const sp = { id: "bulbasaur", name: "妙蛙种子", dex: 1, tier: "common" };
  awardCaughtCore(capSt, sp, { isShiny: true, ballType: "greatball" }, {
    createMonInstance: (p) => ({ id: 1, pid: p.id, name: p.name }),
    ui: {},
    bumpEraCounter: () => {},
    syncEraProgress: () => {},
  });
  assert(capSt.catchCount === 1, "capture award catchCount");
  assert(capSt.dex.caught.bulbasaur === 1, "capture award dex");
  assert(capSt.shinyCount === 1, "capture award shiny");
  assert(capSt.mons.list[0]?.caughtWith === "greatball", "capture award ball");
}

{
  assert(releaseCandyRefund(250) === 2, "release candy refund");
  const bs = { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 };
  const iv = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const ids = pickWeakMonIds(
    [
      { id: 1, lvl: 5, dex: 1, baseStats: bs, iv },
      { id: 2, lvl: 10, dex: 2, baseStats: bs, iv },
      { id: 3, lvl: 1, dex: 3, baseStats: bs, iv },
    ],
    { softLimit: 1, batch: 2, protectIds: new Set([2]) }
  );
  assert(ids.length === 2 && !ids.includes(2), "pick weak mon ids");
  const smartIds = pickWeakMonIds(
    [
      { id: 1, pid: "a", lvl: 1, dex: 1, baseStats: bs, iv, isShiny: true },
      { id: 2, pid: "b", lvl: 1, dex: 2, baseStats: bs, iv, stars: 1 },
      { id: 3, pid: "c", lvl: 1, dex: 3, baseStats: bs, iv },
      { id: 4, pid: "c", lvl: 2, dex: 3, baseStats: bs, iv },
    ],
    { softLimit: 1, batch: 3, smartProtect: true }
  );
  assert(
    smartIds.length === 1 && smartIds[0] === 3,
    "smart release protects shiny, starred, and sole species"
  );
  globalThis.POKEMON_EVO = { p001: ["p002"], p002: ["p003"] };
  resetEvoFamilyCacheForTest();
  const familyIds = pickWeakMonIds(
    [
      { id: 10, pid: "p001", lvl: 1, dex: 1, baseStats: bs, iv },
      { id: 11, pid: "p003", lvl: 5, dex: 3, baseStats: bs, iv },
      { id: 12, pid: "p003", lvl: 1, dex: 3, baseStats: bs, iv },
    ],
    { softLimit: 1, batch: 2, smartProtect: true }
  );
  assert(
    familyIds.length === 1 && familyIds[0] === 12,
    "smart release protects last mon per evolution family"
  );
  globalThis.POKEMON_EVO = { p001: ["p002"], p002: ["p003"] };
  resetEvoFamilyCacheForTest();
  assert(isSameEvoFamily("p001", "p003") === true, "evo family same line");
  assert(isSameEvoFamily("p001", "p999") === false, "evo family different");
  const pvpLine = summarizePvpBattle({
    winner: 2,
    rounds: 8,
    battleLog: ["你 派出 皮卡丘！", "对手 倒下了！", "你获胜！"],
  });
  assert(pvpLine.includes("险胜"), "pvp narrative win");
  const seasonLine = summarizePvpBattle(
    { winner: 2, rounds: 4, battleLog: [] },
    "你",
    { seasonId: "s3", recent: [{ winner: 2 }, { winner: 2 }] }
  );
  assert(seasonLine.includes("赛季 s3") && seasonLine.includes("2 连胜"), "pvp season narrative");
  const headline = formatPvpSeasonHeadline({ wins: 2, losses: 1 }, "s2");
  assert(headline.includes("赛季 s2") && headline.includes("2胜1负"), "pvp season headline");
  const ev = pickExpeditionEventCard(() => 0);
  assert(ev?.id && ev?.title, "expedition event card");
  const rareIds = pickWeakMonIds(
    [
      { id: 20, pid: "a", lvl: 10, dex: 1, tier: "rare", baseStats: bs, iv },
      { id: 21, pid: "a", lvl: 1, dex: 1, tier: "common", baseStats: bs, iv },
      { id: 22, pid: "a", lvl: 2, dex: 1, tier: "common", baseStats: bs, iv },
    ],
    { softLimit: 1, batch: 1, smartProtect: true }
  );
  assert(rareIds.length === 1 && rareIds[0] === 21, "smart release protects rare tier");
  const recent = normalizePvpRecent([{ line: "test", winner: 2, at: 1 }, { bad: true }]);
  assert(recent.length === 1 && recent[0].line === "test", "normalize pvp recent");
  const meta = {};
  bumpPvpSeasonStats(meta, 2);
  bumpPvpSeasonStats(meta, 1);
  assert(formatPvpSeasonStats(meta.pvpStats) === "本赛季 1胜1负", "pvp season stats");
  assert(
    existsSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "apply-d1-migrations.mjs")),
    "apply d1 migrations script exists"
  );
}

import { createPvpBattle } from "../modules/pvp_battle.js";
const pvp = createPvpBattle();
const empty = pvp.simulateBattle([], [{ name: "A", hp: 10, attack: 5, defense: 5, speed: 5, types: [] }], "P1", "P2");
assert(empty.winner === 0 && empty.rounds === 0, "pvp empty team");
const win = pvp.simulateBattle(
  [{ name: "Strong", hp: 200, attack: 80, defense: 40, speed: 60, level: 50, types: ["fire"] }],
  [{ name: "Weak", hp: 30, attack: 10, defense: 10, speed: 10, level: 5, types: ["grass"] }],
  "P1",
  "P2"
);
assert(win.winner === 1 && win.rounds > 0, "pvp strong wins");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const era = spawnSync(process.execPath, [path.join(__dirname, "era-selfcheck.mjs")], { stdio: "inherit" });
if (era.status !== 0) failed += 1;
const pve = spawnSync(process.execPath, [path.join(__dirname, "pve-selfcheck.mjs")], { stdio: "inherit" });
if (pve.status !== 0) failed += 1;

if (failed) {
  console.error(`selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("selfcheck: OK");
