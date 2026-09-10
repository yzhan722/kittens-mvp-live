/** Breeding hatch — extracted from tick.js so the assembler stays a wiring layer. */

import { pickBreedEventCard } from "./expedition.js";
import { noteShinySpecies } from "./collection_fun.js";

function ensureBreedingState(state) {
  if (!state.breeding || typeof state.breeding !== "object") {
    state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
  }
  return state.breeding;
}

function defaultGetMonById(mons, monById, id) {
  if (!id) return null;
  if (monById && typeof monById.get === "function") return monById.get(id) ?? null;
  const list = Array.isArray(mons?.list) ? mons.list : Array.isArray(mons) ? mons : [];
  return list.find((m) => m && m.id === id) ?? null;
}

/**
 * Hatch the current breeding pair into one mon.
 * @returns {boolean}
 */
export function hatchEgg(state, deps = {}) {
  if (!state || typeof state !== "object") return false;
  ensureBreedingState(state);
  const getMonById = typeof deps.getMonById === "function" ? deps.getMonById : defaultGetMonById;
  const getBasePid = typeof deps.getBasePid === "function" ? deps.getBasePid : (pid) => pid || null;
  const sameFamily =
    typeof deps.sameFamily === "function" ? deps.sameFamily : (a, b) => Boolean(a && b && getBasePid(a) === getBasePid(b));
  const getSpeciesByPid = deps.getSpeciesByPid;
  const createMonInstance = deps.createMonInstance;
  const randFloat = typeof deps.randFloat === "function" ? deps.randFloat : Math.random;
  const addLog = typeof deps.addLog === "function" ? deps.addLog : () => {};
  const addRes = typeof deps.addRes === "function" ? deps.addRes : () => {};
  const ui = deps.ui;
  const mons = deps.mons;
  const monById = deps.monById;

  const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
  const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
  if (!aId || !bId || aId === bId) return false;
  const a = getMonById(mons, monById, aId);
  const b = getMonById(mons, monById, bId);
  if (!a || !b) return false;

  const dittoPid = "p132";
  let basePid = null;
  if (a.pid === dittoPid && b.pid !== dittoPid) basePid = getBasePid(b.pid);
  else if (b.pid === dittoPid && a.pid !== dittoPid) basePid = getBasePid(a.pid);
  else if (sameFamily(a.pid, b.pid)) basePid = getBasePid(a.pid);
  if (!basePid) return false;

  const sp = typeof getSpeciesByPid === "function" ? getSpeciesByPid(basePid) : null;
  if (!sp) return false;
  if (typeof createMonInstance !== "function") return false;

  const mon = createMonInstance(sp);
  const shiny = randFloat() < 1 / 4096;
  if (shiny) {
    mon.isShiny = true;
    addLog(`！！！闪光孵化：${sp.name}！！！`, true);
  }
  const prevHatch = typeof state.hatchCount === "number" && Number.isFinite(state.hatchCount) ? state.hatchCount : 0;
  state.hatchCount = Math.max(0, Math.floor(prevHatch)) + 1;
  if (shiny) {
    const prevShiny = typeof state.shinyCount === "number" && Number.isFinite(state.shinyCount) ? state.shinyCount : 0;
    state.shinyCount = Math.max(0, Math.floor(prevShiny)) + 1;
    const mile = noteShinySpecies(state, sp);
    if (mile?.item) {
      addRes(mile.item, 1);
      addLog(mile.label, true);
    }
  }
  if (!state.mons) state.mons = { nextId: 1, list: [] };
  if (!Array.isArray(state.mons.list)) state.mons.list = [];
  state.mons.list.push(mon);
  state.mons.nextId = Math.max(state.mons.nextId ?? 1, (mon?.id ?? 0) + 1);
  addLog(`生蛋成功：${sp.name} +1`, true);
  const breedCard = pickBreedEventCard(randFloat);
  if (breedCard?.title) {
    addLog(`孵化奇遇：${breedCard.title} — ${breedCard.blurb}`, true);
    const fc = Math.max(0, Math.floor(breedCard.bonusFuturecoin || 0));
    if (fc > 0) addRes("futurecoin", fc);
  }
  if (ui) {
    ui.monsDirty = true;
    ui.functionsDirty = true;
    ui.dexDirty = true;
  }
  return true;
}
