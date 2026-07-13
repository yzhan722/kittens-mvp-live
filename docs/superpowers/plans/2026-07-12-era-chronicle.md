# Era Chronicle（图鉴编年史）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 9-era Pokémon chronicle overlay: quest-gated advance, stacking rule mutators, full-keep saves, ~1h dwell via activity targets only (no clock quest).

**Architecture:** Data in `modules/defs_eras.js`; pure logic in `modules/systems/era.js`; mutators fold into existing `computeTechEffects` / production / catch paths; thin hooks from catch/gather/craft/research/tick; UI panel on Capture tab. Do **not** change `CAPTURE_AREAS.unlockReq`. Prestige/`mode:"distortion"` is data-hook only.

**Tech Stack:** Vanilla JS ES modules, existing `scripts/selfcheck.mjs` assert pattern, Cloudflare Pages save blob (client state).

**Repo policy:** Do **not** git commit / push / deploy unless the user explicitly asks. Skip all “Commit” steps until then.

**Spec:** `docs/superpowers/specs/2026-07-12-era-chronicle-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| Create `modules/defs_eras.js` | 9 eras, mutator defs, quest templates, labels |
| Create `modules/systems/era.js` | ensure/migrate, bump counters, sync absolute quests, canAdvance, advanceEra, deriveIndexForMigration, applyMutatorsToEff |
| Create `scripts/era-selfcheck.mjs` | assert-based checks for era pure logic |
| Modify `modules/systems/effects.js` | call `applyMutatorsToEff` from `computeTechEffects`; apply `researchTimeMul` in `computeResearchTimeSec` |
| Modify `modules/state.js` | `era` on `defaultState`; hydrate/migrate in load path |
| Modify `app.js` | wire bumps + advance button handler + ensureEra on load/tick |
| Modify `modules/render/capture.js` | era panel HTML + advance button |
| Modify `styles.css` | minimal `.era-panel` styles (match Ember Camp Night) |
| Modify `scripts/selfcheck.mjs` | optionally spawn/import era checks OR document running `era-selfcheck.mjs` in CI note — prefer **add import run at end of selfcheck** so CI catches regressions |
| Modify `modules/tabs/help_tab.js` | one short paragraph on 时代 (optional, last) |

**Out of scope this plan:** skins/BGM, side quests issuance, prestige reset, dual-gating regions.

---

### Task 1: Era defs data

**Files:**
- Create: `modules/defs_eras.js`
- Test: `scripts/era-selfcheck.mjs` (created in Task 2; smoke asserts here after Task 2)

- [ ] **Step 1: Add `modules/defs_eras.js`**

```js
/** @typedef {{ id: string, kind: "main"|"side", type: string, target: number, scope: "era"|"absolute", buildingId?: string, areaId?: string, or?: object[] }} EraQuestTemplate */

export const ERA_DEFS = [
  {
    id: "dawn",
    name: "宝可梦出现之时",
    logOnEnter: null,
    mutators: [],
    quests: [
      { id: "dawn_gather_400", kind: "main", type: "gather_total", target: 400, scope: "era" },
      { id: "dawn_catch_80", kind: "main", type: "catch_count", target: 80, scope: "era" },
      { id: "dawn_berry_400", kind: "main", type: "berry_earned", target: 400, scope: "era" },
    ],
  },
  {
    id: "hamlet",
    name: "秘传之里",
    logOnEnter: "迈入了「秘传之里」——树果的香气弥漫开来。",
    mutators: ["berryYield_12"],
    quests: [
      { id: "hamlet_field_4", kind: "main", type: "building_level", target: 4, scope: "absolute", buildingId: "field" },
      { id: "hamlet_berry_800", kind: "main", type: "berry_earned", target: 800, scope: "era" },
      { id: "hamlet_dex_25", kind: "main", type: "dex_unique", target: 25, scope: "absolute" },
      { id: "hamlet_catch_100", kind: "main", type: "catch_count", target: 100, scope: "era" },
    ],
  },
  {
    id: "fossil",
    name: "化石苏醒",
    logOnEnter: "迈入了「化石苏醒」——化石宝可梦的气息变浓了。",
    mutators: ["catchRate_6", "researchTime_m8"],
    quests: [
      { id: "fossil_research_5", kind: "main", type: "research_done", target: 5, scope: "absolute" },
      { id: "fossil_catch_150", kind: "main", type: "catch_count", target: 150, scope: "era" },
      { id: "fossil_dex_45", kind: "main", type: "dex_unique", target: 45, scope: "absolute" },
      { id: "fossil_ball_200", kind: "main", type: "pokeball_earned", target: 200, scope: "era" },
    ],
  },
  {
    id: "gym",
    name: "道馆挑战纪",
    logOnEnter: "迈入了「道馆挑战纪」——挑战道馆的时代开始了。",
    mutators: ["pokeballGain_10", "encounterRefresh_fast"],
    quests: [
      {
        id: "gym_johto_or_dex",
        kind: "main",
        type: "or",
        target: 1,
        scope: "absolute",
        or: [
          { type: "area_unlock", areaId: "johto", target: 1 },
          { type: "dex_unique", target: 55 },
        ],
      },
      { id: "gym_catch_200", kind: "main", type: "catch_count", target: 200, scope: "era" },
      { id: "gym_ball_280", kind: "main", type: "pokeball_earned", target: 280, scope: "era" },
      { id: "gym_bld_sum_18", kind: "main", type: "building_levels_sum", target: 18, scope: "absolute" },
    ],
  },
  {
    id: "champion",
    name: "冠军之路",
    logOnEnter: "迈入了「冠军之路」——联盟的荣光在召唤你。",
    mutators: ["pokeballCap_8"],
    quests: [
      { id: "champ_dex_90", kind: "main", type: "dex_unique", target: 90, scope: "absolute" },
      { id: "champ_research_8", kind: "main", type: "research_done", target: 8, scope: "absolute" },
      { id: "champ_catch_240", kind: "main", type: "catch_count", target: 240, scope: "era" },
      { id: "champ_berry_1200", kind: "main", type: "berry_earned", target: 1200, scope: "era" },
    ],
  },
  {
    id: "mega",
    name: "Mega 进化潮",
    logOnEnter: "迈入了「Mega 进化潮」——关键石的力量苏醒了。",
    mutators: ["buildingYield_10", "researchCost_m8"],
    quests: [
      { id: "mega_lab_5", kind: "main", type: "building_level", target: 5, scope: "absolute", buildingId: "researchLab" },
      { id: "mega_research_11", kind: "main", type: "research_done", target: 11, scope: "absolute" },
      { id: "mega_dex_130", kind: "main", type: "dex_unique", target: 130, scope: "absolute" },
      { id: "mega_catch_260", kind: "main", type: "catch_count", target: 260, scope: "era" },
    ],
  },
  {
    id: "dynamax",
    name: "极巨化旷野",
    logOnEnter: "迈入了「极巨化旷野」——旷野之上云层翻涌。",
    mutators: ["fieldYield_10", "catchRate_3"],
    quests: [
      {
        id: "dyna_hoenn_or_dex",
        kind: "main",
        type: "or",
        target: 1,
        scope: "absolute",
        or: [
          { type: "area_unlock", areaId: "hoenn", target: 1 },
          { type: "dex_unique", target: 110 },
        ],
      },
      { id: "dyna_gather_500", kind: "main", type: "gather_total", target: 500, scope: "era" },
      { id: "dyna_catch_300", kind: "main", type: "catch_count", target: 300, scope: "era" },
      { id: "dyna_berry_1500", kind: "main", type: "berry_earned", target: 1500, scope: "era" },
    ],
  },
  {
    id: "terastal",
    name: "太晶祭典",
    logOnEnter: "迈入了「太晶祭典」——宝可梦披上了晶莹的光辉。",
    mutators: ["researchTime_m10", "catchRate_4"],
    quests: [
      { id: "tera_research_14", kind: "main", type: "research_done", target: 14, scope: "absolute" },
      { id: "tera_dex_200", kind: "main", type: "dex_unique", target: 200, scope: "absolute" },
      { id: "tera_bld_sum_55", kind: "main", type: "building_levels_sum", target: 55, scope: "absolute" },
      { id: "tera_catch_320", kind: "main", type: "catch_count", target: 320, scope: "era" },
    ],
  },
  {
    id: "paradox",
    name: "悖论时空",
    logOnEnter: "迈入了「悖论时空」——过去与未来在此交叠。",
    mutators: ["shiny_micro", "rareWeight_micro", "allYield_5"],
    quests: [
      { id: "paradox_dex_300", kind: "main", type: "dex_unique", target: 300, scope: "absolute" },
      { id: "paradox_catch_360", kind: "main", type: "catch_count", target: 360, scope: "era" },
      { id: "paradox_research_16", kind: "main", type: "research_done", target: 16, scope: "absolute" },
      { id: "paradox_ball_400", kind: "main", type: "pokeball_earned", target: 400, scope: "era" },
    ],
  },
];

/** Mutator id → effect deltas applied while id is in mutatorsActive */
export const ERA_MUTATORS = {
  berryYield_12: { catnipPerSecMul: 1.12 },
  catchRate_6: { catchChanceAdd: 0.06 },
  catchRate_3: { catchChanceAdd: 0.03 },
  catchRate_4: { catchChanceAdd: 0.04 },
  researchTime_m8: { researchTimeMul: 0.92 },
  researchTime_m10: { researchTimeMul: 0.90 },
  pokeballGain_10: { pokeballCraftBonus: 0.1 }, // MVP: treat as catchChanceAdd 0.02 fallback if craft bonus unused — prefer +10% free ball every 10 crafts in hook; see Task 5
  encounterRefresh_fast: { encounterCooldownMul: 0.9 }, // no-op if no cooldown; safe
  pokeballCap_8: { capPokeballMul: 1.08 },
  buildingYield_10: { catnipPerSecMul: 1.1, woodRateMul: 1.1, mineralsRateMul: 1.1 },
  researchCost_m8: { researchCostMul: 0.92 },
  fieldYield_10: { catnipPerSecMul: 1.1 },
  shiny_micro: { shinyChanceMul: 1.15 },
  rareWeight_micro: { rareWeightMul: 1.1 },
  allYield_5: { catnipPerSecMul: 1.05, woodRateMul: 1.05, mineralsRateMul: 1.05 },
};

export function getEraDefById(id) {
  return ERA_DEFS.find((e) => e.id === id) || ERA_DEFS[0];
}

export function getEraDefByIndex(index) {
  const i = Math.max(0, Math.min(ERA_DEFS.length - 1, Math.floor(index)));
  return ERA_DEFS[i];
}
```

- [ ] **Step 2: Sanity — file exports 9 eras**

Run: `node -e "import { ERA_DEFS } from './modules/defs_eras.js'; console.log(ERA_DEFS.length)"`  
Working directory: `d:\project\kittens-mvp-live`  
Expected: `9`

---

### Task 2: Pure era system + selfcheck

**Files:**
- Create: `modules/systems/era.js`
- Create: `scripts/era-selfcheck.mjs`
- Modify: `scripts/selfcheck.mjs` (append spawn of era-selfcheck or inline import)

- [ ] **Step 1: Write `modules/systems/era.js`**

```js
import { ERA_DEFS, ERA_MUTATORS, getEraDefById, getEraDefByIndex } from "../defs_eras.js";
import { dexCaughtCount } from "./effects.js";

export function emptyEraState(index = 0) {
  const def = getEraDefByIndex(index);
  return {
    id: def.id,
    index: ERA_DEFS.findIndex((e) => e.id === def.id),
    mode: "chronicle",
    quests: instantiateQuests(def),
    questCounters: { catch_count: 0, gather_total: 0, berry_earned: 0, pokeball_earned: 0 },
    completedEraIds: index > 0 ? ERA_DEFS.slice(0, index).map((e) => e.id) : [],
    mutatorsActive: collectMutatorsUpTo(index),
  };
}

export function instantiateQuests(def) {
  return (def.quests || [])
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
  for (let i = 0; i <= index && i < ERA_DEFS.length; i++) {
    for (const m of ERA_DEFS[i].mutators || []) ids.push(m);
  }
  return ids;
}

export function ensureEra(state) {
  if (!state.era || typeof state.era !== "object" || !state.era.id) {
    const idx = deriveEraIndex(state);
    state.era = emptyEraState(idx);
  }
  if (!Array.isArray(state.era.quests)) state.era.quests = instantiateQuests(getEraDefById(state.era.id));
  if (!state.era.questCounters || typeof state.era.questCounters !== "object") {
    state.era.questCounters = { catch_count: 0, gather_total: 0, berry_earned: 0, pokeball_earned: 0 };
  }
  if (!Array.isArray(state.era.mutatorsActive)) {
    state.era.mutatorsActive = collectMutatorsUpTo(state.era.index | 0);
  }
  if (!Array.isArray(state.era.completedEraIds)) state.era.completedEraIds = [];
  if (state.era.mode !== "distortion") state.era.mode = "chronicle";
  return state.era;
}

/** Highest era index the save has “earned entry into” via absolute progress. */
export function deriveEraIndex(state) {
  // Entry into era N means previous era's absolute gates are plausible.
  // Simple ladder: map dex unique to max index (conservative — prefer lower if unsure).
  const { unique } = dexCaughtCount(state);
  const researchDone = Object.values(state.tech || {}).filter(Boolean).length;
  const bsum = buildingLevelsSum(state);
  // Thresholds = absolute bars from prior era quests (approx from spec)
  const gates = [
    { index: 0 },
    { index: 1, dex: 0 }, // always can be in hamlet if somehow advanced — migration uses:
    { index: 2, dex: 25, research: 0 },
    { index: 3, dex: 45, research: 5 },
    { index: 4, dex: 55, research: 5, bsum: 18 },
    { index: 5, dex: 90, research: 8 },
    { index: 6, dex: 130, research: 11 },
    { index: 7, dex: 110, research: 11 }, // dynamax entry softer on dex|area
    { index: 8, dex: 200, research: 14, bsum: 55 },
  ];
  let best = 0;
  for (const g of gates) {
    if (g.index === 0) continue;
    const dexOk = g.dex == null || unique >= g.dex;
    const resOk = g.research == null || researchDone >= g.research;
    const bOk = g.bsum == null || bsum >= g.bsum;
    if (dexOk && resOk && bOk) best = g.index;
  }
  return best;
}

export function buildingLevelsSum(state) {
  let s = 0;
  const b = state.buildings || {};
  for (const v of Object.values(b)) {
    const n = typeof v?.owned === "number" ? v.owned : 0;
    s += Math.max(0, Math.floor(n));
  }
  return s;
}

export function researchDoneCount(state) {
  return Object.values(state.tech || {}).filter(Boolean).length;
}

export function isAreaUnlocked(state, areaId, getCaptureAreas) {
  if (typeof getCaptureAreas === "function") {
    const a = getCaptureAreas().find((x) => x.id === areaId);
    return Boolean(a?.unlocked);
  }
  // fallback: dex thresholds from config (duplicated lightly for pure tests)
  const { unique } = dexCaughtCount(state);
  const req = { kanto: 0, johto: 25, hoenn: 70, sinnoh: 140 }[areaId];
  return typeof req === "number" ? unique >= req : false;
}

function evalLeaf(state, leaf, getCaptureAreas) {
  const type = leaf.type;
  const target = leaf.target ?? 1;
  if (type === "dex_unique") return dexCaughtCount(state).unique >= target;
  if (type === "research_done") return researchDoneCount(state) >= target;
  if (type === "building_level") {
    const id = leaf.buildingId;
    const n = state.buildings?.[id]?.owned ?? 0;
    return n >= target;
  }
  if (type === "building_levels_sum") return buildingLevelsSum(state) >= target;
  if (type === "area_unlock") return isAreaUnlocked(state, leaf.areaId, getCaptureAreas);
  return false;
}

export function syncEraQuests(state, getCaptureAreas) {
  const era = ensureEra(state);
  const c = era.questCounters;
  for (const q of era.quests) {
    if (q.done) continue;
    let progress = 0;
    let done = false;
    if (q.type === "or" && Array.isArray(q.or)) {
      done = q.or.some((leaf) => evalLeaf(state, leaf, getCaptureAreas));
      progress = done ? 1 : 0;
    } else if (q.scope === "era") {
      progress = Math.max(0, Math.floor(c[q.type] || 0));
      done = progress >= q.target;
    } else {
      // absolute snapshot types
      if (q.type === "dex_unique") progress = dexCaughtCount(state).unique;
      else if (q.type === "research_done") progress = researchDoneCount(state);
      else if (q.type === "building_level") progress = state.buildings?.[q.buildingId]?.owned ?? 0;
      else if (q.type === "building_levels_sum") progress = buildingLevelsSum(state);
      else if (q.type === "area_unlock") progress = isAreaUnlocked(state, q.areaId, getCaptureAreas) ? 1 : 0;
      done = progress >= q.target;
    }
    q.progress = Math.min(progress, q.target);
    q.done = done;
  }
  return era;
}

export function bumpEraCounter(state, key, amount = 1) {
  const era = ensureEra(state);
  const n = Math.max(0, Math.floor(amount));
  era.questCounters[key] = Math.max(0, Math.floor(era.questCounters[key] || 0)) + n;
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
  const next = getEraDefByIndex(nextIndex);
  era.id = next.id;
  era.index = nextIndex;
  era.questCounters = { catch_count: 0, gather_total: 0, berry_earned: 0, pokeball_earned: 0 };
  era.quests = instantiateQuests(next);
  era.mutatorsActive = collectMutatorsUpTo(nextIndex);
  if (next.logOnEnter && typeof addLog === "function") addLog(next.logOnEnter, true);
  syncEraQuests(state, getCaptureAreas);
  return true;
}

/** Fold stacked mutators into an effects object (mul keys multiply, add keys add). */
export function applyMutatorsToEff(eff, state) {
  const era = state?.era;
  if (!era || !Array.isArray(era.mutatorsActive)) return eff;
  for (const id of era.mutatorsActive) {
    const m = ERA_MUTATORS[id];
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== "number") continue;
      if (k.endsWith("Mul")) eff[k] = (typeof eff[k] === "number" ? eff[k] : 1) * v;
      else eff[k] = (typeof eff[k] === "number" ? eff[k] : 0) + v;
    }
  }
  return eff;
}

export function questLabel(q) {
  // short Chinese labels for UI
  const map = {
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
  if (q.type === "or") return "解锁城都/丰缘或达到图鉴门槛";
  const name = map[q.type] || q.type;
  return `${name} ${q.progress || 0}/${q.target}`;
}
```

- [ ] **Step 2: Write `scripts/era-selfcheck.mjs`**

```js
#!/usr/bin/env node
import {
  emptyEraState,
  bumpEraCounter,
  syncEraQuests,
  canAdvanceEra,
  advanceEra,
  applyMutatorsToEff,
  deriveEraIndex,
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
  const state = { era: emptyEraState(2) }; // fossil index → includes berry + fossil mutators
  applyMutatorsToEff(eff, state);
  assert(eff.catnipPerSecMul > 1, "berry mul applied");
  assert(eff.catchChanceAdd >= 0.06, "catch add applied");
}

{
  const state = {
    dex: { caught: Object.fromEntries([...Array(50)].map((_, i) => [String(i + 1), 1])) },
    tech: { a: true, b: true, c: true, d: true, e: true },
    buildings: { field: { owned: 4 }, hut: { owned: 2 } },
  };
  const idx = deriveEraIndex(state);
  assert(idx >= 2, "derive at least fossil-ish for dex50+research5");
}

if (failed) {
  console.error(`era-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("era-selfcheck: OK");
```

- [ ] **Step 3: Run era-selfcheck**

Run: `node scripts/era-selfcheck.mjs`  
Expected: `era-selfcheck: OK`

- [ ] **Step 4: Wire into main selfcheck**

At end of `scripts/selfcheck.mjs`, before final exit summary, add:

```js
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const era = spawnSync(process.execPath, [path.join(__dirname, "era-selfcheck.mjs")], { stdio: "inherit" });
if (era.status !== 0) failed += 1;
```

(Or simpler: duplicate a few asserts — prefer spawnSync so era file stays the source of truth.)

- [ ] **Step 5: Run full selfcheck**

Run: `node scripts/selfcheck.mjs`  
Expected: existing OK + `era-selfcheck: OK`

- [ ] **Step 6: Commit** — **SKIP** unless user asks.

---

### Task 3: State hydrate

**Files:**
- Modify: `modules/state.js`

- [ ] **Step 1: Add `era` to `defaultState()`**

After `catchCount: 0,` (or nearby counters):

```js
era: null, // hydrated by ensureEra on load / first tick
```

Prefer `era: null` and always `ensureEra(state)` on load so migration uses `deriveEraIndex`.

- [ ] **Step 2: In save→state hydrate (`loadState` / `stateFromData` path ~line 588+)**

After other fields copied:

```js
import { ensureEra } from "./systems/era.js";
// ...
if (data.era && typeof data.era === "object") {
  s.era = data.era;
}
ensureEra(s);
```

Ensure `era` is included when serializing save (if save is `JSON.stringify(state)`, it already will be once on state).

- [ ] **Step 3: Manual smoke** — load defaultState in node:

```js
import { defaultState } from "./modules/state.js";
import { ensureEra } from "./modules/systems/era.js";
const s = defaultState();
ensureEra(s);
console.log(s.era.id, s.era.quests.length);
```

Expected: `dawn` and `3` (or 4 if hamlet — dawn has 3).

- [ ] **Step 4: Commit** — SKIP unless asked.

---

### Task 4: Fold mutators into effects / research time

**Files:**
- Modify: `modules/systems/effects.js`

- [ ] **Step 1: Import + apply at end of `computeTechEffects`**

```js
import { applyMutatorsToEff } from "./era.js";
// before return eff:
applyMutatorsToEff(eff, state);
// ensure researchTimeMul default:
if (typeof eff.researchTimeMul !== "number") eff.researchTimeMul = 1;
if (typeof eff.researchCostMul !== "number") eff.researchCostMul = 1;
if (typeof eff.shinyChanceMul !== "number") eff.shinyChanceMul = 1;
return eff;
```

- [ ] **Step 2: Apply `researchTimeMul` in `computeResearchTimeSec`**

After computing `t` (or forced time), multiply:

```js
const techEff = computeTechEffects(state, { tech: {} }, ui); // avoid circular cost — better:
// pass researchTimeMul from caller OR read state.era mutators only:
import { applyMutatorsToEff } from "./era.js";
const eraEff = applyMutatorsToEff({ researchTimeMul: 1 }, state);
t = t * (eraEff.researchTimeMul || 1);
```

Avoid infinite recursion: **do not** call full `computeTechEffects` from inside `computeResearchTimeSec`. Only `applyMutatorsToEff` on a tiny object.

- [ ] **Step 3: `getResearchCost` — multiply costs by `researchCostMul` from era**

```js
const eraEff = applyMutatorsToEff({ researchCostMul: 1 }, state);
const mul = eraEff.researchCostMul || 1;
if (mul !== 1) {
  for (const k of Object.keys(cost)) {
    if (typeof cost[k] === "number") cost[k] = Math.max(1, Math.ceil(cost[k] * mul));
  }
}
```

- [ ] **Step 4: Extend era-selfcheck** — researchTimeMul on fossil state reduces a dummy `t * mul`.

- [ ] **Step 5: Run `node scripts/selfcheck.mjs`** — Expected OK.

- [ ] **Step 6: Commit** — SKIP unless asked.

---

### Task 5: Wire activity bumps in `app.js`

**Files:**
- Modify: `app.js`

Hooks (search existing sites):

| Event | Counter |
|-------|---------|
| Successful catch (`state.catchCount += 1` ~2688) | `bumpEraCounter(state, "catch_count", 1)` |
| Gather click (`gatherClicks` increment) | `bumpEraCounter(state, "gather_total", 1)` |
| Pokeball craft (`pokeballMade` += n) | `bumpEraCounter(state, "pokeball_earned", n)` |
| Production tick when catnip increases | `bumpEraCounter(state, "berry_earned", dCat)` (only positive delta from production/gather already counted separately — **gather grants catnip**: count gather catnip toward berry_earned too OR only passive; spec = 树果获得 → count **all** positive catnip gains in tick + gather) |

- [ ] **Step 1: Import**

```js
import { ensureEra, bumpEraCounter, syncEraQuests, canAdvanceEra, advanceEra } from "./modules/systems/era.js";
```

- [ ] **Step 2: On load / after state ready** — `ensureEra(state); syncEraQuests(state, getCaptureAreas);`

- [ ] **Step 3: Catch success path** — after `catchCount++`:

```js
bumpEraCounter(state, "catch_count", 1);
syncEraQuests(state, getCaptureAreas);
ui.captureDirty = true;
```

- [ ] **Step 4: Gather path** — after gather:

```js
bumpEraCounter(state, "gather_total", 1);
if (gainedCatnip > 0) bumpEraCounter(state, "berry_earned", gainedCatnip);
```

- [ ] **Step 5: Ball craft** — when balls made:

```js
bumpEraCounter(state, "pokeball_earned", qty);
```

- [ ] **Step 6: Production tick** — where resources applied (~3154 `dCat`):

```js
if (dCat > 0) bumpEraCounter(state, "berry_earned", dCat);
```

- [ ] **Step 7: Research complete** — `syncEraQuests` only (absolute).

- [ ] **Step 8: Building buy** — `syncEraQuests` only.

- [ ] **Step 9: Advance handler** (click `data-era-advance`):

```js
if (canAdvanceEra(state, getCaptureAreas)) {
  advanceEra(state, { addLog, getCaptureAreas });
  ui.captureDirty = true;
  // mark save dirty if such flag exists
}
```

- [ ] **Step 10: Shiny / rare weight (MVP minimal)**  
Find shiny roll in `app.js`; if `computeTechEffects` exposes `shinyChanceMul`, multiply chance. If rare tier weights exist, multiply `rare` weight by `rareWeightMul` from `applyMutatorsToEff`. If too invasive, **ponytail:** ship catch/yield mutators first; shiny/rare can no-op until a follow-up — but leave keys in `ERA_MUTATORS` so data is ready.

- [ ] **Step 11: `pokeballGain_10`** — on craft, every 10th craft in era grant +1 ball **or** map mutator to `catchChanceAdd: 0.02` in defs if craft hook messy. Prefer simple: in `ERA_MUTATORS` change `pokeballGain_10` to `{ catchChanceAdd: 0.02 }` for MVP (document in defs comment). Update defs in Task 1 if not already.

- [ ] **Step 12: Manual mental check** — dawn quests progress on gather/catch.

- [ ] **Step 13: Commit** — SKIP unless asked.

---

### Task 6: Capture UI panel

**Files:**
- Modify: `modules/render/capture.js`
- Modify: `styles.css`
- Modify: `app.js` (event delegation for `data-era-advance` if not already global)

- [ ] **Step 1: In `renderCapture`, prepend era block to `elCaptureInfo.innerHTML`**

```js
import { ensureEra, syncEraQuests, canAdvanceEra, questLabel } from "../systems/era.js";
import { getEraDefById } from "../defs_eras.js";

const era = syncEraQuests(state, getCaptureAreas);
const def = getEraDefById(era.id);
const questsHtml = era.quests
  .map((q) => {
    const ok = q.done ? " ✓" : "";
    return `<div class="era-panel__quest${q.done ? " is-done" : ""}">${escapeHtml(questLabel(q))}${ok}</div>`;
  })
  .join("");
const canGo = canAdvanceEra(state, getCaptureAreas);
const isLast = era.index >= 8;
const actionHtml = isLast
  ? (era.quests.every((q) => q.done)
      ? `<div class="era-panel__done">已抵达悖论时空</div>`
      : "")
  : `<button type="button" class="btn btn--primary btn--small" data-era-advance ${canGo ? "" : "disabled"}>迈入下一时代</button>`;

const eraHtml = `
  <div class="era-panel">
    <div class="era-panel__title">时代 · ${escapeHtml(def.name)}</div>
    <div class="era-panel__quests">${questsHtml}</div>
    ${actionHtml}
  </div>`;
// prepend eraHtml before existing row HTML
```

Pass `getCaptureAreas` into `createRenderCapture` deps if missing.

- [ ] **Step 2: CSS**

```css
.era-panel {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--amber, #d4a017);
  background: color-mix(in srgb, var(--panel, #1a1410) 88%, transparent);
}
.era-panel__title { font-weight: 700; margin-bottom: 6px; }
.era-panel__quest { font-size: 0.9rem; opacity: 0.9; }
.era-panel__quest.is-done { opacity: 0.55; text-decoration: line-through; }
.era-panel__done { margin-top: 6px; color: var(--amber, #d4a017); }
```

- [ ] **Step 3: Click handler** in capture tab / app delegated clicks for `[data-era-advance]`.

- [ ] **Step 4: Browser smoke** — open Capture tab, see「宝可梦出现之时」and 3 quests; button disabled.

- [ ] **Step 5: Commit** — SKIP unless asked.

---

### Task 7: Help blurb + verification

**Files:**
- Modify: `modules/tabs/help_tab.js` (short note under 捕捉)
- Verify: `scripts/selfcheck.mjs`, `scripts/era-selfcheck.mjs`

- [ ] **Step 1: Help text** — one line: 捕捉页有「时代」主线；完成条件后可迈入下一时代，规则加成会叠加，进度不重置。

- [ ] **Step 2: Run**

```
node scripts/era-selfcheck.mjs
node scripts/selfcheck.mjs
```

Expected: both OK.

- [ ] **Step 3: Spec coverage checklist** (implementer ticks)

- [ ] 9 eras + stacking mutators  
- [ ] Quest gate + button advance  
- [ ] Full keep  
- [ ] No clock quest  
- [ ] Era-scoped counters reset on advance  
- [ ] Migration derive  
- [ ] Regions unlock unchanged  
- [ ] Prestige mode field present, unused  

- [ ] **Step 4: Commit / deploy** — **only if user explicitly requests**.

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| 9 Pokémon-named eras + mutators | T1 |
| Activity quests, no timer | T1–T2 |
| ~1h via magnitudes | T1 numbers from spec |
| advanceEra full keep | T2 |
| mutators in effects | T4 |
| hooks catch/gather/berry/ball | T5 |
| UI on capture | T6 |
| prestige hook `mode` | T2 `emptyEraState` |
| no region unlock change | File map / non-goal |
| migration derive | T2 `deriveEraIndex` + T3 |

**Placeholder scan:** `pokeballGain_10` / shiny / rare have explicit MVP fallbacks in T5 (simplify mutator to catchChanceAdd if craft bonus deferred). No TBD left.

**Type consistency:** `bumpEraCounter(state, key)`, `syncEraQuests(state, getCaptureAreas)`, `applyMutatorsToEff(eff, state)` used consistently.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-07-12-era-chronicle.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach? (Still no commit/deploy unless you say so.)
