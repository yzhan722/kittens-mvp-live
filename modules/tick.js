import { clamp, randFloat } from "./utils.js";
import { runAutomation } from "./automation.js?v=0.31.4";
import { eraEncounterRechargeMul } from "./systems/era.js";
import {
  pickBreedEventCard,
  pickExpeditionEventCard,
  resolveSeasonId,
  tickExpeditionMilestones,
} from "./systems/expedition.js";
import {
  bumpSessionExpedition,
  natureAffectionMul,
  natureBreedTimeMul,
  natureEncounterRechargeMul,
  natureResearchDtMul,
  natureSatietyDecayMul,
  natureSatietyRegenMul,
  natureTrainExpMul,
  noteExpeditionDailyDone,
} from "./systems/gameplay_fun.js";
import { noteSeasonRelic, noteShinySpecies, rollSeasonRelic } from "./systems/collection_fun.js";

export function createTick(ctx) {
  const ui = ctx.ui;
  const defs = ctx.defs;
  const computeDerived = ctx.computeDerived;
  const addRes = ctx.addRes;
  const addLog = ctx.addLog;
  const tryAutoResearch = ctx.tryAutoResearch;
  const markMonsDirty = ctx.markMonsDirty;
  const addExpToMon = ctx.addExpToMon;
  const createMonInstance = ctx.createMonInstance;
  const getServerBuffLevel = ctx.getServerBuffLevel;
  const getSpeciesByPid = ctx.getSpeciesByPid;
  const BUILDING_MAX_LEVEL = ctx.BUILDING_MAX_LEVEL;
  const getBuildingCost = ctx.getBuildingCost;
  const canAfford = ctx.canAfford;
  const pay = ctx.pay;
  const getPokeballMakeCost = ctx.getPokeballMakeCost;
  const getState = ctx.getState;
  const pushTickerEvent = ctx.pushTickerEvent;
  const onResearchComplete = ctx.onResearchComplete;

  // Cached monById/aliveSet — only rebuilt when mons list changes
  let __cachedMonById = null;
  let __cachedAliveSet = null;
  let __cachedMonsLen = -1;
  let __cachedNextId = -1;

  function getMonMaps(mons, nextId) {
    const len = mons.length;
    if (__cachedMonById && len === __cachedMonsLen && nextId === __cachedNextId) {
      return { monById: __cachedMonById, aliveSet: __cachedAliveSet };
    }
    const monById = new Map();
    const aliveSet = new Set();
    for (const m of mons) {
      if (!m || typeof m !== "object") continue;
      const id = typeof m.id === "number" && Number.isFinite(m.id) ? m.id : null;
      if (id === null) continue;
      monById.set(id, m);
      aliveSet.add(id);
    }
    __cachedMonById = monById;
    __cachedAliveSet = aliveSet;
    __cachedMonsLen = len;
    __cachedNextId = nextId;
    return { monById, aliveSet };
  }

  function ensureExpeditionState(state) {
    if (!state.expedition || typeof state.expedition !== "object") {
      state.expedition = {
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
    }
    if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
    if (!Array.isArray(state.expedition.activeIds)) state.expedition.activeIds = [];
  }

  function regenExpeditionDungeons(state) {
    ensureExpeditionState(state);
    const typeMap = globalThis.TYPE_ZH;
    const types = typeMap && typeof typeMap === "object" ? Object.keys(typeMap) : [];
    if (types.length <= 0) return;

    const pick3 = () => {
      const picks = [];
      const seen = new Set();
      let guard = 0;
      while (picks.length < 3 && guard < 200) {
        guard += 1;
        const t = types[Math.floor(Math.random() * types.length)];
        if (!t || seen.has(t)) continue;
        seen.add(t);
        picks.push({ key: `${t}_${Math.floor(Math.random() * 1e9)}`, type: t });
      }
      return picks;
    };

    state.expedition.dungeons = {
      basic: pick3(),
      intermediate: pick3(),
      advanced: pick3(),
      super: pick3(),
      master: pick3(),
    };

    const lvl = typeof state.expedition.selectedLevel === "string" && state.expedition.selectedLevel ? state.expedition.selectedLevel : "basic";
    const list = state.expedition.dungeons?.[lvl];
    const picks = Array.isArray(list) ? list : [];
    const curKey = typeof state.expedition.selectedDungeonKey === "string" ? state.expedition.selectedDungeonKey : null;
    if (!curKey || !picks.some((x) => x && x.key === curKey)) {
      state.expedition.selectedDungeonKey = picks[0]?.key ?? null;
    }
  }

  let __evoPrev = null;
  function __getEvoPrev() {
    if (__evoPrev) return __evoPrev;
    const evo = globalThis.POKEMON_EVO;
    const prev = {};
    if (evo && typeof evo === "object") {
      for (const [from, tos] of Object.entries(evo)) {
        if (!Array.isArray(tos)) continue;
        for (const to of tos) {
          if (typeof to !== "string") continue;
          if (!prev[to]) prev[to] = from;
        }
      }
    }
    __evoPrev = prev;
    return __evoPrev;
  }

  function getBasePid(pid) {
    if (!pid || typeof pid !== "string") return null;
    const prev = __getEvoPrev();
    let cur = pid;
    let guard = 0;
    while (prev[cur] && guard < 6) {
      cur = prev[cur];
      guard += 1;
    }
    return cur;
  }

  function sameFamily(pidA, pidB) {
    if (!pidA || !pidB) return false;
    if (pidA === pidB) return true;
    return getBasePid(pidA) === getBasePid(pidB);
  }

  function breedingEggTotalSec(lvl) {
    const l = Math.max(0, Math.min(10, Math.floor(typeof lvl === "number" && Number.isFinite(lvl) ? lvl : 0)));
    if (l <= 0) return 0;
    // 优化：基础时间从12h降为6h，epic精灵乘数从×10降为×4（约1天/只，可接受）
    const hours = Math.max(1, 7 - l);
    return hours * 3600;
  }

  function ensureBreedingState(state) {
    if (!state.breeding || typeof state.breeding !== "object") {
      state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
    }
  }

  function stopBreeding(state) {
    ensureBreedingState(state);
    state.breeding.on = false;
    state.breeding.eggRemainingSec = 0;
    state.breeding.eggTotalSec = 0;
  }

  function getMonById(mons, monById, id) {
    if (!id) return null;
    if (monById && typeof monById.get === "function") {
      return monById.get(id) ?? null;
    }
    return mons.find((m) => m && m.id === id) ?? null;
  }

  function ensureEggTimer(state, mons, monById) {
    ensureBreedingState(state);
    if (!state.breeding.on) return;
    const lvl = state.buildings?.breedingHouse?.owned ?? 0;
    if (lvl <= 0) return;
    const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
    const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
    if (!aId || !bId || aId === bId) {
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      return;
    }
    const a = getMonById(mons, monById, aId);
    const b = getMonById(mons, monById, bId);
    if (!a || !b) {
      stopBreeding(state);
      return;
    }

    const dittoPid = "p132";
    const eligible = a.pid === dittoPid || b.pid === dittoPid || sameFamily(a.pid, b.pid);
    if (!eligible) {
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      return;
    }

    if ((state.breeding.eggRemainingSec ?? 0) > 0) return;
    let t = breedingEggTotalSec(lvl) * natureBreedTimeMul(state);
    let basePid = null;
    if (a.pid === dittoPid && b.pid !== dittoPid) basePid = getBasePid(b.pid);
    else if (b.pid === dittoPid && a.pid !== dittoPid) basePid = getBasePid(a.pid);
    else if (sameFamily(a.pid, b.pid)) basePid = getBasePid(a.pid);
    const sp = basePid && typeof getSpeciesByPid === "function" ? getSpeciesByPid(basePid) : null;
    if (sp && sp.tier === "epic") t *= 4; // 优化：epic孵蛋时间从×10降为×4（约1天可得）
    state.breeding.eggTotalSec = t;
    state.breeding.eggRemainingSec = t;
  }

  function hatchEgg(state, mons, monById) {
    ensureBreedingState(state);
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

  const decArr = (arr, dtSec) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const out = [];
    for (const x of arr) {
      const v0 = typeof x === "number" && Number.isFinite(x) ? x : 0;
      const v1 = v0 - dtSec;
      if (v1 > 0) out.push(v1);
    }
    return out;
  };

  const applyPsychicCraftBoost = (state, sec) => {
    const charges0 =
      typeof state.skills?.psychicCraftBoostCharges === "number" && Number.isFinite(state.skills.psychicCraftBoostCharges)
        ? Math.max(0, Math.floor(state.skills.psychicCraftBoostCharges))
        : 0;
    if (charges0 <= 0) return sec;
    state.skills.psychicCraftBoostCharges = charges0 - 1;
    return Math.max(1, Math.ceil(sec * 0.8));
  };

  return function tick(dtSec, opts = null) {
    const offline = Boolean(opts && typeof opts === "object" && opts.offline);
    const state = getState();
    // 累加游戏总时长（仅非离线计算时）
    if (!offline && typeof state.totalPlayMs === "number") {
      state.totalPlayMs += dtSec * 1000;
    }

    const eff = computeDerived();

    if (!state.skills || typeof state.skills !== "object") {
      state.skills = {
        trainingStacks: [],
        normalBoostStacks: [],
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
    }
    const trainStacks0 = Array.isArray(state.skills.trainingStacks) ? state.skills.trainingStacks : [];
    const normalStacks0 = Array.isArray(state.skills.normalBoostStacks) ? state.skills.normalBoostStacks : [];
    const trainStacks1 = decArr(trainStacks0, dtSec);
    const normalStacks1 = decArr(normalStacks0, dtSec);
    if (trainStacks1.length !== trainStacks0.length) {
      state.skills.trainingStacks = trainStacks1;
      if (ui.activeTab === "functions") ui.functionsDirty = true;
    } else {
      state.skills.trainingStacks = trainStacks1;
    }
    state.skills.normalBoostStacks = normalStacks1;

    const huge0 =
      typeof state.skills.hugeBerryBuffRemainingSec === "number" && Number.isFinite(state.skills.hugeBerryBuffRemainingSec)
        ? state.skills.hugeBerryBuffRemainingSec
        : 0;
    const huge1 = huge0 > 0 ? Math.max(0, huge0 - dtSec) : 0;
    if (huge1 !== huge0) state.skills.hugeBerryBuffRemainingSec = huge1;

    const ice0 =
      typeof state.skills.iceSatietySlowRemainingSec === "number" && Number.isFinite(state.skills.iceSatietySlowRemainingSec)
        ? state.skills.iceSatietySlowRemainingSec
        : 0;
    const ice1 = ice0 > 0 ? Math.max(0, ice0 - dtSec) : 0;
    if (ice1 !== ice0) state.skills.iceSatietySlowRemainingSec = ice1;

    const fairy0 =
      typeof state.skills.fairyAffGainRemainingSec === "number" && Number.isFinite(state.skills.fairyAffGainRemainingSec)
        ? state.skills.fairyAffGainRemainingSec
        : 0;
    const fairy1 = fairy0 > 0 ? Math.max(0, fairy0 - dtSec) : 0;
    if (fairy1 !== fairy0) state.skills.fairyAffGainRemainingSec = fairy1;

    const dragon0 =
      typeof state.skills.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec)
        ? state.skills.dragonCatchBoostRemainingSec
        : 0;
    const dragon1 = dragon0 > 0 ? Math.max(0, dragon0 - dtSec) : 0;
    if (dragon1 !== dragon0) state.skills.dragonCatchBoostRemainingSec = dragon1;

    const rock0 =
      typeof state.skills.rockBuildBoostRemainingSec === "number" && Number.isFinite(state.skills.rockBuildBoostRemainingSec)
        ? state.skills.rockBuildBoostRemainingSec
        : 0;
    const rock1 = rock0 > 0 ? Math.max(0, rock0 - dtSec) : 0;
    if (rock1 !== rock0) state.skills.rockBuildBoostRemainingSec = rock1;

    const poison0 =
      typeof state.skills.poisonResourceSaveRemainingSec === "number" && Number.isFinite(state.skills.poisonResourceSaveRemainingSec)
        ? state.skills.poisonResourceSaveRemainingSec
        : 0;
    const poison1 = poison0 > 0 ? Math.max(0, poison0 - dtSec) : 0;
    if (poison1 !== poison0) state.skills.poisonResourceSaveRemainingSec = poison1;

    const dark0 =
      typeof state.skills.darkPveDamageBoostRemainingSec === "number" && Number.isFinite(state.skills.darkPveDamageBoostRemainingSec)
        ? state.skills.darkPveDamageBoostRemainingSec
        : 0;
    const dark1 = dark0 > 0 ? Math.max(0, dark0 - dtSec) : 0;
    if (dark1 !== dark0) state.skills.darkPveDamageBoostRemainingSec = dark1;

    const expBoost0 =
      typeof state.expBoostRemainingSec === "number" && Number.isFinite(state.expBoostRemainingSec) ? state.expBoostRemainingSec : 0;
    const expBoost1 = expBoost0 > 0 ? Math.max(0, expBoost0 - dtSec) : 0;
    if (expBoost0 !== expBoost1) {
      state.expBoostRemainingSec = expBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }
    const expBoostOn = expBoost1 > 0;

    const captureBoost0 =
      typeof state.captureBoostRemainingSec === "number" && Number.isFinite(state.captureBoostRemainingSec)
        ? state.captureBoostRemainingSec
        : 0;
    const captureBoost1 = captureBoost0 > 0 ? Math.max(0, captureBoost0 - dtSec) : 0;
    if (captureBoost0 !== captureBoost1) {
      state.captureBoostRemainingSec = captureBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }

    const prodBoost0 =
      typeof state.prodBoostRemainingSec === "number" && Number.isFinite(state.prodBoostRemainingSec)
        ? state.prodBoostRemainingSec
        : 0;
    const prodBoost1 = prodBoost0 > 0 ? Math.max(0, prodBoost0 - dtSec) : 0;
    if (prodBoost0 !== prodBoost1) {
      state.prodBoostRemainingSec = prodBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }

    const shinyCharm0 =
      typeof state.shinyCharmRemainingSec === "number" && Number.isFinite(state.shinyCharmRemainingSec) ? state.shinyCharmRemainingSec : 0;
    const shinyCharm1 = shinyCharm0 > 0 ? Math.max(0, shinyCharm0 - dtSec) : 0;
    if (shinyCharm0 !== shinyCharm1) state.shinyCharmRemainingSec = shinyCharm1;

    const encPlusCharges0 =
      typeof state.encounterPlusCharges === "number" && Number.isFinite(state.encounterPlusCharges) ? state.encounterPlusCharges : 1;
    const encPlusCd0 =
      typeof state.encounterPlusCdSec === "number" && Number.isFinite(state.encounterPlusCdSec) ? state.encounterPlusCdSec : 0;
    const encPlusMaxBonus = typeof state.permanentBoosts?.encPlusMax === "number" ? Math.max(0, Math.min(20, Math.floor(state.permanentBoosts.encPlusMax))) : 0;
    const maxCharges = 10 + encPlusMaxBonus;
    const eraRechargeMul = eraEncounterRechargeMul(state) * natureEncounterRechargeMul(state);
    const rechargeSec = 600 * eraRechargeMul;

    let encPlusCharges1 = Math.max(0, Math.min(maxCharges, Math.floor(encPlusCharges0)));
    let encPlusCd1 = Math.max(0, encPlusCd0);

    // 离线时批量恢复充能，在线时逐tick恢复
    if (offline) {
      const totalOfflineSec = dtSec;
      const remainCd = encPlusCd1 > 0 ? encPlusCd1 : 0;
      const secAfterFirstCharge = Math.max(0, totalOfflineSec - remainCd);
      const firstCharge = (remainCd > 0 && totalOfflineSec >= remainCd) ? 1 : 0;
      const extraCharges = rechargeSec > 0 ? Math.floor(secAfterFirstCharge / rechargeSec) : 0;
      const gained = firstCharge + extraCharges;
      encPlusCharges1 = Math.min(maxCharges, encPlusCharges1 + gained);
      if (encPlusCharges1 >= maxCharges) {
        encPlusCd1 = 0;
      } else if (gained > 0) {
        encPlusCd1 = rechargeSec - (secAfterFirstCharge % rechargeSec);
      } else {
        encPlusCd1 = Math.max(0, encPlusCd1 - totalOfflineSec);
      }
    } else {
      if (encPlusCharges1 >= maxCharges) {
        encPlusCd1 = 0;
      } else {
        if (encPlusCd1 <= 0) {
          encPlusCd1 = rechargeSec;
        } else {
          encPlusCd1 = Math.max(0, encPlusCd1 - dtSec);
          if (encPlusCd1 <= 0) {
            encPlusCharges1 = Math.min(maxCharges, encPlusCharges1 + 1);
            encPlusCd1 = encPlusCharges1 >= maxCharges ? 0 : rechargeSec;
          }
        }
      }
    }

    if (encPlusCharges0 !== encPlusCharges1 || encPlusCd0 !== encPlusCd1) {
      state.encounterPlusCharges = encPlusCharges1;
      state.encounterPlusCdSec = encPlusCd1;
      if (ui.activeTab === "capture") ui.captureDirty = true;
    }

    const gatherCharges0 =
      typeof state.gatherCharges === "number" && Number.isFinite(state.gatherCharges) ? state.gatherCharges : 1000;
    const gatherCd0 = typeof state.gatherCdSec === "number" && Number.isFinite(state.gatherCdSec) ? state.gatherCdSec : 0;
    const gatherMax = 1000;
    const gatherRechargeSec = 10;
    let gatherCharges1 = Math.max(0, Math.min(gatherMax, Math.floor(gatherCharges0)));
    let gatherCd1 = Math.max(0, gatherCd0);

    if (offline) {
      const remainCd = gatherCd1 > 0 ? gatherCd1 : 0;
      const secAfterFirst = Math.max(0, dtSec - remainCd);
      const firstCharge = (remainCd > 0 && dtSec >= remainCd) ? 1 : 0;
      const extraCharges = gatherRechargeSec > 0 ? Math.floor(secAfterFirst / gatherRechargeSec) : 0;
      gatherCharges1 = Math.min(gatherMax, gatherCharges1 + firstCharge + extraCharges);
      if (gatherCharges1 >= gatherMax) {
        gatherCd1 = 0;
      } else if (firstCharge + extraCharges > 0) {
        gatherCd1 = gatherRechargeSec - (secAfterFirst % gatherRechargeSec);
      } else {
        gatherCd1 = Math.max(0, gatherCd1 - dtSec);
      }
    } else {
      if (gatherCharges1 >= gatherMax) {
        gatherCd1 = 0;
      } else {
        if (gatherCd1 <= 0) {
          gatherCd1 = gatherRechargeSec;
        } else {
          gatherCd1 = Math.max(0, gatherCd1 - dtSec);
          if (gatherCd1 <= 0) {
            gatherCharges1 = Math.min(gatherMax, gatherCharges1 + 1);
            gatherCd1 = gatherCharges1 >= gatherMax ? 0 : gatherRechargeSec;
          }
        }
      }
    }

    if (gatherCharges0 !== gatherCharges1 || gatherCd0 !== gatherCd1) {
      state.gatherCharges = gatherCharges1;
      state.gatherCdSec = gatherCd1;
      if (ui) ui.bonfireDirty = true;
    }

    const encCharges0 = typeof state.encounterCharges === "number" && Number.isFinite(state.encounterCharges) ? state.encounterCharges : 100;
    const encCd0 = typeof state.encounterCdSec === "number" && Number.isFinite(state.encounterCdSec) ? state.encounterCdSec : 0;
    const encMax = 100;
    const encRechargeSec = 60 * eraRechargeMul;
    let encCharges1 = Math.max(0, Math.min(encMax, Math.floor(encCharges0)));
    let encCd1 = Math.max(0, encCd0);

    if (offline) {
      const remainCd = encCd1 > 0 ? encCd1 : 0;
      const secAfterFirst = Math.max(0, dtSec - remainCd);
      const firstCharge = (remainCd > 0 && dtSec >= remainCd) ? 1 : 0;
      const extraCharges = encRechargeSec > 0 ? Math.floor(secAfterFirst / encRechargeSec) : 0;
      encCharges1 = Math.min(encMax, encCharges1 + firstCharge + extraCharges);
      if (encCharges1 >= encMax) {
        encCd1 = 0;
      } else if (firstCharge + extraCharges > 0) {
        encCd1 = encRechargeSec - (secAfterFirst % encRechargeSec);
      } else {
        encCd1 = Math.max(0, encCd1 - dtSec);
      }
    } else {
      if (encCharges1 >= encMax) {
        encCd1 = 0;
      } else {
        if (encCd1 <= 0) {
          encCd1 = encRechargeSec;
        } else {
          encCd1 = Math.max(0, encCd1 - dtSec);
          if (encCd1 <= 0) {
            encCharges1 = Math.min(encMax, encCharges1 + 1);
            encCd1 = encCharges1 >= encMax ? 0 : encRechargeSec;
          }
        }
      }
    }

    if (encCharges0 !== encCharges1 || encCd0 !== encCd1) {
      state.encounterCharges = encCharges1;
      state.encounterCdSec = encCd1;
      if (ui.activeTab === "capture") ui.captureDirty = true;
    }

    if (!offline && state.research && typeof state.research === "object" && state.research.tid) {
      const tid = state.research.tid;
      const tdef = defs.tech?.[tid];
      const rem0 =
        typeof state.research.remainingSec === "number" && Number.isFinite(state.research.remainingSec) ? state.research.remainingSec : 0;
      const rem1 = rem0 - dtSec * natureResearchDtMul(state);
      state.research.remainingSec = rem1;
      if (rem1 <= 0) {
        state.research = null;
        if (tdef && !state.tech[tid]) {
          state.tech[tid] = true;
          addLog(`研究完成：${tdef.name}`);
          if (typeof onResearchComplete === "function") onResearchComplete(tid);
          // Starter balls granted in computeDerived via meta.starterBallsGranted
          tryAutoResearch();
        }
      }
    }

    if (!offline && (!state.research || !(typeof state.research === "object" && state.research.tid))) {
      tryAutoResearch();
    }

    if (!offline) {
      const autoCraftCfg0 =
        state.unlocks?.autoCraft && state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : null;
      const autoCraftWanted = Boolean(autoCraftCfg0 && Object.values(autoCraftCfg0).some((v) => Boolean(v)));
      if (autoCraftWanted && (!state.crafting || typeof state.crafting !== "object")) {
        state.crafting = {
          evolutionEnergy: null,
          evolutionStone: null,
          linkRope: null,
          hugeBerry: null,
          megaStone: null,
        };
      }

      if (state.crafting && typeof state.crafting === "object") {
        if (state.crafting.type) {
          const type0 = state.crafting.type;
          const type = type0 === "evolutionStone" ? "evolutionEnergy" : type0;
          const remainingSec =
            typeof state.crafting.remainingSec === "number" && Number.isFinite(state.crafting.remainingSec) ? state.crafting.remainingSec : 0;
          const totalSec =
            typeof state.crafting.totalSec === "number" && Number.isFinite(state.crafting.totalSec) && state.crafting.totalSec > 0
              ? state.crafting.totalSec
              : remainingSec;
          state.crafting = {
            evolutionEnergy: type === "evolutionEnergy" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            evolutionStone: type === "evolutionStone" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            linkRope: type === "linkRope" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            hugeBerry: type === "hugeBerry" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            megaStone: type === "megaStone" && remainingSec > 0 ? { remainingSec, totalSec } : null,
          };
        }

        const craftObj = state.crafting;
        let any = false;

        if (state.unlocks?.autoCraft) {
          const autoCfg = state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : null;
          if (autoCfg) {
            const canStart = (k) => {
              const t = craftObj?.[k];
              return !(t && typeof t === "object" && typeof t.remainingSec === "number" && t.remainingSec > 0);
            };
            const startTask = (k, totalSec) => {
              const boostedSec = applyPsychicCraftBoost(state, totalSec);
              craftObj[k] = { remainingSec: boostedSec, totalSec: boostedSec };
              if (ui && ui.activeTab === "future") ui.futureDirty = true;
            };

            const canStartEnergy = () => {
              const t0 = craftObj?.evolutionEnergy;
              const t1 = craftObj?.evolutionStone;
              const on0 = Boolean(t0 && typeof t0 === "object" && typeof t0.remainingSec === "number" && t0.remainingSec > 0);
              const on1 = Boolean(t1 && typeof t1 === "object" && typeof t1.remainingSec === "number" && t1.remainingSec > 0);
              return !(on0 || on1);
            };

            if (autoCfg.evolutionEnergy && canStartEnergy()) {
              const made0 =
                typeof state.evolutionStoneMade === "number" && Number.isFinite(state.evolutionStoneMade)
                  ? Math.max(0, Math.floor(state.evolutionStoneMade))
                  : 0;
              const stoneCost = Math.min(10000, 500 + made0 * 10);
              const stoneTime = 1800;
              if ((state.res.minerals?.value ?? 0) >= stoneCost) {
                state.res.minerals.value = Math.max(0, (state.res.minerals?.value ?? 0) - stoneCost);
                startTask("evolutionEnergy", stoneTime);
                addLog("自动合成：进化能量（30分钟）");
              }
            }

            if (autoCfg.linkRope && canStart("linkRope")) {
              const ropeCostStone = 3;
              const ropeTime = 3600;
              if ((state.res.evolutionStone?.value ?? 0) >= ropeCostStone) {
                state.res.evolutionStone.value = Math.max(0, (state.res.evolutionStone?.value ?? 0) - ropeCostStone);
                startTask("linkRope", ropeTime);
                addLog("自动合成：通信绳（60分钟）");
              }
            }

            if (autoCfg.megaStone && canStart("megaStone")) {
              const megaCostStone = 10;
              const megaTime = 7200;
              if ((state.res.evolutionStone?.value ?? 0) >= megaCostStone) {
                state.res.evolutionStone.value = Math.max(0, (state.res.evolutionStone?.value ?? 0) - megaCostStone);
                startTask("megaStone", megaTime);
                addLog("自动合成：MEGA进化石（2小时）");
              }
            }

            if (autoCfg.hugeBerry && canStart("hugeBerry")) {
              const hugeCostCatnip = 5000;
              const hugeCostBig = 30;
              const hugeTime = 7200;
              if ((state.res.catnip?.value ?? 0) >= hugeCostCatnip && (state.res.bigBerry?.value ?? 0) >= hugeCostBig) {
                state.res.catnip.value = Math.max(0, (state.res.catnip?.value ?? 0) - hugeCostCatnip);
                state.res.bigBerry.value = Math.max(0, (state.res.bigBerry?.value ?? 0) - hugeCostBig);
                startTask("hugeBerry", hugeTime);
                addLog("自动合成：巨大树果（2小时）");
              }
            }
          }
        }

        const stone = craftObj.evolutionEnergy ?? craftObj.evolutionStone;
        const stoneKey = craftObj.evolutionEnergy ? "evolutionEnergy" : craftObj.evolutionStone ? "evolutionStone" : null;
        if (stone && typeof stone === "object" && stoneKey) {
          any = true;
          const rem0 = typeof stone.remainingSec === "number" && Number.isFinite(stone.remainingSec) ? stone.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          stone.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("evolutionEnergy", 1);
            addLog("合成完成：进化能量 +1", true);
            state.evolutionStoneMade = Math.max(0, (state.evolutionStoneMade ?? 0) + 1);
            craftObj[stoneKey] = null;
            if (ui.activeTab === "future") ui.futureDirty = true;
          }
        }

        if (state.unlocks?.autoCraft) {
          const autoCfg = state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : null;
          if (autoCfg && autoCfg.evolutionStone) {
            const costEnergy = 10;
            const haveEnergy = Math.max(0, Math.floor(state.res.evolutionEnergy?.value ?? 0));
            const n = Math.max(0, Math.floor(haveEnergy / costEnergy));
            if (n > 0) {
              state.res.evolutionEnergy.value = Math.max(0, haveEnergy - n * costEnergy);
              addRes("evolutionStone", n);
              addLog(`自动合成：进化石 +${n}`);
              if (ui.activeTab === "future") ui.futureDirty = true;
            }
          }
        }

        const rope = craftObj.linkRope;
        if (rope && typeof rope === "object") {
          any = true;
          const rem0 = typeof rope.remainingSec === "number" && Number.isFinite(rope.remainingSec) ? rope.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          rope.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("linkRope", 1);
            addLog("合成完成：通信绳 +1", true);
            craftObj.linkRope = null;
          }
        }

        const huge = craftObj.hugeBerry;
        if (huge && typeof huge === "object") {
          any = true;
          const rem0 = typeof huge.remainingSec === "number" && Number.isFinite(huge.remainingSec) ? huge.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          huge.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("hugeBerry", 1);
            addLog("合成完成：巨大树果 +1", true);
            craftObj.hugeBerry = null;
          }
        }

        const mega = craftObj.megaStone;
        if (mega && typeof mega === "object") {
          any = true;
          const rem0 = typeof mega.remainingSec === "number" && Number.isFinite(mega.remainingSec) ? mega.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          mega.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("megaStone", 1);
            addLog("合成完成：MEGA进化石 +1", true);
            craftObj.megaStone = null;
          }
        }

        if (any && ui.activeTab === "future") {
          ui.futureDirty = true;
        }
      }
    }

    if (eff.catnipPerSec > 0) {
      const add = eff.catnipPerSec * dtSec;
      addRes("catnip", add);
      state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
    }

    if (state.unlocks.wood) {
      if (eff.woodPerSec > 0) {
        const add = eff.woodPerSec * dtSec;
        addRes("wood", add);
        state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
      }
    }

    if (state.unlocks.minerals) {
      if (eff.mineralsPerSec > 0) {
        const add = eff.mineralsPerSec * dtSec;
        addRes("minerals", add);
        state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
      }
    }

    if (!offline) {
      runAutomation({
        state,
        defs,
        ui,
        dtSec,
        BUILDING_MAX_LEVEL,
        getBuildingCost,
        canAfford,
        pay,
        getPokeballMakeCost,
        addRes,
        addLog,
      });
    }

    const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
    if (
      Boolean(state.auto?.autoFeedBigBerry) &&
      (state.res.bigBerry?.value ?? 0) >= 1 &&
      mons.some((m) => m && typeof m === "object" && (typeof m.satiety === "number" ? m.satiety : 100) < 30)
    ) {
      state.res.bigBerry.value = Math.max(0, state.res.bigBerry.value - 1);
      for (const m of mons) {
        if (!m || typeof m !== "object") continue;
        const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
        m.satiety = clamp(sat0 + 50, 0, 100);
      }
    }
    let monById = null;
    let aliveSet = null;
    if (mons.length > 0) {
      const maps = getMonMaps(mons, state.mons?.nextId ?? -1);
      monById = maps.monById;
      aliveSet = maps.aliveSet;
    }

    if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
    if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
    const trainingIds = state.training.activeIds;
    const trainingSet = trainingIds.length > 0 ? new Set(trainingIds) : null;

    const breedingLvl = state.buildings?.breedingHouse?.owned ?? 0;
    const breedingUnlocked = breedingLvl > 0;
    ensureBreedingState(state);
    const breedingOn = breedingUnlocked && Boolean(state.breeding.on);
    const breedingAId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
    const breedingBId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;

    if (mons.length > 0) {
      const satietyMulBase = 1;
      const trainStacksN = Array.isArray(state.skills?.trainingStacks) ? state.skills.trainingStacks.length : 0;
      const trainExpMul = 10 + Math.max(0, trainStacksN) * 5;
      const satRegen = huge1 > 0 ? (10 / 3600) * dtSec : 0;
      const affRateBase = dtSec / (60 * 60 * 2);
      const affLvl = typeof getServerBuffLevel === "function" ? Math.max(0, Math.floor(getServerBuffLevel("aff") || 0)) : 0;
      const affGainMul = (1 + 0.1 * affLvl) * (fairy1 > 0 ? 2 : 1);
      let satietyUiChanged = false;
      let affectionUiChanged = false;
      let expAdded = false;
      let skillTimerChanged = false;
      for (const m of mons) {
        if (!m || typeof m !== "object") continue;

        const cd0 = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? m.skillCdRemainingSec : 0;
        const cd1 = cd0 > 0 ? Math.max(0, cd0 - dtSec) : 0;
        if (cd1 !== cd0) {
          m.skillCdRemainingSec = cd1;
          skillTimerChanged = true;
        }

        const at0 = typeof m.skillActiveType === "string" && m.skillActiveType ? m.skillActiveType : null;
        const ar0 =
          typeof m.skillActiveRemainingSec === "number" && Number.isFinite(m.skillActiveRemainingSec) ? m.skillActiveRemainingSec : 0;
        if (at0 && ar0 > 0) {
          const ar1 = Math.max(0, ar0 - dtSec);
          if (ar1 !== ar0) {
            m.skillActiveRemainingSec = ar1;
            skillTimerChanged = true;
          }
          if (ar1 <= 0) {
            if (at0 === "ground") {
              const qty = Math.random() < 0.5 ? 1 : 2;
              addRes("evolutionEnergy", qty);
              addLog(`挖矿完成：进化能量 +${qty}`, true);
            }
            if (at0 === "grass") {
              addRes("bigBerry", 1);
              addLog("果树成熟：大树果 +1", true);
            }
            m.skillActiveType = null;
            m.skillActiveRemainingSec = 0;
            skillTimerChanged = true;
          }
        }

        const mega0 =
          typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) ? m.megaAuraRemainingSec : 0;
        const mega1 = mega0 > 0 ? Math.max(0, mega0 - dtSec) : 0;
        if (mega1 !== mega0) {
          m.megaAuraRemainingSec = mega1;
          skillTimerChanged = true;
        }

        const isTraining = trainingSet ? trainingSet.has(m.id) : false;
        const isBreeding = breedingOn && (m.id === breedingAId || m.id === breedingBId);
        const satietyMul = satietyMulBase * (isTraining ? 2 : 1) * natureSatietyDecayMul(m);
        const loss = (dtSec / 600) * satietyMul * (ice1 > 0 ? 0.5 : 1);
        const affRate = affRateBase * natureAffectionMul(m);

        const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
        const breedRegen = isBreeding ? dtSec / 60 : 0;
        const sat1 = clamp(sat0 - loss + satRegen * natureSatietyRegenMul(m) + breedRegen, 0, 100);
        m.satiety = sat1;
        if (Math.ceil(sat0) !== Math.ceil(sat1)) satietyUiChanged = true;

        if (!offline) {
          const aff0 = clamp(typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0, 0, 100);
          const affCarry0 =
            typeof m.affectionCarry === "number" && Number.isFinite(m.affectionCarry) ? Math.max(0, m.affectionCarry) : 0;

          if (sat1 > 0) {
            const affCarry1 = affCarry0 + affRate * affGainMul;
            const affAdd = Math.floor(affCarry1);
            m.affectionCarry = affCarry1 - affAdd;
            m.affectionDecayCarry = 0;
            if (affAdd > 0 && aff0 < 100) {
              const aff1 = clamp(aff0 + affAdd, 0, 100);
              m.affection = aff1;
              if (Math.floor(aff0) !== Math.floor(aff1)) affectionUiChanged = true;
            }
          } else {
            m.affectionCarry = affCarry0;
            const decayCarry0 =
              typeof m.affectionDecayCarry === "number" && Number.isFinite(m.affectionDecayCarry) ? Math.max(0, m.affectionDecayCarry) : 0;
            const decayCarry1 = decayCarry0 + affRate;
            const affSub = Math.floor(decayCarry1);
            m.affectionDecayCarry = decayCarry1 - affSub;
            if (affSub > 0 && aff0 > 0) {
              const aff1 = clamp(aff0 - affSub, 0, 100);
              m.affection = aff1;
              if (aff1 <= 0) m.affectionDecayCarry = 0;
              if (Math.floor(aff0) !== Math.floor(aff1)) affectionUiChanged = true;
            }
          }

          const affNow0 = clamp(typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0, 0, 100);
          const highRatio = Math.max(0, (affNow0 - 50) / 50);
          const highDecayRate = affRateBase * 4 * highRatio * highRatio;
          if (highDecayRate > 0 && affNow0 > 0) {
            const highCarry0 =
              typeof m.affectionHighDecayCarry === "number" && Number.isFinite(m.affectionHighDecayCarry)
                ? Math.max(0, m.affectionHighDecayCarry)
                : 0;
            const highCarry1 = highCarry0 + highDecayRate;
            const highSub = Math.floor(highCarry1);
            m.affectionHighDecayCarry = highCarry1 - highSub;
            if (highSub > 0) {
              const affNow1 = clamp(affNow0 - highSub, 0, 100);
              m.affection = affNow1;
              if (affNow1 <= 0) m.affectionHighDecayCarry = 0;
              if (Math.floor(affNow0) !== Math.floor(affNow1)) affectionUiChanged = true;
            }
          }
        }

        if (sat1 > 0) {
          const carry0 = typeof m.autoExpCarry === "number" && Number.isFinite(m.autoExpCarry) ? Math.max(0, m.autoExpCarry) : 0;
          const natureMul = isTraining ? natureTrainExpMul(m, trainingIds.length) : 1;
          const expMul = isBreeding ? 50 : isTraining ? trainExpMul * natureMul : 1;
          const carry1 = carry0 + (dtSec / 300) * expMul;
          const add = Math.floor(carry1);
          m.autoExpCarry = carry1 - add;
          if (add > 0) {
            addExpToMon(m, add);
            expAdded = true;
            if (isTraining) {
              if (!state.meta || typeof state.meta !== "object") state.meta = {};
              state.meta.trainingExpGained =
                Math.max(0, Math.floor(state.meta.trainingExpGained || 0)) + add;
            }
          }
        }
      }

      if (ui.activeTab === "mons" && (satietyUiChanged || affectionUiChanged || expAdded || skillTimerChanged)) {
        markMonsDirty();
      }
    }

    if (breedingOn && mons.length > 0) {
      ensureEggTimer(state, mons, monById);
      const rem0 = typeof state.breeding.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec) ? state.breeding.eggRemainingSec : 0;
      if (rem0 > 0) {
        const rem1 = Math.max(0, rem0 - dtSec);
        state.breeding.eggRemainingSec = rem1;
        if (rem1 <= 0) {
          hatchEgg(state, mons, monById);
          state.breeding.eggRemainingSec = 0;
          state.breeding.eggTotalSec = 0;
          ensureEggTimer(state, mons, monById);
        }
        if (ui) ui.functionsDirty = true;
      }
    } else {
      if (state.breeding && typeof state.breeding === "object") {
        state.breeding.eggRemainingSec = 0;
        state.breeding.eggTotalSec = 0;
      }
    }

    ensureExpeditionState(state);
    if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
      regenExpeditionDungeons(state);
    }

    const expOn = Boolean(state.expedition.on);
    const expRem0 =
      typeof state.expedition.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec) ? Math.max(0, state.expedition.remainingSec) : 0;
    if (expOn && expRem0 > 0) {
      const expRem1 = Math.max(0, expRem0 - dtSec);
      if (expRem1 !== expRem0) {
        const lines = tickExpeditionMilestones(state.expedition, expRem0, expRem1);
        for (const line of lines) addLog(line);
        state.expedition.remainingSec = expRem1;
        if (ui) ui.functionsDirty = true;
      }
      if (expRem1 <= 0) {
        const ids = Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [];
        const lvlKey = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "";
        const expAdd = typeof state.expedition.rewardExp === "number" && Number.isFinite(state.expedition.rewardExp) ? Math.max(0, Math.floor(state.expedition.rewardExp)) : 0;
        const coinAdd = typeof state.expedition.rewardCoin === "number" && Number.isFinite(state.expedition.rewardCoin) ? Math.max(0, Math.floor(state.expedition.rewardCoin)) : 0;
        const potTotal =
          typeof state.expedition.rewardPotionTotal === "number" && Number.isFinite(state.expedition.rewardPotionTotal)
            ? Math.max(0, Math.floor(state.expedition.rewardPotionTotal))
            : 0;

        const potMap = {};

        if (mons.length > 0 && expAdd > 0) {
          const idSet = new Set(ids);
          for (const m of mons) {
            if (!m || typeof m !== "object") continue;
            if (!idSet.has(m.id)) continue;
            addExpToMon(m, expAdd);
          }
        }
        if (coinAdd > 0) addRes("futurecoin", coinAdd);

        const eventCard = pickExpeditionEventCard(randFloat);
        let eventBonus = 0;
        if (eventCard?.bonusFuturecoin > 0) {
          eventBonus = Math.max(0, Math.floor(eventCard.bonusFuturecoin));
          addRes("futurecoin", eventBonus);
        }

        if (potTotal > 0) {
          const pool = ["hpPotion", "atkPotion", "defPotion", "spaPotion", "spdPotion", "spePotion"];
          for (let i = 0; i < potTotal; i += 1) {
            const rid = pool[Math.floor(Math.random() * pool.length)];
            addRes(rid, 1);
            potMap[rid] = (potMap[rid] ?? 0) + 1;
          }
        }

        const masterballAdd = lvlKey === "master" ? 1 : 0;
        if (masterballAdd > 0) addRes("masterball", masterballAdd);

        const seasonId = resolveSeasonId(ui?.remoteConfig);
        const relicRoll = rollSeasonRelic(seasonId, randFloat);
        let seasonRelic = null;
        if (relicRoll) {
          seasonRelic = noteSeasonRelic(state, relicRoll);
          if (seasonRelic?.item) {
            addRes(seasonRelic.item, 1);
            addLog(`赛季掉落：${seasonRelic.name}（${seasonRelic.blurb}）→ 获得道具`, true);
          }
        }

        const wasQuick = Boolean(state.expedition.quick);
        state.expedition.on = false;
        state.expedition.activeIds = [];
        state.expedition.remainingSec = 0;
        state.expedition.totalSec = 0;
        state.expedition.rewardExp = 0;
        state.expedition.rewardCoin = 0;
        state.expedition.rewardPotionTotal = 0;
        state.expedition.dungeonType = null;
        state.expedition.quick = false;
        state.expedition.milestonesFired = {};
        regenExpeditionDungeons(state);

        if (!state.meta || typeof state.meta !== "object") state.meta = {};
        state.meta.expeditionsCompleted =
          Math.max(0, Math.floor(state.meta.expeditionsCompleted || 0)) + 1;
        bumpSessionExpedition(state);
        noteExpeditionDailyDone(state);

        addLog(wasQuick ? "远征完成（急行）" : "远征完成", true);
        if (eventCard?.title) addLog(`奇遇：${eventCard.title} — ${eventCard.blurb}`, true);
        if (typeof pushTickerEvent === "function") {
          pushTickerEvent("expedition", wasQuick ? "远征完成（急行）" : "远征完成");
        }
        if (ui) {
          ui.expeditionRewardModalOpen = true;
          ui.expeditionRewardModalData = {
            expPerMon: expAdd,
            monCount: ids.length,
            futurecoin: coinAdd + eventBonus,
            potions: potMap,
            masterball: masterballAdd,
            eventCard,
            seasonRelic,
            quick: wasQuick,
          };
          ui.functionsDirty = true;
          ui.futureDirty = true;
          ui.overlaysDirty = true;
        }
        if (ui.activeTab === "mons") markMonsDirty();
      }
    }

    if (state.training && typeof state.training === "object") {
      const before = Array.isArray(state.training.activeIds) ? state.training.activeIds : [];
      const alive = aliveSet ?? new Set();
      const after = before.filter((id) => alive.has(id));
      if (after.length !== before.length) {
        state.training.activeIds = after;
        if (ui) ui.functionsDirty = true;
      }
    }

    if (state.expedition && typeof state.expedition === "object") {
      const alive = aliveSet ?? new Set();
      const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
      const act0 = Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [];
      const sel1 = sel0.filter((id) => alive.has(id));
      const act1 = act0.filter((id) => alive.has(id));
      if (sel1.length !== sel0.length) state.expedition.selectedIds = sel1;
      if (act1.length !== act0.length) state.expedition.activeIds = act1;
    }

    for (const rid of Object.keys(state.res)) {
      const def = defs.resources[rid];
      if (def && def.noCap) continue;
      state.res[rid].value = clamp(state.res[rid].value, 0, state.res[rid].cap);
    }
  };
}
