import { ERA_DEFS, ERA_MUTATORS, getEraDefById, getEraDefByIndex } from "../defs_eras.js";
import { dexCaughtCount } from "./effects.js";

const ERA_COUNTER_DEFAULTS = {
  catch_count: 0,
  gather_total: 0,
  berry_earned: 0,
  pokeball_earned: 0,
};

function eraIndexForId(id) {
  const index = ERA_DEFS.findIndex((e) => e.id === id);
  return index >= 0 ? index : 0;
}

export function emptyEraState(index = 0) {
  const def = getEraDefByIndex(index);
  const safeIndex = eraIndexForId(def.id);
  return {
    id: def.id,
    index: safeIndex,
    mode: "chronicle",
    quests: instantiateQuests(def),
    questCounters: { ...ERA_COUNTER_DEFAULTS },
    completedEraIds: safeIndex > 0 ? ERA_DEFS.slice(0, safeIndex).map((e) => e.id) : [],
    mutatorsActive: collectMutatorsUpTo(safeIndex),
  };
}

export function instantiateQuests(def) {
  return (def?.quests || [])
    .filter((q) => q.kind === "main")
    .map((q) => ({
      id: q.id,
      kind: q.kind,
      type: q.type,
      target: q.target,
      progress: 0,
      done: false,
      scope: q.scope || "era",
      buildingId: q.buildingId,
      areaId: q.areaId,
      or: q.or,
    }));
}

export function collectMutatorsUpTo(index) {
  const ids = [];
  const max = Math.max(0, Math.min(ERA_DEFS.length - 1, Math.floor(index)));
  for (let i = 0; i <= max; i += 1) {
    for (const mutatorId of ERA_DEFS[i].mutators || []) ids.push(mutatorId);
  }
  return ids;
}

export function ensureEra(state) {
  if (!state.era || typeof state.era !== "object" || !state.era.id) {
    state.era = emptyEraState(deriveEraIndex(state));
  }

  const era = state.era;
  const def = getEraDefById(era.id);
  era.id = def.id;
  era.index = eraIndexForId(def.id);
  if (era.mode !== "distortion") era.mode = "chronicle";
  if (!Array.isArray(era.completedEraIds)) era.completedEraIds = [];
  if (!Array.isArray(era.quests)) era.quests = instantiateQuests(def);
  if (!era.questCounters || typeof era.questCounters !== "object") era.questCounters = {};
  era.questCounters = { ...ERA_COUNTER_DEFAULTS, ...era.questCounters };
  if (!Array.isArray(era.mutatorsActive)) era.mutatorsActive = collectMutatorsUpTo(era.index);
  return era;
}

/** Highest era index an existing save has plausibly earned from absolute progress. */
export function deriveEraIndex(state) {
  const { unique } = dexCaughtCount(state);
  const researchDone = researchDoneCount(state);
  const bsum = buildingLevelsSum(state);
  const gates = [
    { index: 2, dex: 25 },
    { index: 3, dex: 45, research: 5 },
    { index: 4, dex: 55, research: 5, bsum: 18 },
    { index: 5, dex: 90, research: 8 },
    { index: 6, dex: 130, research: 11 },
    { index: 7, dex: 110, research: 11 },
    { index: 8, dex: 200, research: 14, bsum: 55 },
  ];
  let best = 0;
  for (const gate of gates) {
    const dexOk = gate.dex == null || unique >= gate.dex;
    const researchOk = gate.research == null || researchDone >= gate.research;
    const buildingsOk = gate.bsum == null || bsum >= gate.bsum;
    if (dexOk && researchOk && buildingsOk) best = gate.index;
  }
  return best;
}

export function buildingLevelsSum(state) {
  let total = 0;
  for (const building of Object.values(state.buildings || {})) {
    const owned = typeof building?.owned === "number" ? building.owned : 0;
    total += Math.max(0, Math.floor(owned));
  }
  return total;
}

export function researchDoneCount(state) {
  return Object.values(state.tech || {}).filter(Boolean).length;
}

export function isAreaUnlocked(state, areaId, getCaptureAreas) {
  if (typeof getCaptureAreas === "function") {
    const areas = getCaptureAreas();
    return Boolean(Array.isArray(areas) && areas.find((area) => area.id === areaId)?.unlocked);
  }

  const { unique } = dexCaughtCount(state);
  const fallbackReq = { kanto: 0, johto: 25, hoenn: 70, sinnoh: 140 };
  return typeof fallbackReq[areaId] === "number" ? unique >= fallbackReq[areaId] : false;
}

function leafProgress(state, leaf, getCaptureAreas) {
  if (leaf.type === "dex_unique") return dexCaughtCount(state).unique;
  if (leaf.type === "research_done") return researchDoneCount(state);
  if (leaf.type === "building_level") return state.buildings?.[leaf.buildingId]?.owned ?? 0;
  if (leaf.type === "building_levels_sum") return buildingLevelsSum(state);
  if (leaf.type === "area_unlock") return isAreaUnlocked(state, leaf.areaId, getCaptureAreas) ? 1 : 0;
  return 0;
}

function evalLeaf(state, leaf, getCaptureAreas) {
  return leafProgress(state, leaf, getCaptureAreas) >= (leaf.target ?? 1);
}

export function syncEraQuests(state, getCaptureAreas) {
  const era = ensureEra(state);
  for (const quest of era.quests) {
    let progress = 0;
    let done = false;

    if (quest.type === "or" && Array.isArray(quest.or)) {
      done = quest.or.some((leaf) => evalLeaf(state, leaf, getCaptureAreas));
      progress = done ? quest.target : 0;
    } else if (quest.scope === "era") {
      progress = Math.max(0, Math.floor(era.questCounters[quest.type] || 0));
      done = progress >= quest.target;
    } else {
      progress = leafProgress(state, quest, getCaptureAreas);
      done = progress >= quest.target;
    }

    quest.progress = Math.min(progress, quest.target);
    quest.done = done;
  }
  return era;
}

export function bumpEraCounter(state, key, amount = 1) {
  const era = ensureEra(state);
  const delta = Math.max(0, Math.floor(amount));
  era.questCounters[key] = Math.max(0, Math.floor(era.questCounters[key] || 0)) + delta;
  return era;
}

export function canAdvanceEra(state, getCaptureAreas) {
  const era = syncEraQuests(state, getCaptureAreas);
  if (era.index >= ERA_DEFS.length - 1) return false;
  return era.quests.filter((q) => q.kind === "main").every((q) => q.done);
}

export function advanceEra(state, { addLog, getCaptureAreas } = {}) {
  if (!canAdvanceEra(state, getCaptureAreas)) return false;
  const era = state.era;
  const nextIndex = era.index + 1;
  if (nextIndex >= ERA_DEFS.length) return false;

  era.completedEraIds = [...(era.completedEraIds || []), era.id];
  const nextDef = getEraDefByIndex(nextIndex);
  era.id = nextDef.id;
  era.index = nextIndex;
  era.questCounters = { ...ERA_COUNTER_DEFAULTS };
  era.quests = instantiateQuests(nextDef);
  era.mutatorsActive = collectMutatorsUpTo(nextIndex);
  if (era.mode !== "distortion") era.mode = "chronicle";

  if (nextDef.logOnEnter && typeof addLog === "function") addLog(nextDef.logOnEnter, true);
  syncEraQuests(state, getCaptureAreas);
  return true;
}

export function applyMutatorsToEff(eff, state) {
  const active = state?.era?.mutatorsActive;
  if (!Array.isArray(active)) return eff;

  for (const id of active) {
    const mutator = ERA_MUTATORS[id];
    if (!mutator) continue;
    for (const [key, value] of Object.entries(mutator)) {
      if (typeof value !== "number") continue;
      if (key.endsWith("Mul")) eff[key] = (typeof eff[key] === "number" ? eff[key] : 1) * value;
      else eff[key] = (typeof eff[key] === "number" ? eff[key] : 0) + value;
    }
  }
  return eff;
}

export function eraPokeballBonusCrafted(state, qty) {
  const made = Math.max(0, Math.floor(typeof qty === "number" && Number.isFinite(qty) ? qty : 0));
  if (made <= 0) return 0;
  const eff = applyMutatorsToEff({ pokeballCraftBonusMul: 1 }, state);
  const mul = typeof eff.pokeballCraftBonusMul === "number" && Number.isFinite(eff.pokeballCraftBonusMul) ? eff.pokeballCraftBonusMul : 1;
  return Math.max(0, Math.floor(made * Math.max(0, mul - 1)));
}

export function eraEncounterRechargeMul(state) {
  const eff = applyMutatorsToEff({ encounterCooldownMul: 1 }, state);
  const mul = typeof eff.encounterCooldownMul === "number" && Number.isFinite(eff.encounterCooldownMul) ? eff.encounterCooldownMul : 1;
  return Math.max(0.01, mul);
}

export function applyEncounterBias(weight, mon, state, getMonTypes) {
  let out = typeof weight === "number" && Number.isFinite(weight) ? weight : 0;
  if (out <= 0) return 0;
  const era = ensureEra(state);
  const bias = getEraDefById(era.id)?.encounterBias;
  if (!bias || typeof bias !== "object") return out;

  const tierMul = bias.tierBoost?.[mon?.tier];
  if (typeof tierMul === "number" && Number.isFinite(tierMul)) out *= Math.max(0, tierMul);

  const range = bias.dexRangeBoost;
  if (range && typeof mon?.dex === "number" && mon.dex >= range.min && mon.dex <= range.max) {
    const mul = typeof range.mul === "number" && Number.isFinite(range.mul) ? range.mul : 1;
    out *= Math.max(0, mul);
  }

  const typeBoost = bias.typeBoost;
  if (typeBoost && typeof typeBoost === "object") {
    let types = typeof getMonTypes === "function" ? getMonTypes(mon) : null;
    if (!Array.isArray(types)) {
      const localTypes = globalThis.POKEMON_TYPES;
      types = localTypes && typeof localTypes === "object" ? localTypes[mon?.dex] : null;
    }
    for (const t of Array.isArray(types) ? types : []) {
      const mul = typeBoost[t];
      if (typeof mul === "number" && Number.isFinite(mul)) out *= Math.max(0, mul);
    }
  }

  return out;
}

export function questLabel(q) {
  const labels = {
    gather_total: "采集",
    catch_count: "捕捉",
    berry_earned: "树果获得",
    pokeball_earned: "球果/球获得",
    dex_unique: "图鉴",
    research_done: "研究完成",
    building_level: "建筑等级",
    building_levels_sum: "建筑等级总和",
    area_unlock: "解锁地区",
    or: "条件之一",
  };
  return `${labels[q.type] || q.type} ${q.progress || 0}/${q.target}`;
}
