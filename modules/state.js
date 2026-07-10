import { nowMs, clamp, pad3 } from "./utils.js";

import { clampStar } from "./stars.js";

import { createMonInstance as createMonInstance0 } from "./mons.js";

import { legacyIdMap, pokemon } from "./pokemon_defs.js";

import { BUILDING_DEFS } from "./defs_buildings.js";

import { EXTRA_TECH_FLAGS } from "./tech_defs.js?v=0.31.4";



export const BASE_TECH_FLAGS = {

  berryCultivation: false,

  composting: false,

  irrigation: false,

  greenhouse: false,

  backpackWeaving: false,

  campLogistics: false,

  trainerDrills: false,

  pokeballBasics: false,

  ballMolds: false,

  apricornCrafting: false,

  reinforcedBalls: false,

  captureTraining: false,

  fieldResearch: false,

  fieldGuide: false,

  mineralSurvey: false,

  excavationTools: false,

  refining: false,

  oreStorage: false,

  carpentry: false,

  sawmillPlans: false,

  supplyLines: false,

  efficientConstruction: false,

  advancedGear: false,

  researchMethod: false,

  ultraStorage: false,

};



export const BUILDING_MAX_LEVEL = 50;

export const SAVE_VERSION = 2;



export const defaultState = () => ({

  version: SAVE_VERSION,

  meta: {

    saveVersion: SAVE_VERSION,

    createdAt: nowMs(),

    lastSavedAt: nowMs(),

  },

  t: nowMs(),

  res: {

    catnip: { value: 0, cap: 80 },

    wood: { value: 0, cap: 0 },

    minerals: { value: 0, cap: 0 },

    pokeball: { value: 0, cap: 0 },

    bigBerry: { value: 0, cap: 0 },

    hugeBerry: { value: 0, cap: 0 },

    rareCandy: { value: 0, cap: 0 },

    futurecoin: { value: 0, cap: 0 },

    evolutionEnergy: { value: 0, cap: 0 },

    evolutionStone: { value: 0, cap: 0 },

    linkRope: { value: 0, cap: 0 },

    megaStone: { value: 0, cap: 0 },

    masterball: { value: 0, cap: 0 },

    hpPotion: { value: 0, cap: 0 },

    atkPotion: { value: 0, cap: 0 },

    defPotion: { value: 0, cap: 0 },

    spaPotion: { value: 0, cap: 0 },

    spdPotion: { value: 0, cap: 0 },

    spePotion: { value: 0, cap: 0 },
    expCandy: { value: 0, cap: 0 },
    expCandyL: { value: 0, cap: 0 },
    expCandyXL: { value: 0, cap: 0 },
    ultraball: { value: 0, cap: 0 },
    quickball: { value: 0, cap: 0 },
    luxuryball: { value: 0, cap: 0 },
    affectionTreat: { value: 0, cap: 0 },
    friendshipBracelet: { value: 0, cap: 0 },
    shinyCharm: { value: 0, cap: 0 },
    luckyEgg: { value: 0, cap: 0 },
    bottleCap: { value: 0, cap: 0 },
    goldBottleCap: { value: 0, cap: 0 },

  },

  pokeballMade: 0,

  evolutionStoneMade: 0,

  gatherClicks: 0,

  hatchCount: 0,

  shinyCount: 0,

  catchCount: 0,

  resourceProduced: 0,

  dailySignin: {

    lastSigninDate: "",

    consecutiveDays: 0,

    totalDays: 0,

    claimed: false,

  },

  monthlyCard: {

    active: false,

    expiresAt: 0,

    lastClaimDate: "",

    totalClaimed: 0,

  },

  dailyTasks: {

    lastResetDate: "",

    tasks: [],

    claimed: false,

  },

  rng: {

    catchFails: 0,

  },

  mons: {

    nextId: 1,

    list: [],

  },

  buildings: {

    field: { owned: 0 },

    hut: { owned: 0 },

    workshop: { owned: 0 },

    researchLab: { owned: 0 },

    granary: { owned: 0 },

    berryPress: { owned: 0 },

    storehouse: { owned: 0 },

    lumberYard: { owned: 0 },

    quarry: { owned: 0 },

    mineralSilo: { owned: 0 },

    ballBench: { owned: 0 },

    ballFactory: { owned: 0 },

    rangerPost: { owned: 0 },

    trainingGround: { owned: 0 },

    breedingHouse: { owned: 0 },

    expeditionPost: { owned: 0 },

  },

  tech: {

    ...BASE_TECH_FLAGS,

    ...EXTRA_TECH_FLAGS,

  },

  unlocks: {

    wood: false,

    minerals: false,

    pokeball: false,

    autoResearch: false,

    autoBuild: false,

    autoBall: false,

    autoCraft: false,

  },

  dex: {

    caught: {},

  },

  research: null,

  crafting: null,

  training: {

    activeIds: [],

    slotSize: 0,

  },

  breeding: {

    on: false,

    aId: null,

    bId: null,

    eggRemainingSec: 0,

    eggTotalSec: 0,

  },

  expedition: {

    on: false,

    selectedLevel: "basic",

    selectedDungeonKey: null,

    selectedIds: [],

    activeIds: [],

    remainingSec: 0,

    totalSec: 0,

    rewardExp: 0,

    rewardCoin: 0,

    rewardPotionTotal: 0,

    dungeonType: null,

    dungeons: null,

  },

  skills: {

    trainingStacks: [],

    normalBoostStacks: [],

    bullyHp: 100,

    hugeBerryBuffRemainingSec: 0,

    steelBallDiscountCharges: 0,

    iceSatietySlowRemainingSec: 0,

    fairyAffGainRemainingSec: 0,

    dragonCatchBoostRemainingSec: 0,

    psychicCraftBoostCharges: 0,

    rockBuildBoostRemainingSec: 0,

    poisonResourceSaveRemainingSec: 0,

    darkPveDamageBoostRemainingSec: 0,

  },

  auto: {

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

      evolutionStone: false,

      linkRope: false,

      hugeBerry: false,

      megaStone: false,

    },

  },
  expBoostRemainingSec: 0,
  captureBoostRemainingSec: 0,
  prodBoostRemainingSec: 0,
  permanentBoosts: {
    exp: 0,
    capture: 0,
    production: 0,
    capacity: 0,
  },
  totalPlayMs: 0,
  encounterPlusCharges: 1,

  encounterPlusCdSec: 0,

  gatherCharges: 1000,

  gatherCdSec: 0,

  encounterCharges: 100,

  encounterCdSec: 0,

  autoResearchOn: false,

  autoResearchMode: "time",

  pve: {

    progress: {},

    dailyAttempts: 0,

    dailyResetDate: "",

    selectedIds: [],

  },

  log: [],

});



export function serializeState(s) {

  const ts = nowMs();

  const baseMeta = s && typeof s.meta === "object" ? s.meta : {};

  const createdAt = typeof baseMeta.createdAt === "number" && Number.isFinite(baseMeta.createdAt)

    ? baseMeta.createdAt

    : ts;

  const meta = {

    ...baseMeta,

    saveVersion: SAVE_VERSION,

    createdAt,

    lastSavedAt: ts,

  };

  return {

    ...s,

    version: SAVE_VERSION,

    meta,

    t: ts,

  };

}



export function safeJsonParse(text) {

  try {

    return JSON.parse(text);

  } catch {

    return null;

  }

}



function getSaveVersion(data) {

  const meta = data && typeof data === "object" ? data.meta : null;

  const raw = typeof meta?.saveVersion === "number" ? meta.saveVersion : data?.version;

  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));

  return 0;

}



function normalizeSaveData(data) {

  if (!data || typeof data !== "object") return null;

  if (!data.res || typeof data.res !== "object") return null;

  if (!data.meta || typeof data.meta !== "object") data.meta = {};

  const v = getSaveVersion(data);

  data.version = v;

  data.meta.saveVersion = v;

  return data;

}



function migrateSaveData(data, fromVersion, toVersion) {

  let v = typeof fromVersion === "number" && Number.isFinite(fromVersion) ? Math.max(0, Math.floor(fromVersion)) : 0;

  if (!data.meta || typeof data.meta !== "object") data.meta = {};



  if (v < 2) {

    const t0 = typeof data.t === "number" && Number.isFinite(data.t) ? data.t : nowMs();

    if (typeof data.meta.createdAt !== "number" || !Number.isFinite(data.meta.createdAt)) data.meta.createdAt = t0;

    if (typeof data.meta.lastSavedAt !== "number" || !Number.isFinite(data.meta.lastSavedAt)) data.meta.lastSavedAt = t0;

    v = 2;

  }



  data.version = toVersion;

  data.meta.saveVersion = toVersion;

  return data;

}



function validateSaveData(data) {

  if (!data || typeof data !== "object") return false;

  if (!data.res || typeof data.res !== "object") return false;

  return true;

}



export function loadFromRaw(raw) {

  if (!raw) return null;

  const data0 = typeof raw === "string" ? safeJsonParse(raw) : raw;

  const normalized = normalizeSaveData(data0);

  if (!normalized) return null;

  const fromVersion = normalized.meta?.saveVersion ?? normalized.version ?? 0;

  const data = migrateSaveData(normalized, fromVersion, SAVE_VERSION);

  if (!validateSaveData(data)) return null;



  const s = defaultState();

  const t0 = typeof data.t === "number" && Number.isFinite(data.t) ? data.t : nowMs();

  s.t = t0;

  if (data.meta && typeof data.meta === "object") {

    const createdAt =

      typeof data.meta.createdAt === "number" && Number.isFinite(data.meta.createdAt)

        ? data.meta.createdAt

        : t0;

    const lastSavedAt =

      typeof data.meta.lastSavedAt === "number" && Number.isFinite(data.meta.lastSavedAt)

        ? data.meta.lastSavedAt

        : t0;

    s.meta = {

      ...s.meta,

      createdAt,

      lastSavedAt,

    };

  }

  s.version = SAVE_VERSION;

  if (!s.meta || typeof s.meta !== "object") s.meta = { saveVersion: SAVE_VERSION };

  s.meta.saveVersion = SAVE_VERSION;



  // 确保道具资源存在（兼容旧存档）

  if (!data.res || typeof data.res.evolutionEnergy?.value !== "number") s.res.evolutionEnergy.value = 0;

  if (!data.res || typeof data.res.evolutionStone?.value !== "number") s.res.evolutionStone.value = 0;

  if (!data.res || typeof data.res.linkRope?.value !== "number") s.res.linkRope.value = 0;

  if (!data.res || typeof data.res.megaStone?.value !== "number") s.res.megaStone.value = 0;



  if (!data.res || typeof data.res.bigBerry?.value !== "number") s.res.bigBerry.value = 0;

  if (!data.res || typeof data.res.hugeBerry?.value !== "number") s.res.hugeBerry.value = 0;



  for (const rid of Object.keys(s.res)) {

    if (data.res && data.res[rid] && typeof data.res[rid].value === "number") {

      s.res[rid].value = data.res[rid].value;

    }

  }



  if (typeof data.pokeballMade === "number" && Number.isFinite(data.pokeballMade)) {

    s.pokeballMade = Math.max(0, Math.floor(data.pokeballMade));

  }



  if (typeof data.evolutionStoneMade === "number" && Number.isFinite(data.evolutionStoneMade)) {

    s.evolutionStoneMade = Math.max(0, Math.floor(data.evolutionStoneMade));

  }



  if (typeof data.gatherClicks === "number" && Number.isFinite(data.gatherClicks)) {

    s.gatherClicks = Math.max(0, Math.floor(data.gatherClicks));

  }

  if (typeof data.hatchCount === "number" && Number.isFinite(data.hatchCount)) {

    s.hatchCount = Math.max(0, Math.floor(data.hatchCount));

  }

  if (typeof data.shinyCount === "number" && Number.isFinite(data.shinyCount)) {

    s.shinyCount = Math.max(0, Math.floor(data.shinyCount));

  }

  if (typeof data.catchCount === "number" && Number.isFinite(data.catchCount)) {

    s.catchCount = Math.max(0, Math.floor(data.catchCount));

  }

  if (typeof data.resourceProduced === "number" && Number.isFinite(data.resourceProduced)) {

    s.resourceProduced = Math.max(0, Math.floor(data.resourceProduced));

  }



  if (data.buildings && typeof data.buildings === "object") {

    for (const [bid, b] of Object.entries(data.buildings)) {

      if (!b || typeof b !== "object") continue;

      if (typeof b.owned !== "number" || !Number.isFinite(b.owned)) continue;

      if (!s.buildings[bid]) continue;

      const bdef = BUILDING_DEFS?.[bid];

      const maxLvl =

        typeof bdef?.maxLevel === "number" && Number.isFinite(bdef.maxLevel)

          ? Math.max(1, Math.floor(bdef.maxLevel))

          : BUILDING_MAX_LEVEL;

      s.buildings[bid].owned = clamp(Math.floor(b.owned), 0, maxLvl);

    }

  }



  if (!s.buildings.trainingGround) s.buildings.trainingGround = { owned: 0 };

  if (!s.buildings.breedingHouse) s.buildings.breedingHouse = { owned: 0 };

  if (!s.buildings.expeditionPost) s.buildings.expeditionPost = { owned: 0 };



  if (data.tech && typeof data.tech === "object") {

    for (const tid of Object.keys(s.tech)) {

      if (typeof data.tech[tid] === "boolean") s.tech[tid] = data.tech[tid];

    }

  }



  if (data.unlocks && typeof data.unlocks === "object") {

    if (typeof data.unlocks.autoResearch === "boolean") s.unlocks.autoResearch = data.unlocks.autoResearch;

    if (typeof data.unlocks.autoBuild === "boolean") s.unlocks.autoBuild = data.unlocks.autoBuild;

    if (typeof data.unlocks.autoBall === "boolean") s.unlocks.autoBall = data.unlocks.autoBall;

    if (typeof data.unlocks.autoCraft === "boolean") s.unlocks.autoCraft = data.unlocks.autoCraft;

  }



  if (typeof data.autoResearchOn === "boolean") s.autoResearchOn = data.autoResearchOn;



  if (typeof data.autoResearchMode === "string") {

    const m = data.autoResearchMode;

    if (m === "time" || m === "cost") s.autoResearchMode = m;

  }



  if (typeof data.expBoostRemainingSec === "number" && Number.isFinite(data.expBoostRemainingSec)) {
    s.expBoostRemainingSec = Math.max(0, data.expBoostRemainingSec);
  }

  if (typeof data.captureBoostRemainingSec === "number" && Number.isFinite(data.captureBoostRemainingSec)) {
    s.captureBoostRemainingSec = Math.max(0, data.captureBoostRemainingSec);
  }

  if (typeof data.prodBoostRemainingSec === "number" && Number.isFinite(data.prodBoostRemainingSec)) {
    s.prodBoostRemainingSec = Math.max(0, data.prodBoostRemainingSec);
  }

  if (data.permanentBoosts && typeof data.permanentBoosts === "object") {
    if (typeof data.permanentBoosts.exp === "number") {
      s.permanentBoosts.exp = Math.max(0, Math.min(10, Math.floor(data.permanentBoosts.exp)));
    }
    if (typeof data.permanentBoosts.capture === "number") {
      s.permanentBoosts.capture = Math.max(0, Math.min(10, Math.floor(data.permanentBoosts.capture)));
    }
    if (typeof data.permanentBoosts.production === "number") {
      s.permanentBoosts.production = Math.max(0, Math.min(10, Math.floor(data.permanentBoosts.production)));
    }
    if (typeof data.permanentBoosts.capacity === "number") {
      s.permanentBoosts.capacity = Math.max(0, Math.min(10, Math.floor(data.permanentBoosts.capacity)));
    }
  }



  if (typeof data.encounterPlusCdSec === "number" && Number.isFinite(data.encounterPlusCdSec)) {

    s.encounterPlusCdSec = Math.max(0, data.encounterPlusCdSec);

  }



  if (typeof data.encounterPlusCharges === "number" && Number.isFinite(data.encounterPlusCharges)) {

    s.encounterPlusCharges = clamp(Math.floor(data.encounterPlusCharges), 0, 10);

  } else {

    s.encounterPlusCharges = s.encounterPlusCdSec > 0 ? 0 : 1;

  }



  if (typeof data.gatherCdSec === "number" && Number.isFinite(data.gatherCdSec)) {

    s.gatherCdSec = Math.max(0, data.gatherCdSec);

  }

  if (typeof data.gatherCharges === "number" && Number.isFinite(data.gatherCharges)) {

    s.gatherCharges = clamp(Math.floor(data.gatherCharges), 0, 1000);

  } else {

    s.gatherCharges = s.gatherCdSec > 0 ? 0 : 1000;

  }



  if (typeof data.encounterCdSec === "number" && Number.isFinite(data.encounterCdSec)) {

    s.encounterCdSec = Math.max(0, data.encounterCdSec);

  }

  if (typeof data.encounterCharges === "number" && Number.isFinite(data.encounterCharges)) {

    s.encounterCharges = clamp(Math.floor(data.encounterCharges), 0, 100);

  } else {

    s.encounterCharges = s.encounterCdSec > 0 ? 0 : 100;

  }



  s.skills = {

    trainingStacks: [],

    normalBoostStacks: [],

    bullyHp: 100,

    hugeBerryBuffRemainingSec: 0,

    steelBallDiscountCharges: 0,

    iceSatietySlowRemainingSec: 0,

    fairyAffGainRemainingSec: 0,

    dragonCatchBoostRemainingSec: 0,

    psychicCraftBoostCharges: 0,

    rockBuildBoostRemainingSec: 0,

    poisonResourceSaveRemainingSec: 0,

    darkPveDamageBoostRemainingSec: 0,

  };

  if (data.skills && typeof data.skills === "object") {

    const ts = Array.isArray(data.skills.trainingStacks) ? data.skills.trainingStacks : [];

    const ns = Array.isArray(data.skills.normalBoostStacks) ? data.skills.normalBoostStacks : [];

    s.skills.trainingStacks = ts

      .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : 0))

      .filter((x) => x > 0)

      .slice(0, 200);

    s.skills.normalBoostStacks = ns

      .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : 0))

      .filter((x) => x > 0)

      .slice(0, 200);

    const hp = data.skills.bullyHp;

    if (typeof hp === "number" && Number.isFinite(hp)) s.skills.bullyHp = clamp(Math.floor(hp), 0, 100);

    const rem = data.skills.hugeBerryBuffRemainingSec;

    if (typeof rem === "number" && Number.isFinite(rem)) s.skills.hugeBerryBuffRemainingSec = Math.max(0, rem);



    const steel = data.skills.steelBallDiscountCharges;

    if (typeof steel === "number" && Number.isFinite(steel)) s.skills.steelBallDiscountCharges = Math.max(0, Math.floor(steel));

    const ice = data.skills.iceSatietySlowRemainingSec;

    if (typeof ice === "number" && Number.isFinite(ice)) s.skills.iceSatietySlowRemainingSec = Math.max(0, ice);

    const fairy = data.skills.fairyAffGainRemainingSec;

    if (typeof fairy === "number" && Number.isFinite(fairy)) s.skills.fairyAffGainRemainingSec = Math.max(0, fairy);

    const dragon = data.skills.dragonCatchBoostRemainingSec;

    if (typeof dragon === "number" && Number.isFinite(dragon)) s.skills.dragonCatchBoostRemainingSec = Math.max(0, dragon);

    const psychic = data.skills.psychicCraftBoostCharges;

    if (typeof psychic === "number" && Number.isFinite(psychic)) s.skills.psychicCraftBoostCharges = Math.max(0, Math.floor(psychic));

    const rock = data.skills.rockBuildBoostRemainingSec;

    if (typeof rock === "number" && Number.isFinite(rock)) s.skills.rockBuildBoostRemainingSec = Math.max(0, rock);

    const poison = data.skills.poisonResourceSaveRemainingSec;

    if (typeof poison === "number" && Number.isFinite(poison)) s.skills.poisonResourceSaveRemainingSec = Math.max(0, poison);

    const dark = data.skills.darkPveDamageBoostRemainingSec;

    if (typeof dark === "number" && Number.isFinite(dark)) s.skills.darkPveDamageBoostRemainingSec = Math.max(0, dark);

  }



  s.auto = {

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

  if (data.auto && typeof data.auto === "object") {

    if (typeof data.auto.autoBuildOn === "boolean") s.auto.autoBuildOn = data.auto.autoBuildOn;

    if (typeof data.auto.autoBuildMode === "string") s.auto.autoBuildMode = String(data.auto.autoBuildMode || "prod");

    if (typeof data.auto.autoBallOn === "boolean") s.auto.autoBallOn = data.auto.autoBallOn;

    if (typeof data.auto.autoBallQty === "number" && Number.isFinite(data.auto.autoBallQty)) {

      s.auto.autoBallQty = Math.max(1, Math.floor(data.auto.autoBallQty));

    }

    if (typeof data.auto.autoExchangeOn === "boolean") s.auto.autoExchangeOn = data.auto.autoExchangeOn;

    if (typeof data.auto.autoExchangeLevel === "number" && Number.isFinite(data.auto.autoExchangeLevel)) {

      s.auto.autoExchangeLevel = Math.max(0, Math.min(10, Math.floor(data.auto.autoExchangeLevel)));

    }

    if (typeof data.auto.autoExchangeCarrySec === "number" && Number.isFinite(data.auto.autoExchangeCarrySec)) {

      s.auto.autoExchangeCarrySec = Math.max(0, data.auto.autoExchangeCarrySec);

    }

    const ac = data.auto.autoCraft;

    if (ac && typeof ac === "object") {

      if (typeof ac.evolutionEnergy === "boolean") s.auto.autoCraft.evolutionEnergy = ac.evolutionEnergy;

      if (typeof ac.evolutionStone === "boolean") s.auto.autoCraft.evolutionStone = ac.evolutionStone;

      if (typeof ac.linkRope === "boolean") s.auto.autoCraft.linkRope = ac.linkRope;

      if (typeof ac.hugeBerry === "boolean") s.auto.autoCraft.hugeBerry = ac.hugeBerry;

      if (typeof ac.megaStone === "boolean") s.auto.autoCraft.megaStone = ac.megaStone;

    }

  }



  if (data.research && typeof data.research === "object") {

    const tid = typeof data.research.tid === "string" ? data.research.tid : null;

    const remainingSec =

      typeof data.research.remainingSec === "number" && Number.isFinite(data.research.remainingSec)

        ? data.research.remainingSec

        : null;

    const totalSec =

      typeof data.research.totalSec === "number" && Number.isFinite(data.research.totalSec)

        ? data.research.totalSec

        : remainingSec;



    if (tid && Object.prototype.hasOwnProperty.call(s.tech, tid) && !s.tech[tid] && typeof remainingSec === "number" && remainingSec > 0) {

      s.research = {

        tid,

        remainingSec,

        totalSec: typeof totalSec === "number" && totalSec > 0 ? totalSec : remainingSec,

      };

    }

  }



  if (data.crafting && typeof data.crafting === "object") {

    const legacyType = typeof data.crafting.type === "string" ? data.crafting.type : null;

    const legacyRemainingSec =

      typeof data.crafting.remainingSec === "number" && Number.isFinite(data.crafting.remainingSec)

        ? data.crafting.remainingSec

        : null;

    const legacyTotalSec =

      typeof data.crafting.totalSec === "number" && Number.isFinite(data.crafting.totalSec)

        ? data.crafting.totalSec

        : legacyRemainingSec;



    if (legacyType && typeof legacyRemainingSec === "number" && legacyRemainingSec > 0) {

      const remainingSec = legacyRemainingSec;

      const totalSec = typeof legacyTotalSec === "number" && legacyTotalSec > 0 ? legacyTotalSec : remainingSec;

      const mappedType = legacyType === "evolutionStone" ? "evolutionEnergy" : legacyType;

      s.crafting = {

        evolutionEnergy: mappedType === "evolutionEnergy" ? { remainingSec, totalSec } : null,

        evolutionStone: null,

        linkRope: mappedType === "linkRope" ? { remainingSec, totalSec } : null,

        hugeBerry: null,

        megaStone: null,

      };

    } else {

      const readTask = (k) => {

        const t = data.crafting[k];

        if (!t || typeof t !== "object") return null;

        const remainingSec = typeof t.remainingSec === "number" && Number.isFinite(t.remainingSec) ? t.remainingSec : 0;

        const totalSec = typeof t.totalSec === "number" && Number.isFinite(t.totalSec) ? t.totalSec : remainingSec;

        if (remainingSec <= 0) return null;

        return { remainingSec, totalSec: totalSec > 0 ? totalSec : remainingSec };

      };



      const energy = readTask("evolutionEnergy");

      const evo = readTask("evolutionStone");

      const rope = readTask("linkRope");

      const huge = readTask("hugeBerry");

      const mega = readTask("megaStone");

      if (energy || evo || rope || huge || mega) {

        s.crafting = {

          evolutionEnergy: energy,

          evolutionStone: evo,

          linkRope: rope,

          hugeBerry: huge,

          megaStone: mega,

        };

      }

    }

  }



  s.training = { activeIds: [], slotSize: 0 };

  if (data.training && typeof data.training === "object") {

    const a0 = data.training.activeIds;

    const aid = data.training.activeId;

    const size = data.training.slotSize;

    if (Array.isArray(a0)) {

      s.training.activeIds = a0

        .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : null))

        .filter((x) => typeof x === "number");

    } else if (typeof aid === "number" && Number.isFinite(aid)) {

      s.training.activeIds = [Math.floor(aid)];

    }

    if (typeof size === "number" && Number.isFinite(size)) s.training.slotSize = Math.max(0, Math.floor(size));

  }



  s.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };

  if (data.breeding && typeof data.breeding === "object") {

    if (typeof data.breeding.on === "boolean") s.breeding.on = data.breeding.on;

    const a = data.breeding.aId;

    const b = data.breeding.bId;

    if (typeof a === "number" && Number.isFinite(a)) s.breeding.aId = Math.floor(a);

    if (typeof b === "number" && Number.isFinite(b)) s.breeding.bId = Math.floor(b);

    const er = data.breeding.eggRemainingSec;

    const et = data.breeding.eggTotalSec;

    if (typeof er === "number" && Number.isFinite(er)) s.breeding.eggRemainingSec = Math.max(0, er);

    if (typeof et === "number" && Number.isFinite(et)) s.breeding.eggTotalSec = Math.max(0, et);

  }



  s.expedition = {

    on: false,

    selectedLevel: "basic",

    selectedDungeonKey: null,

    selectedIds: [],

    activeIds: [],

    remainingSec: 0,

    totalSec: 0,

    rewardExp: 0,

    rewardCoin: 0,

    rewardPotionTotal: 0,

    dungeonType: null,

    dungeons: null,

  };

  if (data.expedition && typeof data.expedition === "object") {

    if (typeof data.expedition.on === "boolean") s.expedition.on = data.expedition.on;

    if (typeof data.expedition.selectedLevel === "string") s.expedition.selectedLevel = String(data.expedition.selectedLevel || "basic");

    if (typeof data.expedition.selectedDungeonKey === "string") s.expedition.selectedDungeonKey = String(data.expedition.selectedDungeonKey || "");



    const sel = data.expedition.selectedIds;

    const act = data.expedition.activeIds;

    if (Array.isArray(sel)) {

      s.expedition.selectedIds = sel

        .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : null))

        .filter((x) => typeof x === "number");

    }

    if (Array.isArray(act)) {

      s.expedition.activeIds = act

        .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : null))

        .filter((x) => typeof x === "number");

    }



    const rem = data.expedition.remainingSec;

    const tot = data.expedition.totalSec;

    if (typeof rem === "number" && Number.isFinite(rem)) s.expedition.remainingSec = Math.max(0, rem);

    if (typeof tot === "number" && Number.isFinite(tot)) s.expedition.totalSec = Math.max(0, tot);



    const rx = data.expedition.rewardExp;

    const rc = data.expedition.rewardCoin;

    const rp = data.expedition.rewardPotionTotal;

    if (typeof rx === "number" && Number.isFinite(rx)) s.expedition.rewardExp = Math.max(0, Math.floor(rx));

    if (typeof rc === "number" && Number.isFinite(rc)) s.expedition.rewardCoin = Math.max(0, Math.floor(rc));

    if (typeof rp === "number" && Number.isFinite(rp)) s.expedition.rewardPotionTotal = Math.max(0, Math.floor(rp));



    if (typeof data.expedition.dungeonType === "string") s.expedition.dungeonType = String(data.expedition.dungeonType || "");

    if (data.expedition.dungeons && typeof data.expedition.dungeons === "object") s.expedition.dungeons = data.expedition.dungeons;

  }



  if (data.dex && typeof data.dex === "object") {

    const caught = data.dex.caught;

    if (caught && typeof caught === "object") {

      s.dex.caught = {};

      for (const [k, v] of Object.entries(caught)) {

        if (typeof v !== "number" || v <= 0) continue;

        const count = Math.floor(v);

        if (k.startsWith("p")) {

          s.dex.caught[k] = (s.dex.caught[k] ?? 0) + count;

          continue;

        }



        const mapped = legacyIdMap[k];

        if (mapped) s.dex.caught[mapped] = (s.dex.caught[mapped] ?? 0) + count;

      }

    }

  }



  s.log = Array.isArray(data.log) ? data.log.slice(0, 30) : [];



  if (data.mons && typeof data.mons === "object") {

    const nextId = data.mons.nextId;

    const list = data.mons.list;

    if (typeof nextId === "number" && Number.isFinite(nextId)) s.mons.nextId = Math.max(1, Math.floor(nextId));

    if (Array.isArray(list)) {

      const out = [];

      for (const it of list) {

        if (!it || typeof it !== "object") continue;

        if (typeof it.id !== "number" || !Number.isFinite(it.id)) continue;

        const pid = typeof it.pid === "string" ? it.pid : null;

        if (!pid || !pid.startsWith("p")) continue;

        const dex = typeof it.dex === "number" && Number.isFinite(it.dex) ? Math.floor(it.dex) : null;

        const lvl = typeof it.lvl === "number" && Number.isFinite(it.lvl) ? clamp(Math.floor(it.lvl), 1, 100) : 1;

        const exp = typeof it.exp === "number" && Number.isFinite(it.exp) ? Math.max(0, Math.floor(it.exp)) : 0;

        const isShiny = Boolean(it.isShiny);

        const satiety = typeof it.satiety === "number" && Number.isFinite(it.satiety) ? clamp(it.satiety, 0, 100) : 100;

        const affection =

          typeof it.affection === "number" && Number.isFinite(it.affection) ? clamp(it.affection, 0, 100) : 0;

        const stars = clampStar(it.stars);

        const autoExpCarry =

          typeof it.autoExpCarry === "number" && Number.isFinite(it.autoExpCarry) ? Math.max(0, it.autoExpCarry) : 0;

        const affectionCarry =

          typeof it.affectionCarry === "number" && Number.isFinite(it.affectionCarry)

            ? Math.max(0, it.affectionCarry)

            : 0;

        const affectionDecayCarry =

          typeof it.affectionDecayCarry === "number" && Number.isFinite(it.affectionDecayCarry)

            ? Math.max(0, it.affectionDecayCarry)

            : 0;

        const affectionHighDecayCarry =

          typeof it.affectionHighDecayCarry === "number" && Number.isFinite(it.affectionHighDecayCarry)

            ? Math.max(0, it.affectionHighDecayCarry)

            : 0;

        const skillCdRemainingSec =

          typeof it.skillCdRemainingSec === "number" && Number.isFinite(it.skillCdRemainingSec)

            ? Math.max(0, it.skillCdRemainingSec)

            : 0;

        const skillActiveType = typeof it.skillActiveType === "string" && it.skillActiveType ? it.skillActiveType : null;

        const skillActiveRemainingSec =

          typeof it.skillActiveRemainingSec === "number" && Number.isFinite(it.skillActiveRemainingSec)

            ? Math.max(0, it.skillActiveRemainingSec)

            : 0;

        const baseStats = it.baseStats && typeof it.baseStats === "object" ? it.baseStats : null;

        const iv = it.iv && typeof it.iv === "object" ? it.iv : null;

        const statBonus0 = it.statBonus && typeof it.statBonus === "object" ? it.statBonus : null;

        const statBonus = {

          hp: typeof statBonus0?.hp === "number" && Number.isFinite(statBonus0.hp) ? Math.floor(statBonus0.hp) : 0,

          atk: typeof statBonus0?.atk === "number" && Number.isFinite(statBonus0.atk) ? Math.floor(statBonus0.atk) : 0,

          def: typeof statBonus0?.def === "number" && Number.isFinite(statBonus0.def) ? Math.floor(statBonus0.def) : 0,

          spa: typeof statBonus0?.spa === "number" && Number.isFinite(statBonus0.spa) ? Math.floor(statBonus0.spa) : 0,

          spd: typeof statBonus0?.spd === "number" && Number.isFinite(statBonus0.spd) ? Math.floor(statBonus0.spd) : 0,

          spe: typeof statBonus0?.spe === "number" && Number.isFinite(statBonus0.spe) ? Math.floor(statBonus0.spe) : 0,

        };

        const created = typeof it.created === "number" && Number.isFinite(it.created) ? it.created : nowMs();

        if (!dex) continue;

        if (!baseStats || !iv) continue;

        out.push({

          id: Math.floor(it.id),

          pid,

          dex,

          name: typeof it.name === "string" ? it.name : `宝可梦${pad3(dex)}`,

          tier: typeof it.tier === "string" ? it.tier : "common",

          isShiny,

          lvl,

          exp,

          satiety,

          affection,

          stars,

          autoExpCarry,

          affectionCarry,

          affectionDecayCarry,

          affectionHighDecayCarry,

          skillCdRemainingSec,

          skillActiveType,

          skillActiveRemainingSec,

          baseStats,

          iv,

          statBonus,

          created,

        });

      }

      s.mons.list = out;

      if (out.length > 0) {

        const maxId = Math.max(...out.map((x) => x.id));

        s.mons.nextId = Math.max(s.mons.nextId, maxId + 1);

      }

    }

  } else {

    // 老存档迁移：如果之前只有 dex.caught，则生成少量精灵实例用于展示

    const caught = data.dex?.caught;

    if (caught && typeof caught === "object") {

      const entries = Object.entries(caught)

        .map(([k, v]) => [String(k), typeof v === "number" ? Math.floor(v) : 0])

        .filter(([, v]) => v > 0);



      let createdCount = 0;

      for (const [k, v] of entries) {

        const pid = k.startsWith("p") ? k : legacyIdMap[k];

        if (!pid) continue;

        const p = pokemon.find((x) => x.id === pid);

        if (!p) continue;

        const n = Math.min(v, 10);

        for (let i = 0; i < n; i += 1) {

          if (createdCount >= 200) break;

          const mon = createMonInstance0(p, {

            idOverride: s.mons.nextId,

            idFallback: s.mons.nextId,

          });

          s.mons.list.push(mon);

          s.mons.nextId += 1;

          createdCount += 1;

        }

        if (createdCount >= 200) break;

      }

    }

  }



  // 兼容旧存档：如果精灵是通过进化/解锁获得，但 dex.caught 没记录，则用现有精灵列表补登记

  if (!s.dex || typeof s.dex !== "object") s.dex = { caught: {} };

  if (!s.dex.caught || typeof s.dex.caught !== "object") s.dex.caught = {};

  if (s.mons && Array.isArray(s.mons.list)) {

    for (const m of s.mons.list) {

      const pid = m && typeof m.pid === "string" ? m.pid : null;

      if (!pid || !pid.startsWith("p")) continue;

      const prev = typeof s.dex.caught[pid] === "number" ? s.dex.caught[pid] : 0;

      if (prev <= 0) s.dex.caught[pid] = 1;

    }

  }



  if (data.rng && typeof data.rng === "object") {

    const cf = data.rng.catchFails;

    if (typeof cf === "number" && Number.isFinite(cf)) {

      s.rng.catchFails = clamp(Math.floor(cf), 0, 999);

    }

  }



  // 恢复游戏总时长
  if (typeof data.totalPlayMs === "number" && Number.isFinite(data.totalPlayMs)) {
    s.totalPlayMs = Math.max(0, Math.floor(data.totalPlayMs));
  }

  // 恢复每日签到数据

  if (data.dailySignin && typeof data.dailySignin === "object") {

    if (typeof data.dailySignin.lastSigninDate === "string") {

      s.dailySignin.lastSigninDate = data.dailySignin.lastSigninDate;

    }

    if (typeof data.dailySignin.consecutiveDays === "number" && Number.isFinite(data.dailySignin.consecutiveDays)) {

      s.dailySignin.consecutiveDays = Math.max(0, Math.floor(data.dailySignin.consecutiveDays));

    }

    if (typeof data.dailySignin.totalDays === "number" && Number.isFinite(data.dailySignin.totalDays)) {

      s.dailySignin.totalDays = Math.max(0, Math.floor(data.dailySignin.totalDays));

    }

    if (typeof data.dailySignin.claimed === "boolean") {

      s.dailySignin.claimed = data.dailySignin.claimed;

    }

  }



  // 恢复月卡数据

  if (data.monthlyCard && typeof data.monthlyCard === "object") {

    if (typeof data.monthlyCard.active === "boolean") {

      s.monthlyCard.active = data.monthlyCard.active;

    }

    if (typeof data.monthlyCard.expiresAt === "number" && Number.isFinite(data.monthlyCard.expiresAt)) {

      s.monthlyCard.expiresAt = Math.max(0, Math.floor(data.monthlyCard.expiresAt));

    }

    if (typeof data.monthlyCard.lastClaimDate === "string") {

      s.monthlyCard.lastClaimDate = data.monthlyCard.lastClaimDate;

    }

    if (typeof data.monthlyCard.totalClaimed === "number" && Number.isFinite(data.monthlyCard.totalClaimed)) {

      s.monthlyCard.totalClaimed = Math.max(0, Math.floor(data.monthlyCard.totalClaimed));

    }

  }



  // 恢复每日任务数据

  if (data.dailyTasks && typeof data.dailyTasks === "object") {

    if (typeof data.dailyTasks.lastResetDate === "string") {

      s.dailyTasks.lastResetDate = data.dailyTasks.lastResetDate;

    }

    if (Array.isArray(data.dailyTasks.tasks)) {

      s.dailyTasks.tasks = data.dailyTasks.tasks.filter((t) => 

        t && typeof t === "object" && 

        typeof t.id === "string" && 

        typeof t.type === "string" && 

        typeof t.current === "number" && 

        typeof t.target === "number"

      );

    }

    if (typeof data.dailyTasks.claimed === "boolean") {

      s.dailyTasks.claimed = data.dailyTasks.claimed;

    }

  }



  // 恢复 PvE 数据

  if (data.pve && typeof data.pve === "object") {

    if (data.pve.progress && typeof data.pve.progress === "object") {

      s.pve.progress = {};

      for (const [k, v] of Object.entries(data.pve.progress)) {

        if (typeof k === "string" && v) s.pve.progress[k] = v;

      }

    }

    if (typeof data.pve.dailyAttempts === "number" && Number.isFinite(data.pve.dailyAttempts)) {

      s.pve.dailyAttempts = Math.max(0, Math.floor(data.pve.dailyAttempts));

    }

    if (typeof data.pve.dailyResetDate === "string") {

      s.pve.dailyResetDate = data.pve.dailyResetDate;

    }

    if (Array.isArray(data.pve.selectedIds)) {

      s.pve.selectedIds = data.pve.selectedIds

        .map((x) => (typeof x === "number" && Number.isFinite(x) ? x : null))

        .filter((x) => typeof x === "number");

    }

  }



  return s;

}

