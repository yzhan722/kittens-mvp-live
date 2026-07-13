import {
  accumulateBuildingEffects,
  applyTechAndServerCapToEff,
  computeBaseResourceCaps,
  computeUnlockedResourceRates,
  permanentBoostMul,
  computeStaticItemCaps,
  applyCoreResourceCaps,
  applyStaticItemCaps,
  ensureDerivedContainers,
  finalizeProductionRates,
} from "./production.js";
import { natureResCapMul } from "./gameplay_fun.js";

/**
 * Recompute caps, unlocks, and production rates. Shared by app.js and headless sim.
 */
export function computeDerived(state, ctx) {
  const { defs, computeTechEffects, serverBuffMul, clamp, addLog } = ctx;
  const eff = accumulateBuildingEffects(state, defs);
  const techEff = computeTechEffects();
  applyTechAndServerCapToEff(eff, techEff, serverBuffMul("resCap"));
  eff.unlockPokeball = Boolean(state.tech.pokeballBasics);

  const caps = computeBaseResourceCaps(defs, eff);
  const permCapMul = permanentBoostMul(state.permanentBoosts?.capacity) * natureResCapMul(state);
  applyCoreResourceCaps(state, caps, eff.unlockPokeball, permCapMul);
  applyStaticItemCaps(state, computeStaticItemCaps(defs));

  state.unlocks.wood = Boolean(eff.unlockWood);
  state.unlocks.minerals = Boolean(eff.unlockMinerals);
  state.unlocks.pokeball = Boolean(eff.unlockPokeball);

  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.earlyPaceGranted && (state.catchCount || 0) === 0) {
    state.meta.earlyPaceGranted = true;
    if ((state.buildings?.field?.owned ?? 0) < 1) {
      if (!state.buildings.field) state.buildings.field = { owned: 0 };
      state.buildings.field.owned = 1;
    }
    if ((state.res.catnip?.value ?? 0) < 12) {
      state.res.catnip.value = Math.max(Number(state.res.catnip.value) || 0, 12);
    }
  }

  if (eff.unlockPokeball) {
    state.res.pokeball.cap = Math.max(Number(state.res.pokeball.cap) || 0, 10);
    if (!state.meta.starterBallsGranted) {
      if ((state.catchCount || 0) > 0 || (state.pokeballMade || 0) > 0 || (state.res.pokeball.value || 0) > 0) {
        state.meta.starterBallsGranted = true;
      } else {
        state.meta.starterBallsGranted = true;
        state.res.pokeball.value = Math.min(
          state.res.pokeball.cap,
          (Number(state.res.pokeball.value) || 0) + 5
        );
        state.res.wood.cap = Math.max(Number(state.res.wood.cap) || 0, 40);
        state.res.wood.value = Math.max(Number(state.res.wood.value) || 0, 24);
        if (typeof addLog === "function") {
          try {
            addLog("精灵球基础生效：赠送精灵球×5与球果×24，可直接去捕捉。", true);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  ensureDerivedContainers(state, clamp);
  const unlockedRates = computeUnlockedResourceRates(state, techEff);
  if (state.unlocks.wood) eff.woodPerSec = unlockedRates.woodPerSec;
  if (state.unlocks.minerals) eff.mineralsPerSec = unlockedRates.mineralsPerSec;
  finalizeProductionRates(eff, state, serverBuffMul("resProd"));
  return eff;
}
