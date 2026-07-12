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
} from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
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

if (failed) {
  console.error(`era-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("era-selfcheck: OK");
