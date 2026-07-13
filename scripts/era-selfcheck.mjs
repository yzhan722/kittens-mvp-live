#!/usr/bin/env node
import {
  emptyEraState,
  bumpEraCounter,
  syncEraQuests,
  canAdvanceEra,
  advanceEra,
  applyMutatorsToEff,
  applyEncounterBias,
  deriveEraIndex,
  eraEncounterRechargeMul,
  eraPokeballBonusCrafted,
  ensureEraState,
  canPrestige,
  previewPrestige,
  confirmPrestige,
  PRESTIGE_RESET_FIELDS,
  PRESTIGE_KEEP_FIELDS,
} from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

function progressSnapshot(state) {
  const dexUnique = Object.keys(state.dex?.caught || {}).length;
  const berry = state.res?.catnip?.value ?? 0;
  let bsum = 0;
  for (const b of Object.values(state.buildings || {})) bsum += b?.owned ?? 0;
  const research = Object.values(state.tech || {}).filter(Boolean).length;
  return { dexUnique, berry, bsum, research };
}

assert(ERA_DEFS.length === 9, "9 eras");
assert(ERA_DEFS.every((e) => typeof e.pveHint === "string" && e.pveHint.length > 0), "all eras have pveHint");

{
  const state = {
    era: emptyEraState(0),
    dex: { caught: {} },
    tech: {},
    buildings: { field: { owned: 0 } },
  };
  assert(canAdvanceEra(state) === false, "dawn cannot advance empty");
  bumpEraCounter(state, "gather_total", 400);
  bumpEraCounter(state, "catch_count", 80);
  bumpEraCounter(state, "berry_earned", 400);
  syncEraQuests(state);
  assert(canAdvanceEra(state) === true, "dawn can advance when counters met");
  assert(advanceEra(state, { addLog: () => {} }) === true, "advance ok");
  assert(state.era.id === "hamlet", "now hamlet");
  assert(state.era.questCounters.catch_count === 0, "counters reset");
  assert(state.era.mutatorsActive.includes("berryYield_12"), "mutator stacked");
}

{
  // berry_earned progress must not require free warehouse space
  const state = {
    era: emptyEraState(0),
    dex: { caught: {} },
    tech: {},
    buildings: { field: { owned: 1 } },
    res: { catnip: { value: 1000, cap: 1000 } },
  };
  bumpEraCounter(state, "berry_earned", 50);
  syncEraQuests(state);
  const berryQ = state.era.quests.find((q) => q.id === "dawn_berry_400");
  assert(berryQ && berryQ.progress === 50, "berry progress counts independent of cap");
}

{
  const eff = { catnipPerSecMul: 1, catchChanceAdd: 0 };
  const state = { era: emptyEraState(2) };
  applyMutatorsToEff(eff, state);
  assert(eff.catnipPerSecMul > 1, "berry mul applied");
  assert(eff.catchChanceAdd >= 0.06, "catch add applied");
}

{
  const eff = applyMutatorsToEff({ researchTimeMul: 1 }, { era: emptyEraState(2) });
  assert(eff.researchTimeMul < 1, "fossil research time mul applied");
}

{
  const gym = { era: emptyEraState(3) };
  assert(eraPokeballBonusCrafted(gym, 9) === 0, "craft bonus floors under 10");
  assert(eraPokeballBonusCrafted(gym, 10) === 1, "craft bonus grants 1 per 10");
  assert(eraPokeballBonusCrafted(gym, 25) === 2, "craft bonus floors batch math");
  assert(Math.abs(eraEncounterRechargeMul(gym) - 0.9) < 1e-9, "gym recharge mul");
  assert(eraEncounterRechargeMul({ era: emptyEraState(0) }) === 1, "default recharge mul");
}

{
  const fossil = { era: emptyEraState(2) };
  const rock = { tier: "common", dex: 74 };
  const normal = { tier: "common", dex: 16 };
  const getTypes = (mon) => (mon.dex === 74 ? ["rock", "ground"] : ["normal", "flying"]);
  assert(applyEncounterBias(10, rock, fossil, getTypes) > applyEncounterBias(10, normal, fossil, getTypes), "fossil boosts rock/ground");
}

{
  const state = {
    dex: { caught: Object.fromEntries([...Array(50)].map((_, i) => [String(i + 1), 1])) },
    tech: { a: true, b: true, c: true, d: true, e: true },
    buildings: { field: { owned: 4 }, hut: { owned: 2 } },
  };
  assert(deriveEraIndex(state) >= 2, "derive at least fossil-ish for dex50+research5");
}

assert(deriveEraIndex({ dex: { caught: {} }, tech: {}, buildings: {} }) === 0, "empty derive dawn");

{
  const state = {
    dex: { caught: { "1": 1, "2": 1, "3": 1 } },
    tech: { berryCultivation: true },
    buildings: { field: { owned: 3 } },
    res: { catnip: { value: 999, cap: 1000 } },
  };
  const before = progressSnapshot(state);
  ensureEraState(state);
  const after = progressSnapshot(state);
  assert(state.era?.id === "dawn", "migrate-from-empty lands dawn");
  assert(state.era.prestigeUnlocked === false, "prestige locked by default");
  assert(state.era.prestigeCount === 0, "prestige count default 0");
  assert(after.dexUnique === before.dexUnique, "migrate-from-empty keeps dex");
  assert(after.berry === before.berry, "migrate-from-empty keeps resources");
  assert(after.bsum === before.bsum, "migrate-from-empty keeps buildings");
  assert(after.research === before.research, "migrate-from-empty keeps tech");
}

{
  const state = {
    dex: { caught: Object.fromEntries([...Array(30)].map((_, i) => [String(i + 1), 1])) },
    tech: { a: true },
    buildings: { field: { owned: 5 } },
    res: { catnip: { value: 500, cap: 1000 } },
    era: {
      index: 2,
      questCounters: { catch_count: 12 },
      quests: [{ id: "fossil_catch_150", kind: "main", type: "catch_count", target: 150, progress: 12, done: false, scope: "era" }],
    },
  };
  const before = progressSnapshot(state);
  ensureEraState(state);
  const after = progressSnapshot(state);
  assert(state.era.id === "fossil", "migrate-from-partial fills id from index");
  assert(state.era.questCounters.catch_count === 12, "migrate-from-partial keeps counters");
  assert(state.era.quests[0].progress === 12, "migrate-from-partial keeps quest progress");
  assert(after.dexUnique === before.dexUnique, "migrate-from-partial keeps dex");
  assert(after.berry === before.berry, "migrate-from-partial keeps resources");
  assert(Array.isArray(state.era.mutatorsActive) && state.era.mutatorsActive.length > 0, "migrate-from-partial reconciles mutators");
}

{
  const state = {
    era: emptyEraState(8),
    dex: { caught: Object.fromEntries([...Array(100)].map((_, i) => [String(i + 1), 1])) },
    tech: Object.fromEntries([...Array(8)].map((_, i) => [`t${i}`, true])),
  };
  bumpEraCounter(state, "catch_count", 10);
  bumpEraCounter(state, "pokeball_earned", 10);
  syncEraQuests(state);
  assert(state.era.prestigeUnlocked === false, "prestige locked while paradox mains incomplete");
  assert(canPrestige(state) === false, "prestige gated when prestigeUnlocked false");
  const preview = previewPrestige(state);
  assert(preview.ok === false && preview.reason === "prestige_locked", "preview reports locked");
  assert(preview.resets.length === PRESTIGE_RESET_FIELDS.length, "preview lists resets");
  assert(preview.keeps.length === PRESTIGE_KEEP_FIELDS.length, "preview lists keeps");
  assert(confirmPrestige(state).ok === false, "confirm blocked when gated");

  // Completing all paradox main quests unlocks prestige without ops flag
  state.dex.caught = Object.fromEntries([...Array(300)].map((_, i) => [String(i + 1), 1]));
  state.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  bumpEraCounter(state, "catch_count", 360);
  bumpEraCounter(state, "pokeball_earned", 400);
  syncEraQuests(state);
  assert(state.era.quests.every((q) => q.kind !== "main" || q.done), "paradox mains all done");
  assert(state.era.prestigeUnlocked === true, "paradox mains unlock prestige");
  assert(canPrestige(state) === true, "canPrestige after unlock");
}

{
  const prevOps = globalThis.KITTENS_OPS;
  globalThis.KITTENS_OPS = { eraPrestige: true };
  const state = {
    dex: { caught: Object.fromEntries([...Array(300)].map((_, i) => [String(i + 1), 1])) },
    permanentBoosts: { exp: 2 },
    res: { catnip: { value: 100, cap: 1000 } },
    buildings: { field: { owned: 3 } },
    tech: Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true])),
    era: emptyEraState(8),
  };
  bumpEraCounter(state, "catch_count", 360);
  bumpEraCounter(state, "pokeball_earned", 400);
  syncEraQuests(state);
  assert(canPrestige(state) === true, "ops flag opens prestige");
  const result = confirmPrestige(state, { addLog: () => {} });
  assert(result.ok === true, "confirm prestige when ops open");
  assert(state.era.mode === "distortion", "prestige sets distortion");
  assert(state.era.id === "dawn", "prestige restarts dawn");
  assert(state.era.prestigeCount === 1, "prestige increments count");
  assert(state.res.catnip.value === 0, "prestige resets resources");
  assert(state.buildings.field.owned === 0, "prestige resets buildings");
  assert(state.dex.caught["1"] === 1, "prestige keeps dex");
  assert(state.permanentBoosts.exp === 2, "prestige keeps permanentBoosts");
  globalThis.KITTENS_OPS = prevOps;
}

if (failed) {
  console.error(`era-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("era-selfcheck: OK");
