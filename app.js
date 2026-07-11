import { legacyIdMap, pokemon, getPokemonTier } from "./modules/pokemon_defs.js";
import { EXTRA_TECH_DEFS, EXTRA_TECH_FLAGS } from "./modules/tech_defs.js?v=0.39.9";
import { RESOURCE_DEFS } from "./modules/defs_resources.js?v=0.39.9";
import { BUILDING_DEFS } from "./modules/defs_buildings.js?v=0.39.9";
import { renderPokemonIcon, installSpriteHandlers } from "./modules/sprites.js?v=0.39.9";
import { BASE_TECH_FLAGS, defaultState, serializeState, loadFromRaw, safeJsonParse, BUILDING_MAX_LEVEL } from "./modules/state.js?v=0.39.9";
import { createPokeApiClient } from "./modules/pokeapi_client.js";
import { defaultReqLvlByStage, getEvoMap, getEvoReqLevel, isAffectionEvo, isTradeEvo, stageIndex } from "./modules/evo_utils.js?v=0.39.9";
import { clamp, escapeHtml, fmt, nowMs, pad3, randFloat } from "./modules/utils.js";
import { decodeSaveText, encodeSaveText } from "./modules/save_codec.js";
import { createCloudSave } from "./modules/cloud_save.js";
import { clampStar, getStarBonusMul, getStarUpgradeNeed, getStarUpgradeGate, meetsStarUpgradeGate, renderStars } from "./modules/stars.js?v=0.39.9";
import { addExpToMon as addExpToMon0, createMonInstance as createMonInstance0, evolveMon as evolveMon0, expNeedForLevel as expNeedForLevel0, getMonCurrentStats as getMonCurrentStats0, monPower as monPower0, getNatureInfo, NATURE_PASSIVE } from "./modules/mons.js";
import { initGuideSystem } from "./modules/guide.js";
import { createTabBadgeSystem } from "./modules/tab_badges.js";
import { createTick } from "./modules/tick.js?v=0.39.9";
import { createRenderResources } from "./modules/render/resources.js?v=0.39.9";
import { createRenderLog } from "./modules/render/log.js?v=0.39.9";
import { createRenderBuildings } from "./modules/render/buildings.js?v=0.39.9";
import { createRenderTech } from "./modules/render/tech.js?v=0.39.9";
import { createRenderCapture } from "./modules/render/capture.js?v=0.39.9";
import { createRenderMons } from "./modules/render/mons.js?v=0.39.9";
import { createRenderDex } from "./modules/render/dex.js?v=0.39.9";
import { createRenderFutureShop } from "./modules/render/future.js?v=0.39.9";
import { TYPE_SKILLS } from "./modules/type_skills.js?v=0.39.9";
import { createDailySignin } from "./modules/daily_signin.js";
import { createMonthlyCard } from "./modules/monthly_card.js";
import { createDailyTasks } from "./modules/daily_tasks.js";
import { initDexTab } from "./modules/tabs/dex_tab.js?v=0.39.9";
import { initBuildingsTab } from "./modules/tabs/buildings_tab.js?v=0.39.9";
import { initTechTab } from "./modules/tabs/tech_tab.js?v=0.39.9";
import { initFutureTab } from "./modules/tabs/future_tab.js?v=0.39.9";
import { createRenderBonfireActions, initBonfireTab } from "./modules/tabs/bonfire_tab.js?v=0.39.9";
import { initCaptureTab } from "./modules/tabs/capture_tab.js?v=0.39.9";
import { initMonsTab } from "./modules/tabs/mons_tab.js?v=0.39.9";
import { createRenderItems } from "./modules/tabs/items_tab.js?v=0.39.9";
import { createItemUsage } from "./modules/item_usage.js";
import { createTabController } from "./modules/tabs/tabs_controller.js?v=0.39.9";
import { createRenderDailyTasks } from "./modules/render/daily_tasks.js";
import { createRenderFunctions, initFunctionsTab } from "./modules/tabs/functions_tab.js";
import { getExpLevelDef } from "./modules/expedition_defs.js";
import { expeditionTypeMul } from "./modules/systems/expedition.js";
import {
  dexCaughtCount as dexCaughtCount0,
  computeDexEffects as computeDexEffects0,
  computeTechEffects as computeTechEffects0,
  getBuildingCost as getBuildingCost0,
  getResearchCost as getResearchCost0,
  computeResearchTimeSec as computeResearchTimeSec0,
  getResearchEfficiency as getResearchEfficiency0,
  getPokeballMakeCost as getPokeballMakeCost0,
} from "./modules/systems/effects.js";
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
} from "./modules/systems/production.js";
import { createCaptureSystem } from "./modules/app/capture_system.js";
import { createTickerSystem } from "./modules/app/ticker.js";
import { createRenderPve } from "./modules/tabs/pve_tab.js";
import { createFriendsSystem, createRenderFriends } from "./modules/friends.js";
import { createSocialSystem } from "./modules/social.js";
import { createRenderSocial } from "./modules/render/social.js";
import { createRenderLeaderboard } from "./modules/render/leaderboard.js";
import { initLeaderboardTab } from "./modules/tabs/leaderboard_tab.js?v=0.39.9";
import { createBossBullySystem } from "./modules/app/boss_bully.js?v=0.39.9";
import {
  SERVER_BUFF_KEYS,
  SERVER_BUFF_BUY_MAX_MINUTES,
  SERVER_BUFF_UI,
  getServerBuffLevel as getServerBuffLevel0,
  serverBuffPct as serverBuffPct0,
  serverBuffMul as serverBuffMul0,
  serverBuffResearchTimeMul as serverBuffResearchTimeMul0,
  serverBuffEffectText as serverBuffEffectText0,
} from "./modules/systems/server_buffs.js?v=0.39.9";
import { createSocialTab } from "./modules/tabs/social_tab.js";
import { createRenderHelp } from "./modules/tabs/help_tab.js";
import { createPvpBattle } from "./modules/pvp_battle.js";
import { setupGlobalErrorHandling } from "./modules/error_handler.js";

(() => {
  setupGlobalErrorHandling();

  const STORAGE_KEY = "kittens_mvp_save_v1";
  // ===== SECTION:STORAGE_CONSTANTS — 存档键名常量/localStorage工具 =====
  const STORAGE_BACKUP_KEY = `${STORAGE_KEY}_bak`;
  const SAVE_SLOT_KEY = "kittens_mvp_save_slot_1";
  const DAILY_LOGIN_REWARD_KEY = "kittens_mvp_daily_login_reward_v1";

  function readLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }

  // ===== SECTION:UTILS — 工具函数 formatLocalYmd等 =====
  function formatLocalYmd(t = nowMs()) {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  // ===== SECTION:DEFS_AND_BALANCE — defs定义 + 建筑/科技平衡参数 — 维护者窗口A =====

  installSpriteHandlers();

  try {
    const STYLE_GUARD_KEY = "kittens_mvp_style_fix_v1";
    const isMobile = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 980px)").matches : false;
    const ua = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
    const isWeChat = /micromessenger/i.test(ua);
    const already = typeof window.sessionStorage !== "undefined" ? window.sessionStorage.getItem(STYLE_GUARD_KEY) : null;
    if (isMobile && isWeChat && !already) {
      const probe = document.createElement("button");
      probe.className = "logFab";
      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      probe.style.top = "-9999px";
      (document.body || document.documentElement).appendChild(probe);
      const pos = window.getComputedStyle(probe).position;
      probe.remove();
      if (pos !== "fixed") {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `./styles.css?cb=${Date.now()}`;
        document.head.appendChild(link);
      }
      try {
        window.sessionStorage.setItem(STYLE_GUARD_KEY, "1");
      } catch {
      }
    }
  } catch {
  }

  const TYPE_ZH = globalThis.TYPE_ZH;

  const pokeApi = createPokeApiClient({
    onUpdate: () => {
      if (ui.activeTab === "mons") {
        markMonsDirty();
        render();
      }
    },
  });

  const getPokeApiDataByDex = pokeApi.getPokeApiDataByDex;

  const defs = {
    resources: RESOURCE_DEFS,
    legacyIdMap,
    pokemon,
    tech: {
      berryCultivation: {
        name: "树果培育",
        desc: "树果产量 +50%，树果上限 +25。",
        cost: { catnip: 30 },
        prereq: [],
        req: () => true,
        effects: {
          catnipPerSecMul: 1.5,
          capCatnipAdd: 25,
        },
      },
      composting: {
        name: "堆肥技术",
        desc: "树果产量 +20%，树果上限 +30。",
        cost: { catnip: 60 },
        prereq: ["berryCultivation"],
        req: () => true,
        effects: {
          catnipPerSecMul: 1.2,
          capCatnipAdd: 30,
        },
      },
      irrigation: {
        name: "灌溉改良",
        desc: "树果产量 +25%，树果上限 +40。",
        cost: { catnip: 120 },
        prereq: ["composting"],
        req: (state) => state.buildings.field.owned >= 3,
        effects: {
          catnipPerSecMul: 1.25,
          capCatnipAdd: 40,
        },
      },
      greenhouse: {
        name: "温室栽培",
        desc: "树果产量 +35%，树果上限 +80。",
        cost: { catnip: 300, wood: 40 },
        prereq: ["irrigation"],
        req: (state) => state.buildings.hut.owned >= 2,
        effects: {
          catnipPerSecMul: 1.35,
          capCatnipAdd: 80,
        },
      },
      backpackWeaving: {
        name: "背包编织",
        desc: "树果上限 +60。",
        cost: { catnip: 90 },
        prereq: ["berryCultivation"],
        req: () => true,
        effects: {
          capCatnipAdd: 60,
        },
      },
      campLogistics: {
        name: "营地后勤",
        desc: "营地建筑成本 -3%，球果上限 +30。",
        cost: { catnip: 140, wood: 10 },
        prereq: ["backpackWeaving"],
        req: (state) => state.buildings.hut.owned > 0,
        effects: {
          buildingCostMul: 0.97,
          capWoodAdd: 30,
        },
      },
      trainerDrills: {
        name: "训练家操练",
        desc: "树果/球果/碎片产量 +10%。",
        cost: { catnip: 160 },
        prereq: ["campLogistics"],
        req: () => true,
        effects: {
          catnipPerSecMul: 1.1,
          woodRateMul: 1.1,
          mineralsRateMul: 1.1,
        },
      },
      pokeballBasics: {
        name: "精灵球基础",
        desc: "营地建筑成本 -5%，并解锁精灵球制作与捕捉。",
        // After TECH researchCostMul(~2): ~40 catnip — reachable after a short gather burst
        cost: { catnip: 20 },
        prereq: [],
        req: () => true,
        timeSec: 5,
        effects: {
          buildingCostMul: 0.95,
          catchChanceAdd: 0.02,
        },
      },
      ballMolds: {
        name: "球壳模具",
        desc: "捕捉成功率 +1%。",
        cost: { catnip: 180, wood: 40 },
        prereq: ["pokeballBasics"],
        req: (state) => state.buildings.hut.owned > 0,
        effects: {
          catchChanceAdd: 0.01,
        },
      },
      apricornCrafting: {
        name: "球果工艺",
        desc: "捕捉成功率 +4%。",
        cost: { catnip: 250, wood: 80 },
        prereq: ["ballMolds"],
        req: (state) => state.buildings.hut.owned >= 2,
        effects: {
          catchChanceAdd: 0.04,
        },
      },
      reinforcedBalls: {
        name: "加固球壳",
        desc: "捕捉成功率 +6%。",
        cost: { catnip: 400, wood: 140, minerals: 30 },
        prereq: ["apricornCrafting"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          catchChanceAdd: 0.06,
        },
      },
      captureTraining: {
        name: "捕捉训练",
        desc: "捕捉成功率 +6%。",
        cost: { catnip: 600, wood: 180, minerals: 60 },
        prereq: ["reinforcedBalls"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          catchChanceAdd: 0.06,
        },
      },
      fieldResearch: {
        name: "野外观察",
        desc: "球果与进化石碎片产量 +100%，并提升对应上限。",
        cost: { catnip: 200, wood: 30 },
        prereq: ["pokeballBasics"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          woodRateMul: 2,
          mineralsRateMul: 2,
          capWoodAdd: 50,
          capMineralsAdd: 40,
          catchChanceAdd: 0.05,
        },
      },
      fieldGuide: {
        name: "野外手册",
        desc: "球果与进化石碎片产量 +25%，并提升对应上限。",
        cost: { catnip: 350, wood: 60 },
        prereq: ["fieldResearch"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          woodRateMul: 1.25,
          mineralsRateMul: 1.25,
          capWoodAdd: 80,
          capMineralsAdd: 60,
        },
      },
      mineralSurvey: {
        name: "矿脉勘测",
        desc: "进化石碎片产量 +35%，碎片上限 +60。",
        cost: { wood: 100, minerals: 40 },
        prereq: ["fieldGuide"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          mineralsRateMul: 1.35,
          capMineralsAdd: 60,
        },
      },
      excavationTools: {
        name: "挖掘工具",
        desc: "进化石碎片产量 +40%，碎片上限 +80。",
        cost: { wood: 180, minerals: 90 },
        prereq: ["mineralSurvey"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          mineralsRateMul: 1.4,
          capMineralsAdd: 80,
        },
      },
      refining: {
        name: "精炼处理",
        desc: "进化石碎片产量 +20%，球果产量 +15%，碎片上限 +120。",
        cost: { wood: 260, minerals: 160 },
        prereq: ["excavationTools"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          mineralsRateMul: 1.2,
          woodRateMul: 1.15,
          capMineralsAdd: 120,
        },
      },
      oreStorage: {
        name: "储矿箱",
        desc: "球果上限 +120，进化石碎片上限 +200。",
        cost: { wood: 220, minerals: 180 },
        prereq: ["refining"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          capWoodAdd: 120,
          capMineralsAdd: 200,
        },
      },
      carpentry: {
        name: "木工训练",
        desc: "球果产量 +30%，球果上限 +80。",
        cost: { catnip: 220, wood: 60 },
        prereq: ["campLogistics"],
        req: (state) => state.buildings.hut.owned > 0,
        effects: {
          woodRateMul: 1.3,
          capWoodAdd: 80,
        },
      },
      sawmillPlans: {
        name: "锯木坊图纸",
        desc: "球果产量 +45%，球果上限 +160。",
        cost: { catnip: 500, wood: 200, minerals: 80 },
        prereq: ["carpentry"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          woodRateMul: 1.45,
          capWoodAdd: 160,
        },
      },
      supplyLines: {
        name: "补给线",
        desc: "树果/球果/碎片上限全面提升。",
        cost: { catnip: 800, wood: 300, minerals: 200 },
        prereq: ["sawmillPlans"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          capCatnipAdd: 120,
          capWoodAdd: 160,
          capMineralsAdd: 160,
        },
      },
      efficientConstruction: {
        name: "高效建造",
        desc: "营地建筑成本 -8%。",
        cost: { catnip: 1200, wood: 450, minerals: 300 },
        prereq: ["supplyLines"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          buildingCostMul: 0.92,
        },
      },
      advancedGear: {
        name: "高级装备",
        desc: "树果产量 +25%，并提升全部上限。",
        cost: { catnip: 900, wood: 250, minerals: 150 },
        prereq: ["efficientConstruction"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          catnipPerSecMul: 1.25,
          capCatnipAdd: 60,
          capWoodAdd: 120,
          capMineralsAdd: 90,
          catchChanceAdd: 0.05,
        },
      },
      researchMethod: {
        name: "研究方法",
        desc: "树果/球果/碎片产量 +15%。",
        cost: { catnip: 1500, wood: 600, minerals: 400 },
        prereq: ["advancedGear"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          catnipPerSecMul: 1.15,
          woodRateMul: 1.15,
          mineralsRateMul: 1.15,
        },
      },
      ultraStorage: {
        name: "超大容量仓储",
        desc: "大幅提升所有资源上限。",
        cost: { catnip: 2500, wood: 900, minerals: 700 },
        prereq: ["researchMethod"],
        req: (state) => state.buildings.workshop.owned > 0,
        effects: {
          capCatnipAdd: 300,
        },
      },
      ...EXTRA_TECH_DEFS,
    },
    buildings: BUILDING_DEFS,
  };

  // 建筑平衡系数已预乘到 defs_buildings.js，此处全部设为1.0（rebalanceBuildingDefs变为无操作）
  const BUILDING_BALANCE = {
    costMul: 1.0,
    prodMul: 1.0,
    capAddMul: 1.0,
  };

  function rebalanceBuildingDefs() {
    const scaleCost = (cost) => {
      const out = {};
      for (const [rid, v] of Object.entries(cost ?? {})) {
        if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue;
        out[rid] = Math.max(1, Math.floor(v * BUILDING_BALANCE.costMul));
      }
      return out;
    };

    const scalePerSec = (v) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return v;
      const x = v * BUILDING_BALANCE.prodMul;
      return Math.round(x * 10000) / 10000;
    };

    const scaleCapAdd = (v) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return v;
      return Math.max(0, Math.floor(v * BUILDING_BALANCE.capAddMul));
    };

    for (const b of Object.values(defs.buildings ?? {})) {
      if (!b || typeof b !== "object") continue;

      if (b.baseCost && typeof b.baseCost === "object") {
        b.baseCost = scaleCost(b.baseCost);
      }

      if (typeof b.effects === "function") {
        const old = b.effects;
        b.effects = (state) => {
          const e0 = old(state);
          if (!e0 || typeof e0 !== "object") return e0;
          const e = { ...e0 };
          for (const [k, v] of Object.entries(e)) {
            if (typeof v !== "number" || !Number.isFinite(v)) continue;
            if (k.endsWith("PerSec")) e[k] = scalePerSec(v);
            else if (k.startsWith("cap") && k.endsWith("Add")) e[k] = scaleCapAdd(v);
          }
          return e;
        };
      }
    }
  }

  const TECH_BALANCE = {
    researchCostMul: 2,
    prodMulNerf: 0.7,
    woodProdMulNerf: 0.35,
    capAddBuff: 1.25,
  };

  function rebalanceTechDefs() {
    const scaleCost = (cost) => {
      const out = {};
      for (const [rid, v] of Object.entries(cost ?? {})) {
        if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue;
        out[rid] = Math.ceil(v * TECH_BALANCE.researchCostMul);
      }
      return out;
    };

    const nerfMul = (v) => 1 + (v - 1) * TECH_BALANCE.prodMulNerf;
    const nerfMulWood = (v) => 1 + (v - 1) * TECH_BALANCE.woodProdMulNerf;
    const CAP_ADD_KEYS = ["capCatnipAdd", "capWoodAdd", "capMineralsAdd", "capPokeballAdd"];
    const CAP_TO_MUL = {
      capCatnipAdd: "capCatnipMul",
      capWoodAdd: "capWoodMul",
      capMineralsAdd: "capMineralsMul",
      capPokeballAdd: "capPokeballMul",
    };
    const CAP_DENOM = {
      capCatnipAdd: 400,
      capWoodAdd: 500,
      capMineralsAdd: 600,
      capPokeballAdd: 1200,
    };
    const CAP_MUL_MAX = {
      capCatnipMul: 6,
      capWoodMul: 6,
      capMineralsMul: 6,
      capPokeballMul: 3,
    };
    const PROD_KEYS = ["catnipPerSecMul", "woodRateMul", "mineralsRateMul"];

    const pctFromMul = (mul) => Math.round((mul - 1) * 100);
    const adjustDesc = (desc, eff) => {
      if (typeof desc !== "string") return desc;
      if (!desc.includes("%") && !desc.includes("上限")) return desc;
      let d = desc;

      const c = typeof eff.catnipPerSecMul === "number" && Number.isFinite(eff.catnipPerSecMul) ? eff.catnipPerSecMul : null;
      const w = typeof eff.woodRateMul === "number" && Number.isFinite(eff.woodRateMul) ? eff.woodRateMul : null;
      const m = typeof eff.mineralsRateMul === "number" && Number.isFinite(eff.mineralsRateMul) ? eff.mineralsRateMul : null;

      if (c) d = d.replace(/树果产量\s*\+\s*\d+%/g, `树果产量 +${pctFromMul(c)}%`);
      if (w) d = d.replace(/球果产量\s*\+\s*\d+%/g, `球果产量 +${pctFromMul(w)}%`);
      if (m) d = d.replace(/(进化石碎片|碎片)产量\s*\+\s*\d+%/g, `$1产量 +${pctFromMul(m)}%`);

      if (c && w && m && pctFromMul(c) === pctFromMul(w) && pctFromMul(w) === pctFromMul(m)) {
        const p = pctFromMul(c);
        d = d.replace(/树果\s*\/\s*球果\s*\/\s*碎片产量\s*\+\s*\d+%/g, `树果/球果/碎片产量 +${p}%`);
      }

      if (w && m && pctFromMul(w) === pctFromMul(m)) {
        const p = pctFromMul(w);
        d = d.replace(/球果与进化石碎片产量\s*\+\s*\d+%/g, `球果与进化石碎片产量 +${p}%`);
      }

      const cCap = typeof eff.capCatnipMul === "number" && Number.isFinite(eff.capCatnipMul) ? eff.capCatnipMul : null;
      const wCap = typeof eff.capWoodMul === "number" && Number.isFinite(eff.capWoodMul) ? eff.capWoodMul : null;
      const mCap = typeof eff.capMineralsMul === "number" && Number.isFinite(eff.capMineralsMul) ? eff.capMineralsMul : null;
      const pCap = typeof eff.capPokeballMul === "number" && Number.isFinite(eff.capPokeballMul) ? eff.capPokeballMul : null;

      if (cCap) d = d.replace(/树果上限\s*\+\s*\d+/g, `树果上限 +${pctFromMul(cCap)}%`);
      if (wCap) d = d.replace(/球果上限\s*\+\s*\d+/g, `球果上限 +${pctFromMul(wCap)}%`);
      if (mCap) d = d.replace(/(进化石碎片|碎片)上限\s*\+\s*\d+/g, `$1上限 +${pctFromMul(mCap)}%`);
      if (pCap) d = d.replace(/精灵球上限\s*\+\s*\d+/g, `精灵球上限 +${pctFromMul(pCap)}%`);

      return d;
    };

    for (const tdef of Object.values(defs.tech ?? {})) {
      if (!tdef || typeof tdef !== "object") continue;
      tdef.cost = scaleCost(tdef.cost ?? {});
      const eff0 = tdef.effects ?? {};
      const eff = { ...eff0 };
      for (const k of PROD_KEYS) {
        if (typeof eff[k] !== "number" || !Number.isFinite(eff[k])) continue;
        if (k === "woodRateMul") eff[k] = nerfMulWood(eff[k]);
        else eff[k] = nerfMul(eff[k]);
      }
      for (const k of CAP_ADD_KEYS) {
        if (typeof eff[k] !== "number" || !Number.isFinite(eff[k])) continue;
        const mulKey = CAP_TO_MUL[k];
        const denom = CAP_DENOM[k] ?? 600;
        const capMax = CAP_MUL_MAX[mulKey] ?? 6;
        const add = eff[k] * TECH_BALANCE.capAddBuff;
        const mul = 1 + add / denom;
        eff[mulKey] = Math.min(capMax, (typeof eff[mulKey] === "number" && Number.isFinite(eff[mulKey]) ? eff[mulKey] : 1) * mul);
        delete eff[k];
      }
      tdef.effects = eff;
      if (typeof tdef.desc === "string") tdef.desc = adjustDesc(tdef.desc, eff);
    }
  }
  // ===== SECTION:STATE_INIT — state初始化/存档加载/迁移 — 维护者窗口A =====

  rebalanceBuildingDefs();
  rebalanceTechDefs();

  delete defs.buildings.sawmill;
  delete defs.buildings.greenhouse;
  delete defs.buildings.mine;
  delete defs.buildings.refinery;
  delete defs.buildings.oreWarehouse;
  delete defs.buildings.supplyDepot;
  delete defs.buildings.library;
  delete defs.buildings.archive;
  delete defs.buildings.warehouse;
  delete defs.buildings.commandCenter;

  // 迁移：根据最新 capture_rate 规则，重算所有已存在精灵实例的稀有度
  function migrateMonTiers() {
    if (!state || !state.mons || !Array.isArray(state.mons.list)) return;
    for (const m of state.mons.list) {
      if (!m || typeof m.dex !== "number") continue;
      try {
        m.tier = getPokemonTier(m.dex);
      } catch {
        // 保底：如果计算失败，维持原 tier
      }
    }
  }

  // 统一存档加载：主存档 → 备份存档 → 新存档（并标记禁止自动覆盖）
  let autosaveEnabled = true;
  let state;
  const __rawPrimary = readLocalStorage(STORAGE_KEY);
  if (__rawPrimary) {
    const __s = loadFromRaw(decodeSaveText(__rawPrimary));
    if (__s) {
      state = __s;
    } else {
      const __rawBak = readLocalStorage(STORAGE_BACKUP_KEY);
      const __sBak = __rawBak ? loadFromRaw(decodeSaveText(__rawBak)) : null;
      if (__sBak) {
        state = __sBak;
      } else {
        // 主存档和备份均损坏，禁止自动存档以防覆盖
        autosaveEnabled = false;
        state = defaultState();
      }
    }
  } else {
    // 首次访问，创建新存档
    state = defaultState();
  }

  migrateMonTiers();

  // 确保所有道具资源都存在（兼容旧存档）
  const ensureResources = [
    "expCandy", "expCandyL", "expCandyXL",
    "ultraball", "quickball", "luxuryball",
    "affectionTreat", "friendshipBracelet",
    "shinyCharm", "luckyEgg",
    "bottleCap", "goldBottleCap"
  ];
  if (!state.res) state.res = {};
  for (const rid of ensureResources) {
    if (!state.res[rid] || typeof state.res[rid] !== "object") {
      state.res[rid] = { value: 0, cap: 0 };
    }
    if (typeof state.res[rid].value !== "number") {
      state.res[rid].value = 0;
    }
    if (typeof state.res[rid].cap !== "number") {
      state.res[rid].cap = 0;
    }
  }

  const ui = {
    activeTab: "bonfire",
    dexQuery: "",
    dexAreaId: "all",
    dexOnlyCaught: false,
    dexOnlyMissing: false,
    dexPage: 0,
  // ===== SECTION:UI_STATE — ui状态对象定义 — 维护者窗口C =====
    dexPageSize: 50,
    dexDirty: true,
    captureAreaId: "kanto",
    captureDirty: true,
    capturePreviewHidden: false,
    makeBallQty: 1,
    captureAutoEncounter: false,
    encounterPid: null,
    encounterIsShiny: false,
    shinyModalOpen: false,
    mythicModalOpen: false,
    captureFcModalOpen: false,
    captureFcNeed: 0,
    captureFcAction: "",
    logLastMsg: null,
    logLastCount: 0,
    logDirty: true,
    bonfireDirty: true,
    monRegion: "all",
    monType: "all",
    monSort: "created",
    monPage: 0,
    monPageSize: 20,
    trainingSelectId: null,
    trainingModalOpen: false,
    trainingModalSelectedIds: [],
    trainingModalRegion: "all",
    trainingModalType: "all",
    trainingModalSort: "power",
    trainingModalSortDir: "",
    trainingModalQuery: "",
    breedingModalOpen: false,
    breedingModalSelectedIds: [],
    breedingModalRegion: "all",
    breedingModalType: "all",
    breedingModalSort: "power",
    breedingModalSortDir: "",
    breedingModalQuery: "",
    expeditionTeamModalOpen: false,
    expeditionTeamTypeFilter: "all",
    expeditionTeamAutoPick: false,
    expeditionRewardModalOpen: false,
    expeditionRewardModalData: null,
    functionsHideTraining: false,
    functionsHideBreeding: false,
    functionsHideExpedition: false,
    functionsFocus: false,
    functionsDirty: true,
    helpDirty: true,
    leaderboardDirty: true,
    futureDirty: true,
    monsDirty: true,
    monSelectedId: null,
    starUpTargetId: null,
    starUpSelectedIds: [],
    pveDirty: true,
    pveChapter: "",
    pveStage: "",
    pveTeamModalOpen: false,
    pveBattleResult: null,
    lbUid: "",
    lbName: "",
    lbAvatar: "",
    lbDexItems: null,
    lbPowerItems: null,
    lbContribItems: null,
    lbHatchItems: null,
    lbShinyItems: null,
    lbTotalPowerItems: null,
    lbGatherItems: null,
    lbResourceItems: null,
    lbCatchItems: null,
    lbDexFolded: false,
    lbPowerFolded: false,
    lbContribFolded: false,
    lbHatchFolded: false,
    lbShinyFolded: false,
    lbTotalPowerFolded: false,
    lbGatherFolded: false,
    lbResourceFolded: false,
    lbCatchFolded: false,
    lbBusy: false,
    lbErr: "",
    overlaysDirty: true,
    bossBully: null,
    bossBullyRewardModalOpen: false,
    serverBuffs: null,
    serverBuffLevels: null,
    serverBuffsDirty: true,
    serverBuffBuyModalOpen: false,
    serverBuffBuyKey: "",
    serverBuffBuyMinutes: 0,
  };

  const elResources = document.getElementById("resources");
  const elBuildings = document.getElementById("buildings");
  const elTech = document.getElementById("tech");
  const elLog = document.getElementById("log");
  const elLogToggle = document.getElementById("logToggle");
  const elHint = document.getElementById("hint");
  const elResearchEff = document.getElementById("researchEff");
  const elBonfireActions = document.getElementById("bonfireActions");
  const elBtnGather = document.getElementById("btnGather");
  const elDexSummary = document.getElementById("dexSummary");
  const elDexList = document.getElementById("dexList");
  const elFunctionsTraining = document.getElementById("functionsTraining");
  const elPveList = document.getElementById("pveList");
  const elHelp = document.getElementById("help");
  const elLeaderboard = document.getElementById("leaderboard");
  const elTicker = document.getElementById("ticker");

  // ===== SECTION:TICKER_SYSTEM — Ticker跑马灯系统 — 维护者窗口B =====
  const tickerSystem = createTickerSystem({
    getElTicker: () => elTicker,
    getUi: () => ui,
    lbBaseUrl,
    lbFetchJson,
    escapeHtml,
    nowMs,
    readLocalStorage,
    writeLocalStorage,
  });
  const pushTickerEvent = tickerSystem.pushTickerEvent;
  const ensureTickerPolling = tickerSystem.ensureTickerPolling;

  const elOverlays = document.getElementById("overlays");
  const elServerBuffBar = document.getElementById("serverBuffBar");

  // ===== SECTION:DIRTY_FLAGS — 脏标记函数 markXxxDirty =====
  function markOverlaysDirty() {
    ui.overlaysDirty = true;
  }

  function markServerBuffsDirty() {
    ui.serverBuffsDirty = true;
  }

  const elCloudUsername = document.getElementById("cloudUsername");
  const elCloudPassword = document.getElementById("cloudPassword");
  const elBtnCloudLogin = document.getElementById("btnCloudLogin");
  const elBtnCloudRegister = document.getElementById("btnCloudRegister");
  const elBtnCloudLogout = document.getElementById("btnCloudLogout");
  const elBtnCloudSyncNow = document.getElementById("btnCloudSyncNow");
  const elCloudStatus = document.getElementById("cloudStatus");
  const elBtnSaveExport = document.getElementById("btnSaveExport");
  const elBtnSaveImport = document.getElementById("btnSaveImport");
  const elSaveImportFile = document.getElementById("saveImportFile");

  const elAutoResearchToggle = document.getElementById("autoResearchToggle");
  const elAutoResearchMode = document.getElementById("autoResearchMode");

  const elDexArea = document.getElementById("dexArea");
  const elDexSearch = document.getElementById("dexSearch");
  const elDexOnlyCaught = document.getElementById("dexOnlyCaught");
  const elDexOnlyMissing = document.getElementById("dexOnlyMissing");
  const elDexPrev = document.getElementById("dexPrev");
  const elDexNext = document.getElementById("dexNext");
  const elDexPageInfo = document.getElementById("dexPageInfo");
  const elDexRegionInfo = document.getElementById("dexRegionInfo");

  const elCaptureArea = document.getElementById("captureArea");
  const elCaptureChance = document.getElementById("captureChance");
  const elCaptureInfo = document.getElementById("captureInfo");
  const elCaptureActions = document.getElementById("captureActions");

  const elFutureShop = document.getElementById("futureShop");
  const elDailyTasks = document.getElementById("dailyTasks");

  const elMonList = document.getElementById("monList");
  const elMonDetail = document.getElementById("monDetail");
  const elMonBack = document.getElementById("monBack");
  const elMonRegion = document.getElementById("monRegion");
  const elMonType = document.getElementById("monType");
  const elMonSort = document.getElementById("monSort");
  const elMonPrev = document.getElementById("monPrev");
  const elMonNext = document.getElementById("monNext");
  const elMonPageInfo = document.getElementById("monPageInfo");

  const elTabs = document.querySelector(".tabs");
  // ===== SECTION:DOM_ELEMENTS — DOM元素引用 =====
  const elPanels = document.querySelector(".panels");

  const LOG_COLLAPSE_KEY = "kittens_mvp_log_collapsed_v1";
  const CAPTURE_PREVIEW_KEY = "kittens_mvp_capture_preview_hidden_v1";
  const LB_UID_KEY = "kittens_mvp_lb_uid_v1";
  const LB_NAME_KEY = "kittens_mvp_lb_name_v1";
  const LB_AVATAR_KEY = "kittens_mvp_lb_avatar_v1";

  // ===== SECTION:LOG_UI — 日志UI折叠/展开/位置切换 — 维护者窗口C =====
  function setLogCollapsed(collapsed) {
    if (!elLog) return;
    elLog.classList.toggle("is-collapsed", Boolean(collapsed));
    if (elLogToggle) elLogToggle.textContent = collapsed ? "展开" : "收起";
    try {
      localStorage.setItem(LOG_COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
    }
    if (!collapsed) {
      ui.logDirty = true;
      render();
    }
  }

  function moveLogToBottom() {
    const titleRow = document.querySelector(".sidebar__sectionTitleRow--log");
    const divider = document.querySelector(".sidebar__divider--log");
    if (!elLog || !titleRow) return;

    let host = document.getElementById("bottomLog");
    if (!host) {
      host = document.createElement("section");
      host.id = "bottomLog";
      host.className = "bottomLog";
      const inner = document.createElement("div");
      inner.className = "bottomLog__inner";
      host.appendChild(inner);
      const footer = document.querySelector("footer.footer");
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(host, footer);
      } else {
        document.body.appendChild(host);
      }
    }

    const inner = host.querySelector(".bottomLog__inner") || host;
    if (divider) inner.appendChild(divider);
    inner.appendChild(titleRow);
    inner.appendChild(elLog);
  }

  function moveLogToSidebar() {
    const titleRow = document.querySelector(".sidebar__sectionTitleRow--log");
    const divider = document.querySelector(".sidebar__divider--log");
    const sidebar = document.querySelector("aside.sidebar");
    if (!elLog || !titleRow || !sidebar) return;

    const hint = document.getElementById("hint");
    const anchor = hint && hint.parentNode === sidebar ? hint : null;

    const host = document.getElementById("bottomLog");
    if (host && host.parentNode) host.parentNode.removeChild(host);

    // 侧栏已无资源区；日志回到 hint 之后（或侧栏顶部）
    const insertAfter = anchor || null;
    if (divider) {
      if (insertAfter && insertAfter.nextSibling) sidebar.insertBefore(divider, insertAfter.nextSibling);
      else if (insertAfter) sidebar.appendChild(divider);
      else sidebar.insertBefore(divider, sidebar.firstChild);
    }

    const afterDivider = divider && divider.parentNode === sidebar ? divider : insertAfter;
    if (afterDivider && afterDivider.nextSibling) sidebar.insertBefore(titleRow, afterDivider.nextSibling);
    else if (afterDivider) sidebar.appendChild(titleRow);
    else sidebar.insertBefore(titleRow, sidebar.firstChild);

    if (titleRow.nextSibling) sidebar.insertBefore(elLog, titleRow.nextSibling);
    else sidebar.appendChild(elLog);
  }

  function initLogCollapse() {
    if (!elLog || !elLogToggle) return;
    let collapsed = true;
    try {
      const raw = localStorage.getItem(LOG_COLLAPSE_KEY);
      if (raw === "1") collapsed = true;
      if (raw === "0") collapsed = false;
    } catch {
    }

    setLogCollapsed(collapsed);

    elLogToggle.addEventListener("click", () => {
      const next = !elLog.classList.contains("is-collapsed");
      setLogCollapsed(next);
    });
  }

  initLogCollapse();

  try {
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 980px)") : null;
    const applyLogPlacement = () => {
      if (mq && mq.matches) moveLogToBottom();
      else moveLogToSidebar();
    };
    applyLogPlacement();
    if (mq) {
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", applyLogPlacement);
      else if (typeof mq.addListener === "function") mq.addListener(applyLogPlacement);
    }
  } catch {
    moveLogToSidebar();
  }

  try {
    const raw = localStorage.getItem(CAPTURE_PREVIEW_KEY);
    if (raw === "1") ui.capturePreviewHidden = true;
    if (raw === "0") ui.capturePreviewHidden = false;
  } catch {
  }

  // ===== SECTION:LEADERBOARD_IDENTITY — 玩家标识/头像/排行榜身份 — 维护者窗口D =====
  const makeUid = () => {
    try {
      if (typeof crypto !== "undefined" && crypto && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch {
    }
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  };

  try {
    const rawUid = readLocalStorage(LB_UID_KEY);
    const rawName = readLocalStorage(LB_NAME_KEY);
    const rawAvatar = readLocalStorage(LB_AVATAR_KEY);
    ui.lbUid = rawUid && typeof rawUid === "string" ? rawUid : makeUid();
    ui.lbName = rawName && typeof rawName === "string" ? rawName : "";
    ui.lbAvatar = rawAvatar && typeof rawAvatar === "string" ? rawAvatar : "";
    try {
      localStorage.setItem(LB_UID_KEY, ui.lbUid);
    } catch {
    }
  } catch {
    ui.lbUid = makeUid();
  }

  let renderCapture = () => {};
  let renderMons = () => {};
  let renderDex = () => {};
  let renderFutureShop = () => {};
  let renderItems = () => {};
  let renderHelp = () => {};
  let renderDailyTasks = () => {};
  let renderPve = () => {};
  let renderFunctionsImpl = () => {};
  let socialTab = null;

  function markDexDirty(resetPage = false) {
    ui.dexDirty = true;
    if (resetPage) ui.dexPage = 0;
    if (ui.activeTab === "dex") renderDex();
  }

  function markCaptureDirty() {
    ui.captureDirty = true;
    if (ui.activeTab === "capture") renderCapture();
  }

  function markMonsDirty() {
    ui.monsDirty = true;
    ui.functionsDirty = true;
    if (ui.activeTab === "mons") renderMons();
  }

  function markFunctionsDirty() {
    ui.functionsDirty = true;
    if (ui.activeTab === "functions") renderFunctions();
  }

  function markPveDirty() {
    ui.pveDirty = true;
    if (ui.activeTab === "pve") renderPve();
  }

  function markLeaderboardDirty() {
    ui.leaderboardDirty = true;
    if (ui.activeTab === "leaderboard") renderLeaderboard();
  }

  initDexTab({
    ui,
    elDexArea,
    elDexSearch,
    elDexOnlyCaught,
    elDexOnlyMissing,
    elDexPrev,
    elDexNext,
    markDexDirty,
  });

  function markMonListDirty(resetPage = false) {
    ui.monsDirty = true;
    ui.functionsDirty = true;
    if (resetPage) ui.monPage = 0;
    if (ui.activeTab === "mons") renderMons();
  }

  initBonfireTab({
    elBonfireActions,
    elBtnGather,
    ui,
    getPokeballMakeCost,
    canAfford,
    pay,
    addRes,
    addLog,
    render,
    doCatch,
    getState: () => state,
  });

  // 标签页切换
  const tabController = createTabController({
    ui,
    elTabs,
    elPanels,
    renderDex: () => renderDex(),
    renderCapture: () => renderCapture(),
    renderItems: () => renderItems(),
    renderMons: () => renderMons(),
    renderFunctions: () => renderFunctions(),
    renderLeaderboard: () => renderLeaderboard(),
    renderHelp: () => renderHelp(),
    renderPve: () => renderPve(),
  });

  function activateTab(name) {
    tabController.activateTab(name);
  }

  // Initial chrome before first render tick
  try {
    document.querySelectorAll(".tab[data-tab]").forEach((t) => t.setAttribute("data-unlocked", "1"));
    tabController.refreshTabChrome();
  } catch {
  }

  renderHelp = createRenderHelp({
    elHelp,
    ui,
    escapeHtml,
  });

  const itemUsage = createItemUsage({
    state,
    addRes,
    addLog,
    addExpToMon,
    render,
  });

  // 暴露到全局以便事件处理
  window.itemUsage = itemUsage;

  renderItems = createRenderItems({
    defs,
    getState: () => state,
    itemUsage,
    ui,
    render,
    markMonsDirty,
  });

  function dexCaughtUnique() {
    return dexCaughtCount().unique;
  }

  const captureSystem = createCaptureSystem({
    defs,
    getState: () => state,
    ui,
    randFloat,
  });

  const {
    getAreas: getCaptureAreas,
    getUnlockedAreas: getUnlockedCaptureAreas,
    ensureAreaValid: ensureCaptureAreaValid,
    getActiveArea: getActiveCaptureArea,
    getPool: getCapturePool,
    getMythicPool,
    getBaseCatchChanceByDex: baseCatchChanceByDex,
    getBaseCatchChanceByTier: baseCatchChanceByTier,
    pickRandomFromPool,
  } = captureSystem;

  initCaptureTab({
    elCaptureArea,
    elCaptureInfo,
    elCaptureActions,
    ui,
    getState: () => state,
    clamp,
    randFloat,
    getPokeballMakeCost,
    canAfford,
    pay,
    addRes,
    addLog,
    render,
    markCaptureDirty,
    getCapturePool,
    getMythicPool,
    pickRandomFromPool,
    getSpeciesByPid,
    computeTechEffects,
    baseCatchChanceByDex,
    awardCaughtPokemon,
    doCatch,
    pushTickerEvent,
  });

  initBuildingsTab({
    elBuildings,
    getState: () => state,
    BUILDING_MAX_LEVEL,
    getBuildingCost,
    canAfford,
    pay,
    addLog,
    render,
    defs,
  });

  initTechTab({
    elTech,
    elAutoResearchToggle,
    elAutoResearchMode,
    getState: () => state,
    startResearchByTid,
    tryAutoResearch,
    render,
  });

  // ===== SECTION:CORE_HELPERS — hint / addLog / getSpeciesByPid — 维护者窗口A =====
  function hint(text, ttl = 2000) {
    elHint.textContent = text;
    if (ttl > 0) {
      window.setTimeout(() => {
        if (elHint.textContent === text) elHint.textContent = "";
      }, ttl);
    }
  }

  function addLog(msg, important = false) {
    if (!important && ui.logLastMsg === msg && ui.logLastCount >= 1 && Array.isArray(state.log) && state.log.length > 0) {
      ui.logLastCount += 1;
      const line = `[${new Date().toLocaleTimeString()}] ${msg} ×${ui.logLastCount}`;
      state.log[0] = line;
      ui.logDirty = true;
      return;
    }

    ui.logLastMsg = important ? null : msg;
    ui.logLastCount = important ? 0 : 1;

    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    state.log.unshift(line);
    state.log = state.log.slice(0, 30);
    ui.logDirty = true;
    if (important) {
      hint(msg, 2000);
    }
  }

  const speciesByPid = new Map(Array.isArray(defs.pokemon) ? defs.pokemon.map((x) => [x.id, x]) : []);
  function getSpeciesByPid(pid) {
    return speciesByPid.get(pid) ?? null;
  }

  function expNeedForLevel(lvl) {
    return expNeedForLevel0(lvl);
  }

  function monPower(mon) {
    return monPower0(mon, getPokeApiDataByDex);
  }

  function maxSingleMonPower() {
    const list = state.mons?.list ?? [];
    let best = 0;
    for (const m of list) {
      if (!m) continue;
      const p = Math.floor(monPower(m));
      if (Number.isFinite(p) && p > best) best = p;
    }
    return Math.max(0, best);
  }

  function getGameVersion() {
    try {
      const t = typeof document !== "undefined" ? String(document.title || "") : "";
      const m = t.match(/\bv(\d+\.\d+\.\d+)\b/);
      return m ? m[1] : "";
    } catch {
      return "";
    }
  }

  // ===== SECTION:LEADERBOARD_NETWORK — 排行榜网络 lbBaseUrl/lbFetchJson — 维护者窗口D =====
  function lbBaseUrl() {
    try {
      const loc = window.location;
      const host = loc && typeof loc.hostname === "string" ? loc.hostname : "";
      const origin = loc && typeof loc.origin === "string" ? loc.origin : "";

      if (!host) return "http://127.0.0.1:8080";
      if (host === "localhost" || host === "127.0.0.1") return "http://127.0.0.1:8080";

      // 默认同源（适配 ngrok/反代：同一个域名同时提供页面与 /api）
      if (origin) return origin;
    } catch {
    }
    return "http://127.0.0.1:8080";
  }

  let TRAINER_ICON_DATA_URL = null;
  let TRAINER_ICON_LOADING = false;
  function ensureTrainerIconDataUrl() {
    if (TRAINER_ICON_DATA_URL || TRAINER_ICON_LOADING) return;
    TRAINER_ICON_LOADING = true;
    try {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        try {
          const w = img.naturalWidth || 0;
          const h = img.naturalHeight || 0;
          if (!w || !h) throw new Error("bad img");
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("no ctx");
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, w, h);
          const p = data.data;
          for (let i = 0; i < p.length; i += 4) {
            const r = p[i];
            const g = p[i + 1];
            const b = p[i + 2];
            if (r >= 248 && g >= 248 && b >= 248) {
              p[i + 3] = 0;
            }
          }
          ctx.putImageData(data, 0, 0);
          TRAINER_ICON_DATA_URL = c.toDataURL("image/png");
        } catch {
          TRAINER_ICON_DATA_URL = "";
        } finally {
          TRAINER_ICON_LOADING = false;
          markLeaderboardDirty();
          render();
        }
      };
      img.onerror = () => {
        TRAINER_ICON_LOADING = false;
        TRAINER_ICON_DATA_URL = "";
      };
      img.src = "./assets/trainer.png";
    } catch {
      TRAINER_ICON_LOADING = false;
      TRAINER_ICON_DATA_URL = "";
    }
  }

  function trainerIconSrc() {
    ensureTrainerIconDataUrl();
    return TRAINER_ICON_DATA_URL || "./assets/trainer_pixel.svg";
  }

  function renderOwnerIcon(avatarDataUrl) {
    const isAvatar = typeof avatarDataUrl === "string" && avatarDataUrl;
    const src = isAvatar ? avatarDataUrl : trainerIconSrc();
    const style = isAvatar
      ? "margin-left:6px;border-radius:6px;object-fit:cover"
      : "margin-left:6px;image-rendering:pixelated";
    return `<img src="${escapeHtml(src)}" width="18" height="18" alt="" loading="eager" decoding="async" style="${style}" />`;
  }

  function renderSelfAvatarPreview() {
    const isAvatar = typeof ui.lbAvatar === "string" && ui.lbAvatar;
    const src = isAvatar ? ui.lbAvatar : trainerIconSrc();
    const style = isAvatar ? "border-radius:8px;object-fit:cover" : "image-rendering:pixelated";
    return `<img src="${escapeHtml(src)}" width="22" height="22" alt="" loading="eager" decoding="async" style="${style}" />`;
  }

  async function avatarFileToDataUrl(file) {
    const raw = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("read error"));
      fr.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("img error"));
      im.src = raw;
    });

    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (!w || !h) throw new Error("bad img");

    const size = 64;
    const side = Math.min(w, h);
    const sx = Math.floor((w - side) / 2);
    const sy = Math.floor((h - side) / 2);

    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no ctx");
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return c.toDataURL("image/png");
  }

  let LB_AUTO_TIMER_ID = null;
  function ensureLeaderboardAutoRefresh() {
    if (LB_AUTO_TIMER_ID) return;
    LB_AUTO_TIMER_ID = window.setInterval(() => {
      if (ui.activeTab !== "leaderboard") return;
      if (ui.lbBusy) return;
      refreshLeaderboards();
    }, 60000);
  }

  function calcTopMons(limit = 6) {
    return (state.mons?.list ?? [])
      .filter((m) => m && typeof m.dex === "number" && Number.isFinite(m.dex))
      .map((m) => ({
        dex: Math.max(1, Math.floor(m.dex)),
        name: typeof m.name === "string" ? m.name : "",
        power: Math.max(0, Math.floor(monPower(m))),
        isShiny: Boolean(m.isShiny),
      }))
      .sort((a, b) => (b.power ?? 0) - (a.power ?? 0))
      .slice(0, Math.max(0, Math.floor(limit)));
  }

  function calcTeamPower(topMons) {
    if (!Array.isArray(topMons)) return 0;
    let sum = 0;
    for (const m of topMons) {
      const p = typeof m?.power === "number" && Number.isFinite(m.power) ? Math.max(0, Math.floor(m.power)) : 0;
      sum += p;
    }
    return sum;
  }

  function calcTotalPower() {
    const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
    if (mons.length === 0) return 0;
    let sum = 0;
    for (const m of mons) {
      const p = monPower(m);
      sum += typeof p === "number" && Number.isFinite(p) ? Math.max(0, Math.floor(p)) : 0;
    }
    return sum;
  }

  // ===== SECTION:SERVER_BUFFS — 全服Buff系统 — 维护者窗口D =====
  async function lbFetchJson(url, opts = null) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const id = window.setTimeout(() => {
      try {
        ctrl?.abort?.();
      } catch {
      }
    }, 8000);
    try {
      const res = await fetch(url, { ...(opts || {}), signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      window.clearTimeout(id);
    }
  }

  function getServerBuffLevel(key) {
    return getServerBuffLevel0(key, ui);
  }

  function serverBuffPct(key) {
    return serverBuffPct0(key, ui);
  }

  function serverBuffMul(key) {
    return serverBuffMul0(key, ui);
  }

  function serverBuffResearchTimeMul() {
    return serverBuffResearchTimeMul0(ui, clamp);
  }

  function serverBuffEffectText(key, lvl) {
    return serverBuffEffectText0(key, lvl);
  }

  function closeServerBuffBuyModal() {
    ui.serverBuffBuyModalOpen = false;
    ui.serverBuffBuyKey = "";
    markOverlaysDirty();
    render();
  }

  function openServerBuffBuyModal(key) {
    ui.serverBuffBuyModalOpen = true;
    ui.serverBuffBuyKey = String(key || "");
    if (!Number.isFinite(ui.serverBuffBuyMinutes) || ui.serverBuffBuyMinutes < 1) ui.serverBuffBuyMinutes = 0;
    markOverlaysDirty();
    render();
  }

  async function refreshServerBuffsOnce() {
    try {
      const base = lbBaseUrl();
      const res = await lbFetchJson(`${base}/api/server/buffs`);
      ui.serverBuffs = res && typeof res === "object" ? res : null;
      const items = Array.isArray(ui.serverBuffs?.items) ? ui.serverBuffs.items : [];
      const levelMap = new Map();
      for (const key of SERVER_BUFF_KEYS) levelMap.set(key, 0);
      for (const it of items) {
        const key = String(it?.key || "");
        if (!SERVER_BUFF_KEYS.includes(key)) continue;
        const lvl = typeof it?.level === "number" && Number.isFinite(it.level) ? Math.max(0, Math.floor(it.level)) : 0;
        levelMap.set(key, lvl);
      }
      ui.serverBuffLevels = levelMap;
      markServerBuffsDirty();
      render();
    } catch {
    }
  }

  let SERVER_BUFF_TIMER_ID = 0;
  function ensureServerBuffsPolling() {
    if (SERVER_BUFF_TIMER_ID) return;
    refreshServerBuffsOnce();
    SERVER_BUFF_TIMER_ID = window.setInterval(() => {
      if (ui.serverBuffBuyModalOpen) return;
      refreshServerBuffsOnce();
    }, 8000);
  }

  async function buyServerBuff(key, minutes) {
    const k = String(key || "");
    if (!SERVER_BUFF_KEYS.includes(k)) return;
    const m0 = Math.max(1, Math.floor(minutes || 0));
    const m = Math.min(SERVER_BUFF_BUY_MAX_MINUTES, m0);
    const price = m;
    if ((state.res.futurecoin?.value ?? 0) < price) {
      addLog("未来币不足。", true);
      return;
    }

    try {
      const base = lbBaseUrl();
      const name = typeof ui.lbName === "string" && ui.lbName.trim() ? ui.lbName.trim() : "训练家";
      await lbFetchJson(`${base}/api/server/buffs/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, uid: ui.lbUid, name, addSec: m * 60 }),
      });

      state.res.futurecoin.value = Math.max(0, (state.res.futurecoin?.value ?? 0) - price);
      ui.futureDirty = true;
      addLog(`购买全服增益：${SERVER_BUFF_UI[k]?.name ?? k}（+${m} 分钟，花费未来币 ${price}）`, true);
      if (typeof pushTickerEvent === "function") {
        pushTickerEvent("sbuff", `贡献全服增益 ${SERVER_BUFF_UI[k]?.name ?? k}（+${m} 分钟）`);
      }
      save();
      closeServerBuffBuyModal();
      refreshServerBuffsOnce();
    } catch (e) {
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.includes("HTTP 422")) {
        addLog(`购买失败：单次购买上限 ${SERVER_BUFF_BUY_MAX_MINUTES} 分钟`, true);
      } else {
        addLog("购买失败：请求失败，请稍后重试", true);
      }
    }
  }

  if (elServerBuffBar) {
    elServerBuffBar.addEventListener("click", (ev) => {
      const btn = ev.target?.closest?.("button[data-sbuff-key]");
      if (!btn || !elServerBuffBar.contains(btn)) return;
      const k = String(btn.getAttribute("data-sbuff-key") || "");
      openServerBuffBuyModal(k);
    });
  }

  // ===== SECTION:RENDER_SERVER_BUFF_BAR — 全服Buff渲染 — 维护者窗口C =====
  function renderServerBuffBar() {
    if (!elServerBuffBar) return;
    if (!ui.serverBuffsDirty) return;

    const items = Array.isArray(ui.serverBuffs?.items) ? ui.serverBuffs.items : [];
    const byKey = new Map(items.map((it) => [String(it?.key || ""), it]));

    const rows = [];
    for (let idx = 0; idx < SERVER_BUFF_KEYS.length; idx += 1) {
      const key = SERVER_BUFF_KEYS[idx];
      const it = byKey.get(key) || null;
      const lvl = typeof it?.level === "number" && Number.isFinite(it.level) ? Math.max(0, Math.floor(it.level)) : 0;
      const rem = typeof it?.remainingSec === "number" && Number.isFinite(it.remainingSec) ? Math.max(0, Math.floor(it.remainingSec)) : 0;
      const cfg = SERVER_BUFF_UI[key];
      const icon = cfg?.icon ?? key;
      const title = cfg?.name ?? key;
      const effectLine = serverBuffEffectText(key, lvl);

      const tipShift = idx * 52;

      const contrib = Array.isArray(it?.contributors) ? it.contributors : [];
      const contribLines = contrib.length
        ? contrib
            .slice(0, 10)
            .map((c, idx) => {
              const nm = escapeHtml(String(c?.name || c?.uid || "-") || "-");
              const sec = typeof c?.sec === "number" && Number.isFinite(c.sec) ? Math.max(0, Math.floor(c.sec)) : 0;
              return `<div class="serverBuffBar__tipLine muted">#${idx + 1} ${nm} · ${fmtDuration(sec)}</div>`;
            })
            .join("")
        : `<div class="serverBuffBar__tipLine muted">暂无贡献者</div>`;

      rows.push(`
        <div class="serverBuffBar__slot">
          <button class="serverBuffBar__btn ${lvl > 0 ? "" : "is-off"}" data-sbuff-key="${escapeHtml(key)}" type="button" aria-label="${escapeHtml(title)}">
            <span>${escapeHtml(icon)}</span>
            <span class="serverBuffBar__lvl">${lvl > 0 ? lvl : 0}</span>
          </button>
          <div class="serverBuffBar__tip" style="--sbuff-tip-shift:${tipShift}px">
            <div class="serverBuffBar__tipTitle">${escapeHtml(title)} Lv.${lvl}</div>
            <div class="serverBuffBar__tipLine">效果：${escapeHtml(effectLine)}</div>
            <div class="serverBuffBar__tipLine">剩余：${escapeHtml(fmtDuration(rem))}</div>
            <div class="serverBuffBar__tipLine muted" style="margin-top:6px">贡献者（按贡献时间）</div>
            ${contribLines}
            <div class="serverBuffBar__tipLine muted" style="margin-top:8px">点击图标可购买/续费（1未来币=1分钟）</div>
          </div>
        </div>
      `);
    }

    const elBody = document.getElementById("serverBuffBody") || elServerBuffBar;
    elBody.innerHTML = rows.join("");
    ui.serverBuffsDirty = false;
  }

  const elServerBuffToggle = document.getElementById("serverBuffToggle");
  if (elServerBuffToggle && elServerBuffBar && !elServerBuffToggle.dataset.bound) {
    elServerBuffToggle.dataset.bound = "1";
    elServerBuffToggle.addEventListener("click", () => {
      const open = elServerBuffBar.classList.toggle("is-collapsed") === false;
      elServerBuffToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  const BOSS_BULLY_SNOOZE_KEY = "kittens_mvp_boss_bully_snooze_until_v1";
  // ===== SECTION:BOSS_BULLY — Boss林佬系统 — 维护者窗口D =====
  const {
    refreshBossBullyOnce,
    ensureBossBullyPolling,
    onBossBullyMaybeReward,
    claimBossBullyReward,
    closeBossBullyRewardModal,
  } = createBossBullySystem({
    ui,
    defs,
    BOSS_BULLY_SNOOZE_KEY,
    readLocalStorage,
    lbBaseUrl,
    lbFetchJson,
    addRes,
    addLog,
    save,
    markOverlaysDirty,
    render,
  });

  function closeExpeditionRewardModal() {
    ui.expeditionRewardModalOpen = false;
    ui.expeditionRewardModalData = null;
    markOverlaysDirty();
    render();
  }

  if (elOverlays) {
    elOverlays.addEventListener("input", (ev) => {
      const input = ev.target?.closest?.("input[data-sbuff-min-input]");
      if (!input || !elOverlays.contains(input)) return;
      const raw = String(input.value || "").trim();
      const n = Math.floor(Number(raw));
      ui.serverBuffBuyMinutes = Number.isFinite(n) && n > 0 ? n : 0;
    });

    elOverlays.addEventListener("click", (ev) => {
      const expClose = ev.target?.closest?.("button[data-exp-reward-close]");
      if (expClose && elOverlays.contains(expClose)) {
        closeExpeditionRewardModal();
        return;
      }

      const expOverlay = ev.target?.closest?.("div[data-exp-reward-overlay]");
      if (expOverlay && elOverlays.contains(expOverlay) && ev.target === expOverlay) {
        closeExpeditionRewardModal();
        return;
      }

      const sbClose = ev.target?.closest?.("button[data-sbuff-close]");
      if (sbClose && elOverlays.contains(sbClose)) {
        closeServerBuffBuyModal();
        return;
      }

      const sbBuy = ev.target?.closest?.("button[data-sbuff-buy]");
      if (sbBuy && elOverlays.contains(sbBuy)) {
        const input = elOverlays.querySelector("input[data-sbuff-min-input]");
        const raw = input ? String(input.value || "").trim() : String(ui.serverBuffBuyMinutes || "");
        const m0 = Math.floor(Number(raw));
        if (!Number.isFinite(m0) || m0 < 1) {
          addLog("请输入正确分钟数。", true);
          return;
        }
        ui.serverBuffBuyMinutes = m0;
        buyServerBuff(ui.serverBuffBuyKey, m0);
        return;
      }

      const sbOverlay = ev.target?.closest?.("div[data-sbuff-overlay]");
      if (sbOverlay && elOverlays.contains(sbOverlay) && ev.target === sbOverlay) {
        closeServerBuffBuyModal();
        return;
      }

      const closeBtn = ev.target?.closest?.("button[data-boss-bully-close]");
      if (closeBtn && elOverlays.contains(closeBtn)) {
        closeBossBullyRewardModal({ snoozeMin: 10 });
        return;
      }

      const claimBtn = ev.target?.closest?.("button[data-boss-bully-claim]");
      if (claimBtn && elOverlays.contains(claimBtn)) {
        claimBossBullyReward();
        return;
      }

      const overlay = ev.target?.closest?.("div[data-boss-bully-overlay]");
      if (overlay && elOverlays.contains(overlay) && ev.target === overlay) {
        closeBossBullyRewardModal({ snoozeMin: 10 });
        return;
      }
    });
  }

  // ===== SECTION:RENDER_OVERLAYS — 全局弹窗渲染 renderOverlays — 维护者窗口C =====
  function renderOverlays() {
    if (!elOverlays) return;
    if (!ui.overlaysDirty) return;

    let prevSbuffFocused = false;
    let prevSbuffStart = null;
    let prevSbuffEnd = null;
    try {
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae instanceof HTMLElement && elOverlays.contains(ae) && ae.matches("input[data-sbuff-min-input]")) {
        prevSbuffFocused = true;
        prevSbuffStart = typeof ae.selectionStart === "number" ? ae.selectionStart : null;
        prevSbuffEnd = typeof ae.selectionEnd === "number" ? ae.selectionEnd : null;
      }
    } catch {
    }

    const rows = [];

    const expOpen = Boolean(ui.expeditionRewardModalOpen);
    const expData = ui.expeditionRewardModalData;
    if (expOpen && expData && typeof expData === "object") {
      const expPerMon = typeof expData.expPerMon === "number" && Number.isFinite(expData.expPerMon) ? Math.max(0, Math.floor(expData.expPerMon)) : 0;
      const monCount = typeof expData.monCount === "number" && Number.isFinite(expData.monCount) ? Math.max(0, Math.floor(expData.monCount)) : 0;
      const fc = typeof expData.futurecoin === "number" && Number.isFinite(expData.futurecoin) ? Math.max(0, Math.floor(expData.futurecoin)) : 0;
      const mb = typeof expData.masterball === "number" && Number.isFinite(expData.masterball) ? Math.max(0, Math.floor(expData.masterball)) : 0;
      const potMap0 = expData.potions && typeof expData.potions === "object" ? expData.potions : {};
      const potEntries = Object.entries(potMap0)
        .map(([rid, qty]) => ({ rid: String(rid || ""), qty: Math.max(0, Math.floor(Number(qty))) }))
        .filter((x) => x.rid && x.qty > 0);

      const potText =
        potEntries.length > 0
          ? potEntries
              .map((x) => `${escapeHtml(defs.resources?.[x.rid]?.name ?? x.rid)} x${x.qty}`)
              .join(" · ")
          : "无";

      rows.push(`
        <div class="modalOverlay" data-exp-reward-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">远征完成</div>
              <div class="modal__right">
                <button class="btn btn--small" data-exp-reward-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">本次远征获得如下奖励。</div>
            <div class="modal__body">
              ${expPerMon > 0 && monCount > 0 ? `<div class="badge">经验：每只 +${expPerMon}（参与 ${monCount} 只）</div>` : ""}
              ${fc > 0 ? `<div class="badge">${escapeHtml(defs.resources?.futurecoin?.name ?? "未来币")} x${fc}</div>` : ""}
              ${mb > 0 ? `<div class="badge">${escapeHtml(defs.resources?.masterball?.name ?? "大师球")} x${mb}</div>` : ""}
              <div class="badge">药剂：${potText}</div>
            </div>
          </div>
        </div>
      `);
    }

    const b = ui.bossBully;
    const open = Boolean(ui.bossBullyRewardModalOpen);
    const killSeq = typeof b?.killSeq === "number" && Number.isFinite(b.killSeq) ? Math.floor(b.killSeq) : 0;
    const claimed = Boolean(b?.claimed);
    const rewardType = String(b?.rewardType || "");
    const rewardQty = typeof b?.rewardQty === "number" && Number.isFinite(b.rewardQty) ? Math.max(0, Math.floor(b.rewardQty)) : 0;
    const rewards = b && typeof b === "object" && b.rewards && typeof b.rewards === "object" ? b.rewards : null;
    const rewardEntries = rewards && typeof rewards === "object" ? Object.entries(rewards).filter(([k, v]) => k && typeof v === "number" && Number.isFinite(v) && v > 0) : [];

    if (open && killSeq > 0 && !claimed && (rewardEntries.length > 0 || (rewardType && rewardQty > 0))) {
      const rewardLines = rewardEntries.length
        ? rewardEntries
            .map(([k, v]) => `<div class=\"row__desc\">${escapeHtml(defs.resources?.[k]?.name ?? k)} x${Math.floor(v)}</div>`)
            .join("")
        : `<div class=\"row__desc\">${escapeHtml(rewardType)} x${rewardQty}</div>`;
      rows.push(`
        <div class="modalOverlay" data-boss-bully-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">林佬奖励</div>
              <div class="modal__right">
                <button class="btn btn--small" data-boss-bully-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">林佬已被击败（第 ${killSeq} 次）。你有未领取奖励。</div>
            <div class="modal__body">
              <div class="row">
                <div class="row__left">
                  <div class="row__title">奖励</div>
                  ${rewardLines}
                </div>
                <div class="row__right">
                  <button class="btn btn--primary" data-boss-bully-claim="1">领取</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    const sbOpen = Boolean(ui.serverBuffBuyModalOpen);
    const sbKey = String(ui.serverBuffBuyKey || "");
    if (sbOpen && SERVER_BUFF_KEYS.includes(sbKey)) {
      const cfg = SERVER_BUFF_UI[sbKey];
      const title = cfg?.name ?? sbKey;
      const minutes = Number.isFinite(ui.serverBuffBuyMinutes) && ui.serverBuffBuyMinutes > 0 ? String(Math.floor(ui.serverBuffBuyMinutes)) : "";
      rows.push(`
        <div class="modalOverlay" data-sbuff-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">购买全服增益</div>
              <div class="modal__right">
                <button class="btn btn--small" data-sbuff-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(title)}（1未来币=1分钟）</div>
            <div class="modal__body">
              <div class="row">
                <div class="row__left">
                  <div class="row__title">购买时长（分钟）</div>
                  <div class="row__desc">花费未来币 = 分钟数</div>
                </div>
                <div class="row__right">
                  <input class="input" type="number" inputmode="numeric" min="1" max="${SERVER_BUFF_BUY_MAX_MINUTES}" step="1" value="${minutes}" data-sbuff-min-input />
                  <button class="btn btn--primary" data-sbuff-buy="1">购买</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    elOverlays.innerHTML = rows.join("");

    if (prevSbuffFocused) {
      try {
        const inp = elOverlays.querySelector("input[data-sbuff-min-input]");
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevSbuffStart === "number" && typeof prevSbuffEnd === "number") {
            inp.setSelectionRange(prevSbuffStart, prevSbuffEnd);
          }
        }
      } catch {
      }
    }
    ui.overlaysDirty = false;
  }

  // ===== SECTION:LEADERBOARD_DATA — 排行榜数据刷新/渲染 — 维护者窗口D =====
  async function refreshLeaderboards() {
    const base = lbBaseUrl();
    ui.lbBusy = true;
    ui.lbErr = "";
    markLeaderboardDirty();
    render();
    try {
      const [dex, power, contrib, hatch, shiny, totalPower, gather, resource, catchLb] = await Promise.all([
        lbFetchJson(`${base}/api/leaderboard/dex?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/power?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/contrib?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/hatch?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/shiny?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/total_power?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/gather?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/resource?limit=100`).catch(() => ({ items: [] })),
        lbFetchJson(`${base}/api/leaderboard/catch?limit=100`).catch(() => ({ items: [] })),
      ]);
      ui.lbDexItems = Array.isArray(dex?.items) ? dex.items : [];
      ui.lbPowerItems = Array.isArray(power?.items) ? power.items : [];
      ui.lbContribItems = Array.isArray(contrib?.items) ? contrib.items : [];
      ui.lbHatchItems = Array.isArray(hatch?.items) ? hatch.items : [];
      ui.lbShinyItems = Array.isArray(shiny?.items) ? shiny.items : [];
      ui.lbTotalPowerItems = Array.isArray(totalPower?.items) ? totalPower.items : [];
      ui.lbGatherItems = Array.isArray(gather?.items) ? gather.items : [];
      ui.lbResourceItems = Array.isArray(resource?.items) ? resource.items : [];
      ui.lbCatchItems = Array.isArray(catchLb?.items) ? catchLb.items : [];
    } catch (e) {
      const raw = String(e && typeof e === "object" && "message" in e ? e.message : e || "请求失败");
      const isAbort = Boolean(e && typeof e === "object" && "name" in e && e.name === "AbortError");
      ui.lbErr = isAbort || raw.toLowerCase().includes("aborted") ? "请求超时/被取消" : raw;
    } finally {
      ui.lbBusy = false;
      markLeaderboardDirty();
      render();
    }
  }

  async function submitScoreAndRefresh() {
    const base = lbBaseUrl();
    const name = typeof ui.lbName === "string" ? ui.lbName.trim() : "";
    if (!name) {
      ui.lbErr = "请先填写昵称";
      markLeaderboardDirty();
      render();
      return;
    }

    ui.lbBusy = true;
    ui.lbErr = "";
    markLeaderboardDirty();
    render();
    try {
      const topMons = calcTopMons(6);
      const teamPower = calcTeamPower(topMons);
      const totalPower = calcTotalPower();
      const hatchCount = Math.max(0, Math.floor(Number.isFinite(state.hatchCount) ? state.hatchCount : 0));
      const shinyCount = Math.max(0, Math.floor(Number.isFinite(state.shinyCount) ? state.shinyCount : 0));
      const gatherClicks = Math.max(0, Math.floor(Number.isFinite(state.gatherClicks) ? state.gatherClicks : 0));
      const resourceProduced = Math.max(0, Math.floor(Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0));
      const catchCount = Math.max(0, Math.floor(Number.isFinite(state.catchCount) ? state.catchCount : 0));

      const body = {
        uid: ui.lbUid,
        name,
        dexCount: dexCaughtUnique(),
        power: teamPower,
        totalPower,
        hatchCount,
        shinyCount,
        gatherClicks,
        resourceProduced,
        catchCount,
        gameVersion: getGameVersion(),
        topMons,
        avatar: typeof ui.lbAvatar === "string" && ui.lbAvatar ? ui.lbAvatar : null,
      };
      await lbFetchJson(`${base}/api/score/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await refreshLeaderboards();
    } catch (e) {
      const raw = String(e && typeof e === "object" && "message" in e ? e.message : e || "提交失败");
      const isAbort = Boolean(e && typeof e === "object" && "name" in e && e.name === "AbortError");
      ui.lbErr = isAbort || raw.toLowerCase().includes("aborted") ? "请求超时/被取消" : raw;
      ui.lbBusy = false;
      markLeaderboardDirty();
      render();
    }
  }

  const renderLeaderboard = createRenderLeaderboard({
    elLeaderboard,
    ui,
    escapeHtml,
    fmtDuration,
    renderPokemonIcon,
    renderOwnerIcon,
    renderSelfAvatarPreview,
    trainerIconSrc,
    dexCaughtUnique,
    calcTeamPower,
    calcTotalPower,
    calcTopMons,
    getState: () => state,
    ensureLeaderboardAutoRefresh,
    refreshLeaderboards,
  });

  // ===== SECTION:MON_HELPERS — 精灵辅助函数 getMonCurrentStats等 — 维护者窗口B =====
  function getMonCurrentStats(mon) {
    return getMonCurrentStats0(mon, getPokeApiDataByDex);
  }

  function createMonInstance(species, idOverride = null) {
    const m = createMonInstance0(species, {
      idOverride,
      idFallback: state?.mons?.nextId ?? 1,
    });
    m.skillCdRemainingSec = 0;
    m.skillActiveType = null;
    m.skillActiveRemainingSec = 0;
    return m;
  }

  function addExpToMon(mon, expAdd) {
    const add0 = typeof expAdd === "number" && Number.isFinite(expAdd) ? expAdd : 0;
    const boostOn = typeof state.expBoostRemainingSec === "number" && Number.isFinite(state.expBoostRemainingSec) && state.expBoostRemainingSec > 0;
    const permExpLvl = typeof state.permanentBoosts?.exp === "number" ? Math.max(0, Math.min(10, Math.floor(state.permanentBoosts.exp))) : 0;
    const permExpMul = 1 + permExpLvl * 0.1;
    const mul = (boostOn ? 2 : 1) * serverBuffMul("exp") * permExpMul;
    return addExpToMon0(mon, Math.floor(add0 * mul));
  }

  function evolveMon(mon, toPid) {
    const ok = evolveMon0(mon, toPid, getSpeciesByPid);
    if (!ok) return false;

    if (!state.dex || typeof state.dex !== "object") state.dex = { caught: {} };
    if (!state.dex.caught || typeof state.dex.caught !== "object") state.dex.caught = {};
    const sp = getSpeciesByPid(toPid);
    if (sp) {
      const caught = state.dex.caught;
      const prev = typeof caught[sp.id] === "number" ? caught[sp.id] : 0;
      caught[sp.id] = prev + 1;
      if (prev === 0) {
        addLog(`图鉴登记：${sp.name}（进化解锁）`, true);
      }
    }

    ui.dexDirty = true;
    return true;
  }

  let EVO_FAMILY_ID_BY_PID = null;
  function buildEvoFamilyIdMap() {
    const evo = getEvoMap();
    if (!evo || typeof evo !== "object") return null;

    const adj = {};
    const ensure = (pid) => {
      if (!pid || typeof pid !== "string") return;
      if (!adj[pid]) adj[pid] = new Set();
    };

    for (const [from, tos] of Object.entries(evo)) {
      if (typeof from !== "string") continue;
      if (!Array.isArray(tos)) continue;
      ensure(from);
      for (const to of tos) {
        if (typeof to !== "string") continue;
        ensure(to);
        adj[from].add(to);
        adj[to].add(from);
      }
    }

    const famId = new Map();
    let next = 1;
    for (const pid of Object.keys(adj)) {
      if (famId.has(pid)) continue;
      const id = next;
      next += 1;
      const q = [pid];
      famId.set(pid, id);
      while (q.length) {
        const cur = q.pop();
        const ns = adj[cur];
        if (!ns) continue;
        for (const n of ns) {
          if (famId.has(n)) continue;
          famId.set(n, id);
          q.push(n);
        }
      }
    }

    return famId;
  }

  function isSameEvoFamily(pidA, pidB) {
    if (!pidA || !pidB) return false;
    if (pidA === pidB) return true;
    if (!EVO_FAMILY_ID_BY_PID) EVO_FAMILY_ID_BY_PID = buildEvoFamilyIdMap();
    const m = EVO_FAMILY_ID_BY_PID;
    if (!m) return false;
    const a = m.get(pidA);
    const b = m.get(pidB);
    if (!a || !b) return false;
    return a === b;
  }

  // ===== SECTION:SAVE_CLOUD — 存档序列化/云同步 — 维护者窗口A =====
  function getAutosaveRawJson() {
    try {
      const enc = localStorage.getItem(STORAGE_KEY);
      if (!enc) return null;
      const raw = decodeSaveText(enc);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  function applyAutosaveRaw(rawJson) {
    const s = loadFromRaw(rawJson);
    if (!s) return false;
    state = s;
    ui.dexDirty = true;
    render();
    return true;
  }

  function setCloudStatus(text) {
    if (!elCloudStatus) return;
    elCloudStatus.textContent = typeof text === "string" ? text : String(text ?? "");
  }

  const cloudSave = createCloudSave({
    encodeSaveText,
    decodeSaveText,
    autosaveKey: STORAGE_KEY,
    slotKeys: [SAVE_SLOT_KEY],
    applyAutosaveRaw,
  });

  // API fetch for daily_tasks / authenticated endpoints (Bearer from cloudSave)
  ui.fetch = async (path, { method = "GET", body = null } = {}) => {
    const headers = { "Content-Type": "application/json" };
    const token = cloudSave.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const qs = !token && ui.lbUid ? `${path.includes("?") ? "&" : "?"}uid=${encodeURIComponent(ui.lbUid)}` : "";
    const res = await fetch(`${path}${qs}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = data && typeof data.error === "string" ? data.error : `http ${res.status}`;
      throw new Error(err);
    }
    return data;
  };

  function refreshCloudUI() {
    const token = cloudSave.getToken();
    const username = cloudSave.getUsername();
    if (token) setCloudStatus(`已登录：${username || "-"}`);
    else setCloudStatus("未登录");
  }

  async function doCloudSyncNow() {
    try {
      refreshCloudUI();
      if (!cloudSave.getToken()) {
        setCloudStatus("未登录");
        return;
      }
      setCloudStatus("同步中...");
      await cloudSave.syncAll();
      cloudSave.startAutoSync();
      const st = cloudSave.getSyncStatus();
      if (st.status === "error") {
        setCloudStatus(`同步失败：${st.error || "未知错误"}`);
      } else if (st.status === "partial") {
        setCloudStatus(`已登录：${cloudSave.getUsername() || "-"}（部分同步：${st.error || "有冲突"}）`);
      } else if (!cloudSave.getToken()) {
        setCloudStatus("登录已过期，请重新登录");
      } else {
        setCloudStatus(`已登录：${cloudSave.getUsername() || "-"}（已同步）`);
      }
    } catch (e) {
      const msg = typeof e?.message === "string" ? e.message : "同步失败";
      if (!cloudSave.getToken()) setCloudStatus("登录已过期，请重新登录");
      else setCloudStatus(`同步失败：${msg}`);
    }
  }

  function exportSaveJson() {
    try {
      save();
      const raw = getAutosaveRawJson();
      if (!raw) {
        setCloudStatus("无存档可导出");
        return;
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kittens-save-${formatLocalYmd()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setCloudStatus("已导出存档文件");
    } catch (e) {
      setCloudStatus(`导出失败：${e?.message || "unknown"}`);
    }
  }

  function importSaveJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const s = loadFromRaw(text);
        if (!s) {
          setCloudStatus("导入失败：存档损坏或不兼容");
          return;
        }
        state = s;
        ui.dexDirty = true;
        save();
        render();
        setCloudStatus("已导入本地存档");
        if (cloudSave.getToken()) doCloudSyncNow();
      } catch (e) {
        setCloudStatus(`导入失败：${e?.message || "unknown"}`);
      }
    };
    reader.onerror = () => setCloudStatus("导入失败：无法读取文件");
    reader.readAsText(file);
  }

  function saveToKey(key) {
    const payload = serializeState(state);
    const raw = JSON.stringify(payload);
    localStorage.setItem(key, encodeSaveText(raw));

    refreshCloudUI();
    if (cloudSave.getToken()) {
      doCloudSyncNow();
    }
  }

  function loadFromKey(key) {
    const raw0 = localStorage.getItem(key);
    if (!raw0) {
      hint("该槽位为空。", 1600);
      return false;
    }
    const raw = decodeSaveText(raw0);
    const s = loadFromRaw(raw);
    if (!s) {
      hint("该槽位存档损坏或不兼容。", 2000);
      return false;
    }
    state = s;
    ui.dexDirty = true;
    render();
    hint("已读取存档。", 1200);
    return true;
  }

  // ===== SECTION:DEX_EFFECTS — 图鉴计数/图鉴加成效果 — 维护者窗口A =====
  function dexCaughtCount() {
    return dexCaughtCount0(state);
  }

  function computeDexEffects() {
    return computeDexEffects0(state);
  }

  function getResearchCost(tdef) {
    return getResearchCost0(tdef, state);
  }

  function computeResearchTimeSec(tdef) {
    return computeResearchTimeSec0(tdef, state, ui);
  }

  function getResearchEfficiency() {
    return getResearchEfficiency0(state);
  }

  function fmtDuration(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad2 = (x) => String(x).padStart(2, "0");
    if (hh > 0) return `${hh}:${pad2(mm)}:${pad2(ss)}`;
    return `${mm}:${pad2(ss)}`;
  }

  // ===== SECTION:TECH_EFFECTS — computeTechEffects / getBuildingCost — 维护者窗口A =====
  function computeTechEffects() {
    return computeTechEffects0(state, defs, ui);
  }

  function getBuildingCost(id) {
    return getBuildingCost0(id, state, defs, ui);
  }

  // ===== SECTION:ECONOMY — canAfford / pay / research逻辑 — 维护者窗口A =====
  function canAfford(cost) {
    for (const [rid, v] of Object.entries(cost)) {
      if ((state.res[rid]?.value ?? 0) < v) return false;
    }
    return true;
  }

  function pay(cost) {
    for (const [rid, v] of Object.entries(cost)) {
      state.res[rid].value = Math.max(0, state.res[rid].value - v);
    }
  }

  function canStartResearch(tid) {
    const tdef = defs.tech[tid];
    if (!tdef) return false;
    if (state.tech[tid]) return false;
    if (state.research && typeof state.research === "object" && state.research.tid) return false;

    const prereqOk = (tdef.prereq ?? []).every((p) => Boolean(state.tech[p]));
    const reqOk = typeof tdef.req === "function" ? Boolean(tdef.req(state)) : true;
    if (!prereqOk || !reqOk) return false;
    const cost = getResearchCost(tdef);
    if (!canAfford(cost)) return false;
    return true;
  }

  function startResearchByTid(tid, source = "manual") {
    const tdef = defs.tech[tid];
    if (!tdef) return false;
    if (!canStartResearch(tid)) return false;

    const cost = getResearchCost(tdef);
    pay(cost);
    const t = computeResearchTimeSec(tdef);
    state.research = {
      tid,
      remainingSec: t,
      totalSec: t,
    };
    addLog(`开始研究：${tdef.name}${source === "auto" ? "（自动）" : ""}`);
    render();
    return true;
  }

  function tryAutoResearch() {
    if (!state.unlocks?.autoResearch) return false;
    if (!state.autoResearchOn) return false;
    if (state.research && typeof state.research === "object" && state.research.tid) return false;

    const candidates = [];
    for (const [tid, tdef] of Object.entries(defs.tech)) {
      if (canStartResearch(tid)) {
        candidates.push({ tid, tdef });
      }
    }
    if (candidates.length <= 0) return false;

    const costScore = (tdef) => {
      const cost = getResearchCost(tdef);
      let sum = 0;
      for (const v of Object.values(cost)) {
        if (typeof v === "number" && Number.isFinite(v)) sum += Math.max(0, v);
      }
      return sum;
    };

    const mode = state.autoResearchMode === "cost" ? "cost" : "time";
    let best = candidates[0];
    let bestTime = computeResearchTimeSec(best.tdef);
    let bestCost = costScore(best.tdef);

    for (let i = 1; i < candidates.length; i += 1) {
      const c = candidates[i];
      const t = computeResearchTimeSec(c.tdef);
      const k = costScore(c.tdef);

      if (mode === "time") {
        if (t < bestTime || (t === bestTime && k < bestCost)) {
          best = c;
          bestTime = t;
          bestCost = k;
        }
      } else {
        if (k < bestCost || (k === bestCost && t < bestTime)) {
          best = c;
          bestTime = t;
          bestCost = k;
        }
      }
    }

    return startResearchByTid(best.tid, "auto");
  }

  // ===== SECTION:RESOURCES — addRes / getPokeballMakeCost — 维护者窗口A =====
  function addRes(rid, amount) {
    const r = state.res[rid];
    if (!r) return;
    const def = defs.resources[rid];
    if (def && def.noCap) {
      r.value = Math.max(0, r.value + amount);
      if (ui.activeTab === "future") ui.futureDirty = true;
      if (ui.activeTab === "capture") ui.captureDirty = true;
      if (ui.activeTab === "mons") ui.monsDirty = true;
      return;
    }
    r.value = clamp(r.value + amount, 0, r.cap);
    if (ui.activeTab === "future") ui.futureDirty = true;
    if (ui.activeTab === "capture") ui.captureDirty = true;
    if (ui.activeTab === "mons") ui.monsDirty = true;
  }

  function getPokeballMakeCost(qty = 1, opts = null) {
    return getPokeballMakeCost0(qty, state, ui, opts, defs);
  }

  // ===== SECTION:COMPUTE_DERIVED — computeDerived主函数 — 维护者窗口A =====
  function computeDerived() {
    const eff = accumulateBuildingEffects(state, defs);
    const techEff = computeTechEffects();
    applyTechAndServerCapToEff(eff, techEff, serverBuffMul("resCap"));
    eff.unlockPokeball = Boolean(state.tech.pokeballBasics);

    const caps = computeBaseResourceCaps(defs, eff);
    const permCapMul = permanentBoostMul(state.permanentBoosts?.capacity);
    applyCoreResourceCaps(state, caps, eff.unlockPokeball, permCapMul);
    applyStaticItemCaps(state, computeStaticItemCaps(defs));

    state.unlocks.wood = Boolean(eff.unlockWood);
    state.unlocks.minerals = Boolean(eff.unlockMinerals);
    state.unlocks.pokeball = Boolean(eff.unlockPokeball);

    // After caps applied: one-time starter pack so first catch isn't blocked by wood/hut farm.
    // (Previously granting inside tick lost balls when pokeball.cap was reset to 0 here.)
    if (eff.unlockPokeball) {
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      state.res.pokeball.cap = Math.max(Number(state.res.pokeball.cap) || 0, 10);
      if (!state.meta.starterBallsGranted) {
        // Skip grant for saves that already progressed past the tutorial pack
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
          try {
            addLog("精灵球基础生效：赠送精灵球×5与球果×24，可直接去捕捉。", true);
          } catch {
            // ignore
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

  renderFunctionsImpl = createRenderFunctions({
    elFunctionsTraining,
    ui,
    TYPE_ZH,
    getPokeApiDataByDex,
    clamp,
    escapeHtml,
    fmtDuration,
    expNeedForLevel0,
    monPower,
    renderPokemonIcon,
    markFunctionsDirty,
    markMonListDirty,
    addLog,
    render,
    getState: () => state,
  });

  renderPve = createRenderPve({
    elPveList,
    ui,
    clamp,
    escapeHtml,
    monPower,
    renderPokemonIcon,
    getMonCurrentStats,
    getPokeApiDataByDex,
    markPveDirty,
    addLog,
    addRes,
    addExpToMon,
    render,
    getState: () => state,
    TYPE_ZH,
    dexCaughtUnique,
  });

  // ===== SECTION:RENDER_FUNCTIONS — renderFunctions — 维护者窗口C =====
  function renderFunctions() {
    return renderFunctionsImpl();
  }

  function markMonListDirty(resetPage = false) {
    ui.monsDirty = true;
    ui.functionsDirty = true;
    if (resetPage) ui.monPage = 0;
    if (ui.activeTab === "mons") renderMons();
  }

  const renderResources = createRenderResources({
    elResources,
    defs,
    fmt,
    getState: () => state,
  });

  const renderBuildings = createRenderBuildings({
    elBuildings,
    defs,
    canAfford,
    getBuildingCost,
    getState: () => state,
  });

  const renderTech = createRenderTech({
    elTech,
    elAutoResearchToggle,
    elAutoResearchMode,
    elResearchEff,
    defs,
    canAfford,
    computeResearchTimeSec,
    fmtDuration,
    getResearchEfficiency,
    getState: () => state,
  });

  const dailySignin = createDailySignin({
    state,
    addRes,
    addLog,
  });

  const monthlyCard = createMonthlyCard({
    state,
    addRes,
    addLog,
  });

  const dailyTasks = createDailyTasks({
    state,
    addRes,
    addLog,
  });

  renderFutureShop = createRenderFutureShop({
    elFutureShop,
    ui,
    defs,
    fmt,
    getState: () => state,
    dailySignin,
    monthlyCard,
  });

  renderDailyTasks = createRenderDailyTasks({
    elDailyTasks,
    ui,
    fmt,
  });

  const tick = createTick({
    ui,
    defs,
    computeDerived,
    addRes,
    addLog,
    tryAutoResearch,
    markMonsDirty,
    addExpToMon,
    createMonInstance,
    getServerBuffLevel,
    getSpeciesByPid,
    BUILDING_MAX_LEVEL,
    getBuildingCost,
    canAfford,
    pay,
    getPokeballMakeCost,
    getState: () => state,
  });

  renderCapture = createRenderCapture({
    elCaptureArea,
    elCaptureInfo,
    elCaptureActions,
    ui,
    getState: () => state,
    clamp,
    randFloat,
    getPokeballMakeCost,
    canAfford,
    pay,
    addRes,
    addLog,
    render,
    markCaptureDirty,
    getCapturePool,
    getMythicPool,
    pickRandomFromPool,
    getSpeciesByPid,
    computeTechEffects,
    baseCatchChanceByDex,
    awardCaughtPokemon,
    doCatch,
    pushTickerEvent,
  });

  const renderBonfireActions = createRenderBonfireActions({
    elBonfireActions,
    elBtnGather,
    ui,
    getState: () => state,
  });

  // ===== SECTION:CAPTURE_AWARD — pickRandomPokemon / awardCaughtPokemon / doCatch — 维护者窗口B =====
  function pickRandomPokemon() {
    const pool = defs.pokemon;
    return pickRandomFromPool(pool);
  }

  function awardCaughtPokemon(p, opts = null) {
    const isShiny = Boolean(opts && typeof opts === "object" && opts.isShiny);
    const caught = state.dex.caught;
    const prev = typeof caught[p.id] === "number" ? caught[p.id] : 0;
    caught[p.id] = prev + 1;

    const prevCatch = typeof state.catchCount === "number" && Number.isFinite(state.catchCount) ? state.catchCount : 0;
    state.catchCount = Math.max(0, Math.floor(prevCatch)) + 1;
    if (isShiny) {
      const prevShiny = typeof state.shinyCount === "number" && Number.isFinite(state.shinyCount) ? state.shinyCount : 0;
      state.shinyCount = Math.max(0, Math.floor(prevShiny)) + 1;
    }

    if (!state.mons) state.mons = { nextId: 1, list: [] };
    const mon = createMonInstance(p);
    mon.isShiny = isShiny;
    const caughtWithBall = opts && typeof opts === "object" && typeof opts.ballType === "string" ? opts.ballType : "pokeball";
    mon.caughtWith = caughtWithBall;
    state.mons.list.push(mon);
    state.mons.nextId = Math.max(state.mons.nextId, mon.id + 1);

    ui.dexDirty = true;
    ui.captureDirty = true;
    ui.monsDirty = true;
    ui.functionsDirty = true;

    if (prev === 0) {
      addLog(`图鉴登记：${p.name}（首次捕获）`, true);
    } else {
      addLog(`捕获：${p.name} +1`);
    }

    if (prev === 0 && (p.tier === "rare" || p.tier === "epic") && typeof pushTickerEvent === "function") {
      pushTickerEvent("catch", `捕捉成功 ${p.name}`);
    }
    if (prev === 0 && p.tier === "epic" && typeof pushTickerEvent === "function") pushTickerEvent("mythic", `捕捉到神兽 ${p.name}`);
    if (isShiny && typeof pushTickerEvent === "function") pushTickerEvent("shiny", `捕捉到闪光 ${p.name}`);

    if (isShiny) {
      addLog(`！！！闪光入队：${p.name}！！！`, true);
    }

    // 自动分享成就
    if (socialTab && ui.lbUid) {
      const tier = getPokemonTier(p.id);
      const tierNum = tier === "common" ? 5 : tier === "uncommon" ? 4 : tier === "rare" ? 3 : tier === "epic" ? 2 : tier === "legendary" ? 1 : 6;
      
      // 分享稀有精灵或闪光精灵
      if (tierNum <= 2 || isShiny) {
        socialTab.autoShareAchievement("rare_catch", {
          name: p.name,
          pid: p.id,
          tier: tierNum,
          isShiny: isShiny,
        });
      }

      // 图鉴里程碑（首次捕获时检查）
      if (prev === 0) {
        const dexCount = dexCaughtUnique();
        if (dexCount % 50 === 0 && dexCount > 0) {
          socialTab.autoShareAchievement("dex_milestone", {
            count: dexCount,
          });
        }
      }

      // 闪光里程碑
      if (isShiny) {
        const shinyCount = state.shinyCount || 0;
        if (shinyCount % 10 === 0 && shinyCount > 0) {
          socialTab.autoShareAchievement("shiny_milestone", {
            count: shinyCount,
          });
        }
      }
    }
  }

  function doCatch() {
    if (state.res.pokeball.value < 1) return;
    state.res.pokeball.value = Math.max(0, state.res.pokeball.value - 1);

    const pool = getCapturePool();
    if (!pool || pool.length === 0) {
      addLog("捕捉失败：该区域没有可捕捉的宝可梦。");
      return;
    }
    const p = pickRandomFromPool(pool);

    const techEff = computeTechEffects();
    const base = baseCatchChanceByDex(p.dex);
    const add = typeof techEff.catchChanceAdd === "number" ? techEff.catchChanceAdd : 0;
    const dragonRem =
      typeof state.skills?.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec)
        ? Math.max(0, state.skills.dragonCatchBoostRemainingSec)
        : 0;
    const dragonAdd = dragonRem > 0 ? 0.1 : 0;
    // 科技加成递减边际：前20%线性，之后逐渐衰减（避免common精灵接近100%）
    const addRaw = add + dragonAdd;
    const addSoft = addRaw <= 0.2 ? addRaw : 0.2 + (addRaw - 0.2) * 0.4;
    const baseWithTech = base * Math.max(1, 1 + addSoft);
    const fails = typeof state.rng?.catchFails === "number" ? state.rng.catchFails : 0;
    const pity = Math.min(0.02 * Math.max(0, Math.floor(fails)), 0.15);
    const capByTier = p.tier === "epic" ? 0.98 : p.tier === "rare" ? 0.92 : p.tier === "uncommon" ? 0.85 : 0.75;
    let chance = clamp(baseWithTech + pity, 0, capByTier);
    if (randFloat() > chance) {
      if (!state.rng) state.rng = { catchFails: 0 };
      state.rng.catchFails = Math.max(0, (state.rng.catchFails ?? 0) + 1);
      addLog("捕捉失败：宝可梦逃走了。");
      return;
    }

    if (!state.rng) state.rng = { catchFails: 0 };
    state.rng.catchFails = 0;
    awardCaughtPokemon(p);
  }

  // ===== SECTION:TAB_AND_RENDER_WIRE — render*/init*Tab / leaderboard listeners — 维护者窗口A/C =====

  renderCapture = createRenderCapture({
    elCaptureInfo,
    elCaptureActions,
    elCaptureArea,
    elCaptureChance,
    ui,
    defs,
    getState: () => state,
    clamp,
    escapeHtml,
    renderPokemonIcon,
    ensureCaptureAreaValid,
    getCaptureAreas,
    getUnlockedCaptureAreas,
    getActiveCaptureArea,
    dexCaughtUnique,
    getPokeballMakeCost,
    canAfford,
    computeTechEffects,
    baseCatchChanceByDex,
    getSpeciesByPid,
  });

  renderMons = createRenderMons({
    elMonList,
    elMonDetail,
    elMonBack,
    elMonRegion,
    elMonType,
    elMonPrev,
    elMonNext,
    elMonPageInfo,
    ui,
    clamp,
    escapeHtml,
    pad3,
    renderPokemonIcon,
    TYPE_ZH,
    TYPE_SKILLS,
    monPower,
    clampStar,
    renderStars,
    getStarUpgradeNeed,
    getStarUpgradeGate,
    meetsStarUpgradeGate,
    isSameEvoFamily,
    getMonCurrentStats,
    expNeedForLevel,
    getPokeApiDataByDex,
    getEvoMap,
    stageIndex,
    getSpeciesByPid,
    getEvoReqLevel,
    defaultReqLvlByStage,
    isTradeEvo,
    isAffectionEvo,
    getState: () => state,
  });

  initMonsTab({
    elMonBack,
    elMonList,
    elMonDetail,
    elMonRegion,
    elMonType,
    elMonSort,
    elMonPrev,
    elMonNext,
    ui,
    clamp,
    TYPE_ZH,
    TYPE_SKILLS,
    monPower,
    clampStar,
    getStarUpgradeNeed,
    getStarUpgradeGate,
    meetsStarUpgradeGate,
    isSameEvoFamily,
    stageIndex,
    getEvoReqLevel,
    defaultReqLvlByStage,
    isTradeEvo,
    isAffectionEvo,
    evolveMon,
    addRes,
    addLog,
    render,
    markMonsDirty,
    markMonListDirty,
    getState: () => state,
    pushTickerEvent,
    lbFetchJson,
    lbBaseUrl,
    onBossBullyMaybeReward,
  });

  initFunctionsTab({
    elFunctionsTraining,
    ui,
    clamp,
    fmtDuration,
    monPower,
    getPokeApiDataByDex,
    markFunctionsDirty,
    markMonListDirty,
    addLog,
    render,
    getState: () => state,
  });

  initLeaderboardTab({
    elLeaderboard,
    ui,
    LB_NAME_KEY,
    LB_AVATAR_KEY,
    avatarFileToDataUrl,
    markLeaderboardDirty,
    render,
    submitScoreAndRefresh,
  });

  initFutureTab({
    elFutureShop,
    ui,
    defs,
    getState: () => state,
    addRes,
    addLog,
    render,
    dailySignin,
    monthlyCard,
  });

  renderDex = createRenderDex({
    elDexSummary,
    elDexList,
    elDexPrev,
    elDexNext,
    elDexPageInfo,
    elDexArea,
    elDexRegionInfo,
    ui,
    defs,
    getState: () => state,
    clamp,
    pad3,
    escapeHtml,
    renderPokemonIcon,
    dexCaughtCount,
    computeDexEffects,
    getCaptureAreas,
  });

  const renderLog = createRenderLog({
    elLog,
    escapeHtml,
    getState: () => state,
  });

  var renderQueued = false;
  // ===== SECTION:RENDER_AND_SAVE — render() / save() / load() / boot() — 维护者窗口A =====
  function render() {
    if (renderQueued) return;
    renderQueued = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 0);
    schedule(() => {
      renderQueued = false;
      const eff = computeDerived();
      renderResources(eff);

      // Tab 阶段性解锁：核心路径尽早可见，重玩法仍按进度开门
      (function updateTabVisibility() {
        const caught = state.dex?.caught ?? {};
        let unique = 0;
        for (const v of Object.values(caught)) if (typeof v === "number" && v > 0) unique++;
        const pokeballUnlocked = Boolean(state.unlocks?.pokeball);
        const hasMons = (state.mons?.list?.length ?? 0) > 0;
        const tabRules = {
          capture:     true,
          mons:        pokeballUnlocked || hasMons,
          functions:   pokeballUnlocked || hasMons,
          items:       pokeballUnlocked || hasMons,
          pve:         unique >= 5,
          dex:         true,
          future:      unique >= 1,
          social:      true,
          leaderboard: true,
          science:     true,
          bonfire:     true,
          help:        true,
          options:     true,
        };
        document.querySelectorAll(".tab[data-tab]").forEach((tabEl) => {
          const tabName = tabEl.getAttribute("data-tab");
          const visible = tabRules[tabName] !== false;
          tabEl.setAttribute("data-unlocked", visible ? "1" : "0");
        });
        if (typeof tabController?.refreshTabChrome === "function") {
          tabController.refreshTabChrome();
        }
      })();
      if (ui.bonfireDirty) renderBonfireActions();
      if (ui.activeTab === "bonfire") renderBuildings();
      if (ui.activeTab === "science") renderTech();
      if (ui.activeTab === "capture") renderCapture();
      if (ui.activeTab === "functions") renderFunctions();
      if (ui.activeTab === "leaderboard") renderLeaderboard();
      if (ui.activeTab === "future") renderFutureShop();
      if (ui.activeTab === "mons") renderMons();
      if (ui.activeTab === "dex") renderDex();
      if (ui.activeTab === "pve") renderPve();
      renderServerBuffBar();
      renderOverlays();
      const logCollapsed = elLog && elLog.classList.contains("is-collapsed");
      if (!logCollapsed && ui.logDirty) {
        renderLog();
        ui.logDirty = false;
      }
    });
  }

  function save() {
    if (!autosaveEnabled) return;
    try {
      const payload = serializeState(state);
      const next = encodeSaveText(JSON.stringify(payload));
      try {
        const prev = readLocalStorage(STORAGE_KEY);
        if (prev && prev !== next) localStorage.setItem(STORAGE_BACKUP_KEY, prev);
      } catch {
        // ignore
      }
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  function load() {
    try {
      const raw0 = localStorage.getItem(STORAGE_KEY);
      if (!raw0) return null;
      const raw = decodeSaveText(raw0);
      return loadFromRaw(raw);
    } catch {
      return null;
    }
  }

  function boot() {
    ensureTickerPolling();
    ensureBossBullyPolling();
    ensureServerBuffsPolling();
    computeDerived();

    ui.leaderboardDirty = true;
    ui.serverBuffsDirty = true;
    ui.bossDirty = true;

    refreshCloudUI();
    cloudSave.installLifecycleFlush();
    if (cloudSave.getToken()) {
      doCloudSyncNow();
    }

    try {
      if (typeof renderDailyTasks?.refresh === "function") renderDailyTasks.refresh();
    } catch {
    }

    if (!autosaveEnabled) {
      addLog("检测到存档读取失败：已暂停自动存档以防覆盖。请使用云存档恢复。", true);
    }

    // 新手引导系统
    initGuideSystem({ getState: () => state });

    // Tab 红点系统
    const elTabsEl = document.querySelector(".tabs");
    const tabBadges = createTabBadgeSystem({ elTabs: elTabsEl, getState: () => state, defs });
    // 每5秒刷新一次红点
    setInterval(() => tabBadges.updateBadges(), 5000);
    tabBadges.updateBadges();

    if (elBtnCloudLogin) {
      elBtnCloudLogin.addEventListener("click", async () => {
        try {
          const u = elCloudUsername ? String(elCloudUsername.value || "").trim() : "";
          const p = elCloudPassword ? String(elCloudPassword.value || "").trim() : "";
          if (!u || !p) {
            setCloudStatus("请输入用户名和密码");
            return;
          }
          setCloudStatus("登录中...");
          await cloudSave.login(u, p);
          await doCloudSyncNow();
        } catch (e) {
          const msg = typeof e?.message === "string" ? e.message : "登录失败";
          setCloudStatus(`登录失败：${msg}`);
        }
      });
    }

    if (elBtnCloudRegister) {
      elBtnCloudRegister.addEventListener("click", async () => {
        try {
          const u = elCloudUsername ? String(elCloudUsername.value || "").trim() : "";
          const p = elCloudPassword ? String(elCloudPassword.value || "").trim() : "";
          if (!u || !p) {
            setCloudStatus("请输入用户名和密码");
            return;
          }
          setCloudStatus("注册中...");
          await cloudSave.register(u, p);
          await doCloudSyncNow();
        } catch (e) {
          const msg = typeof e?.message === "string" ? e.message : "注册失败";
          setCloudStatus(`注册失败：${msg}`);
        }
      });
    }

    if (elBtnCloudLogout) {
      elBtnCloudLogout.addEventListener("click", async () => {
        setCloudStatus("退出中...");
        await cloudSave.logout();
        refreshCloudUI();
      });
    }

    if (elBtnCloudSyncNow) {
      elBtnCloudSyncNow.addEventListener("click", async () => {
        await doCloudSyncNow();
      });
    }

    if (elBtnSaveExport) {
      elBtnSaveExport.addEventListener("click", () => exportSaveJson());
    }
    if (elBtnSaveImport && elSaveImportFile) {
      elBtnSaveImport.addEventListener("click", () => elSaveImportFile.click());
      elSaveImportFile.addEventListener("change", () => {
        const f = elSaveImportFile.files && elSaveImportFile.files[0];
        elSaveImportFile.value = "";
        importSaveJsonFile(f);
      });
    }

    const last = state.t;
    const dt = clamp((nowMs() - last) / 1000, 0, 60 * 60 * 6);
    if (dt > 2) {
      const before = {
        catnip: state.res.catnip.value,
        wood: state.res.wood.value,
        minerals: state.res.minerals.value,
        pokeball: state.res.pokeball.value,
      };

      tick(dt, { offline: true });

      const dCat = state.res.catnip.value - before.catnip;
      const dWood = state.res.wood.value - before.wood;
      const dMin = state.res.minerals.value - before.minerals;
      const dBall = state.res.pokeball.value - before.pokeball;

      const parts = [];
      if (dCat > 0) parts.push(`树果 +${fmt(dCat)}`);
      if (dWood > 0) parts.push(`球果 +${fmt(dWood)}`);
      if (dMin > 0) parts.push(`进化石碎片 +${fmt(dMin)}`);
      if (dBall > 0) parts.push(`精灵球 +${fmt(dBall)}`);
      if (parts.length > 0) addLog(`离线收益：${parts.join("，")}`);
    }

    if (autosaveEnabled) {
      try {
        const today = formatLocalYmd();
        const last = readLocalStorage(DAILY_LOGIN_REWARD_KEY);
        if (last !== today) {
          localStorage.setItem(DAILY_LOGIN_REWARD_KEY, today);
          addRes("pokeball", 20);
          addRes("evolutionStone", 1);
          const gotMb = randFloat() < 0.05;
          if (gotMb) addRes("masterball", 1);
          addLog(gotMb ? "每日登录奖励：精灵球 +20，进化石 +1，额外 大师球 +1" : "每日登录奖励：精灵球 +20，进化石 +1", true);
          hint(gotMb ? "今日登录奖励已发放，获得大师球！" : "今日登录奖励已发放。", 3000);
          save();
        }
      } catch {
        // ignore
      }
    }

    // 初始化好友系统
    const friendsSystem = createFriendsSystem({
      lbBaseUrl,
      lbFetchJson,
      ui,
      addLog,
      render,
    });

    const renderFriends = createRenderFriends({
      ui,
      escapeHtml,
      friendsSystem,
    });

    // 初始化社交系统
    const socialSystem = createSocialSystem({
      lbBaseUrl,
      lbFetchJson,
      ui,
      addLog,
    });

    const renderSocial = createRenderSocial({
      ui,
      escapeHtml,
      socialSystem,
      formatTime: (ts) => {
        const now = Date.now();
        const diff = now - ts;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if (diff < minute) return "刚刚";
        if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
        if (diff < day) return `${Math.floor(diff / hour)}小时前`;
        if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
        const date = new Date(ts);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      },
    });

    const socialTabInstance = createSocialTab({
      ui,
      addLog,
      socialSystem,
      renderSocial,
      friendsSystem,
      state,
      createPvpBattle,
      getMonCurrentStats,
      getPokeApiDataByDex,
    });

    // 赋值给全局变量以便其他函数使用
    socialTab = socialTabInstance;

    // 初始化社交标签页
    socialTab.setupSocialTab();

    render();

    // 默认落在 Bonfire 标签页
    activateTab("bonfire");

    let lastFrame = nowMs();
    window.setInterval(() => {
      const t = nowMs();
      let dtSec = clamp((t - lastFrame) / 1000, 0, 60 * 60 * 6);
      lastFrame = t;

      const chunkSec = 60;
      while (dtSec > 0) {
        const step = Math.min(chunkSec, dtSec);
        tick(step);
        dtSec -= step;
      }
      state.t = t;
      render();
    }, 500);

    if (autosaveEnabled) {
      window.setInterval(() => {
        save();
      }, 3000);
    }

    addLog("冒险开始。", true);
  }

  boot();
})();
