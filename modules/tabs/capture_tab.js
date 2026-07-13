import { applyEncounterBias, confirmPrestige, eraEncounterRechargeMul, eraPokeballBonusCrafted } from "../systems/era.js";
import { rollNature } from "../mons.js";
import {
  bumpCatchStreak,
  ensureLuckyDay,
  luckyCatchMul,
  luckyWeekEncounterMul,
  natureEncounterRechargeMul,
  natureAdvMissingPreferChance,
  partyHasAlwaysEscape,
  pityFailStep,
  resetCatchStreak,
  noteCatchNearMiss,
  clearCatchNearMiss,
  tryBallSave,
  typeZh,
} from "../systems/gameplay_fun.js";

export function initCaptureTab({
  elCaptureArea,
  elCaptureInfo,
  elCaptureActions,
  ui,
  getState,
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
  onPokeballCraft,
  onEraAdvance,
  getCaptureAreas,
}) {
  const CAPTURE_PREVIEW_KEY = "kittens_mvp_capture_preview_hidden_v1";
  const rareWeight = (p, base, rareWeightMul) =>
    (p?.tier === "rare" || p?.tier === "epic") ? base * rareWeightMul : base;
  const getMonTypesForBias = (p) => {
    const localTypes = globalThis.POKEMON_TYPES;
    return localTypes && typeof localTypes === "object" ? localTypes[p?.dex] : null;
  };

  const refundBallIfSaved = (state, ballType) => {
    if (!tryBallSave(state, randFloat)) return;
    const r = state.res?.[ballType];
    if (!r) return;
    r.value = Math.max(0, (r.value ?? 0) + 1);
    addLog("胆怯性格：精灵球被弹回！");
  };

  const onCatchSuccessFun = (state) => {
    const { streak, reward } = bumpCatchStreak(state);
    if (streak >= 3) addLog(`连捕中：×${streak}`);
    if (reward?.berry > 0) {
      addRes("catnip", reward.berry);
      addLog(`★ ${reward.label}：树果 +${reward.berry}`, true);
    }
  };

  const onCatchFailFun = (state) => {
    resetCatchStreak(state);
  };

  if (elCaptureArea) {
    elCaptureArea.addEventListener("change", () => {
      ui.captureAreaId = String(elCaptureArea.value || "kanto");
      markCaptureDirty();
    });
  }

  if (elCaptureInfo) {
    elCaptureInfo.addEventListener("click", (ev) => {
      const eraAdvanceBtn = ev.target?.closest?.("button[data-era-advance]");
      if (eraAdvanceBtn && elCaptureInfo.contains(eraAdvanceBtn)) {
        if (eraAdvanceBtn.disabled) return;
        if (typeof onEraAdvance === "function") onEraAdvance();
        markCaptureDirty();
        render();
        return;
      }

      const eraPrestigeBtn = ev.target?.closest?.("button[data-era-prestige]");
      if (eraPrestigeBtn && elCaptureInfo.contains(eraPrestigeBtn)) {
        const state = getState();
        const result = confirmPrestige(state, { addLog, getCaptureAreas });
        if (result.ok) {
          markCaptureDirty();
          render();
        }
        return;
      }

      const lockedToggle = ev.target?.closest?.("button[data-capture-locked-toggle]");
      if (lockedToggle && elCaptureInfo.contains(lockedToggle)) {
        ui.captureShowAllLocked = !Boolean(ui.captureShowAllLocked);
        markCaptureDirty();
        render();
        return;
      }
      const btn = ev.target?.closest?.("button[data-capture-preview-toggle]");
      if (!btn || !elCaptureInfo.contains(btn)) return;
      ui.capturePreviewHidden = !Boolean(ui.capturePreviewHidden);
      try {
        localStorage.setItem(CAPTURE_PREVIEW_KEY, ui.capturePreviewHidden ? "1" : "0");
      } catch {
      }
      markCaptureDirty();
      render();
    });
  }

  if (elCaptureActions) {
    const CAPTURE_FOCUS_SELECTOR = "select[data-capture-qty],select[data-ball-selector]";

    const focusOn = () => { ui.captureQtyFocus = true; };
    const focusOff = () => {
      ui.captureQtyFocus = false;
      markCaptureDirty();
      render();
    };

    for (const [evt, handler] of [
      ["pointerdown", focusOn],
      ["mousedown", focusOn],
      ["touchstart", focusOn],
      ["focusin", focusOn],
      ["focusout", focusOff],
    ]) {
      elCaptureActions.addEventListener(evt, (ev) => {
        const sel = ev.target?.closest?.(CAPTURE_FOCUS_SELECTOR);
        if (!sel || !elCaptureActions.contains(sel)) return;
        handler();
      }, true);
    }

    const onCaptureActionsActivate = (ev) => {
      const now = Date.now();
      const debounceOk = () => {
        const last =
          typeof ui.captureLastActionAtMs === "number" && Number.isFinite(ui.captureLastActionAtMs) ? ui.captureLastActionAtMs : 0;
        if (now - last < 250) return false;
        ui.captureLastActionAtMs = now;
        return true;
      };

      const mythicCloseBtn = ev.target?.closest?.("button[data-mythic-close]");
      if (mythicCloseBtn && elCaptureActions.contains(mythicCloseBtn)) {
        if (!debounceOk()) return;
        ui.mythicModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const fcCloseBtn = ev.target?.closest?.("button[data-capture-fc-close]");
      if (fcCloseBtn && elCaptureActions.contains(fcCloseBtn)) {
        if (!debounceOk()) return;
        ui.captureFcModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const mythicOverlay = ev.target?.closest?.("div[data-mythic-overlay]");
      if (mythicOverlay && elCaptureActions.contains(mythicOverlay) && ev.target === mythicOverlay) {
        if (!debounceOk()) return;
        ui.mythicModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const fcOverlay = ev.target?.closest?.("div[data-capture-fc-overlay]");
      if (fcOverlay && elCaptureActions.contains(fcOverlay) && ev.target === fcOverlay) {
        if (!debounceOk()) return;
        ui.captureFcModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const closeBtn = ev.target?.closest?.("button[data-shiny-close]");
      if (closeBtn && elCaptureActions.contains(closeBtn)) {
        if (!debounceOk()) return;
        ui.shinyModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const overlay = ev.target?.closest?.("div[data-shiny-overlay]");
      if (overlay && elCaptureActions.contains(overlay) && ev.target === overlay) {
        if (!debounceOk()) return;
        ui.shinyModalOpen = false;
        markCaptureDirty();
        render();
        return;
      }

      const btn = ev.target?.closest?.("button[data-capture-action]");
      if (!btn || !elCaptureActions.contains(btn)) return;
      if (btn.disabled) return;
      if (!debounceOk()) return;
      const act = btn.getAttribute("data-capture-action");
      const state = getState();

      const doNormalEncounter = () => {
        if (typeof ui.encounterPid === "string" && ui.encounterPid) return false;

        const charges0 =
          typeof state.encounterCharges === "number" && Number.isFinite(state.encounterCharges) ? state.encounterCharges : 100;
        const cd0 = typeof state.encounterCdSec === "number" && Number.isFinite(state.encounterCdSec) ? state.encounterCdSec : 0;
        const maxCharges = 100;
        const rechargeSec = 60 * eraEncounterRechargeMul(state) * natureEncounterRechargeMul(state);
        const charges1 = Math.max(0, Math.min(maxCharges, Math.floor(charges0)));
        if (charges1 <= 0) return false;

        if (ui.captureAreaId === "mythic") {
          const need = 100;
          const cur = Math.max(0, Math.floor(state.res.futurecoin?.value ?? 0));
          if (cur < need) {
            ui.captureFcModalOpen = true;
            ui.captureFcNeed = need;
            ui.captureFcAction = "遭遇";
            markCaptureDirty();
            render();
            return true;
          }
          state.res.futurecoin.value = cur - need;
          addLog(`神兽领域：未来币 -${need}（遭遇）`);
        }

        const pool = getCapturePool();
        if (!pool || pool.length === 0) {
          addLog("遭遇失败：该区域没有可遭遇的宝可梦。", true);
          return false;
        }
        const mythicChance = 0.002;
        const isNormalArea = ui.captureAreaId !== "mythic";
        const hitMythic = isNormalArea && randFloat() < mythicChance;
        const mythicPool = hitMythic && typeof getMythicPool === "function" ? getMythicPool() : null;
        const techEff = computeTechEffects();
        const rareWeightMul = Math.max(0, typeof techEff.rareWeightMul === "number" ? techEff.rareWeightMul : 1);
        const p =
          hitMythic && Array.isArray(mythicPool) && mythicPool.length > 0
            ? mythicPool[Math.floor(randFloat() * mythicPool.length)]
            : (() => {
                const tierWeight = (x) =>
                  applyEncounterBias(
                    rareWeight(x, x?.tier === "common" ? 80 : x?.tier === "uncommon" ? 15 : x?.tier === "rare" ? 4 : x?.tier === "epic" ? 1 : 1, rareWeightMul),
                    x,
                    state,
                    getMonTypesForBias
                  ) * luckyWeekEncounterMul(state, getMonTypesForBias(x));
                let total = 0;
                for (const x of pool) total += tierWeight(x);
                let r = randFloat() * total;
                for (const x of pool) {
                  r -= tierWeight(x);
                  if (r <= 0) return x;
                }
                return pool[pool.length - 1];
              })();

        state.encounterCharges = charges1 - 1;
        if (state.encounterCharges < maxCharges && cd0 <= 0) state.encounterCdSec = rechargeSec;

        ui.encounterPid = p.id;
        ui.encounterNature = rollNature();
        // 闪光概率计算：基础 1/4096，激活闪耀护符时 x2
        const baseShinyRate = 1 / 4096;
        const charmOn = typeof state.shinyCharmRemainingSec === "number" && state.shinyCharmRemainingSec > 0;
        const shinyMul = Math.max(0, typeof techEff.shinyChanceMul === "number" ? techEff.shinyChanceMul : 1);
        const shinyRate = (charmOn ? baseShinyRate * 2 : baseShinyRate) * shinyMul;
        const isShiny = randFloat() < shinyRate;
        ui.encounterIsShiny = isShiny;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;
        ensureLuckyDay(state);
        const lucky = state.luckyDay;
        const monTypes = getMonTypesForBias(p);
        const luckyHit = luckyCatchMul(state, monTypes) > 1;
        addLog(
          `遭遇：${p.name}${ui.encounterNature ? `（${ui.encounterNature}）` : ""}${
            luckyHit && lucky?.type ? ` · 今日幸运·${typeZh(lucky.type)}` : ""
          }`
        );
        if (p.tier === "epic") {
          ui.mythicModalOpen = true;
          addLog(`！！！神兽出现：${p.name}！！！`, true);
          if (typeof pushTickerEvent === "function") pushTickerEvent("mythic", `遭遇神兽 ${p.name}`);
        }
        if (isShiny) {
          ui.shinyModalOpen = true;
          addLog(`！！！闪光出现：${p.name}！！！`, true);
          if (typeof pushTickerEvent === "function") pushTickerEvent("shiny", `遭遇闪光 ${p.name}`);
        }
        // 遭遇后若开启自动投球且非神兽/闪光，标记待自动投球
        if (ui.captureAutoThrow && p.tier !== "epic" && !isShiny) {
          ui._pendingAutoThrow = true;
        }
        markCaptureDirty();
        render();
        return true;
      };

      const tryAutoEncounter = () => {
        if (!ui.captureAutoEncounter) return false;
        if (Boolean(ui.captureFcModalOpen)) return false;
        return doNormalEncounter();
      };

      // 自动投球：遭遇后自动用当前球类型进行捕捉判定
      const tryAutoThrow = () => {
        if (!ui.captureAutoThrow) return false;
        const pid = typeof ui.encounterPid === "string" ? ui.encounterPid : null;
        const p = pid ? getSpeciesByPid(pid) : null;
        if (!p) return false;
        // 神兽/闪光遭遇不自动投球，让玩家手动决策
        if (p.tier === "epic" || Boolean(ui.encounterIsShiny)) return false;
        const ballType = ui.selectedBallType || "pokeball";
        if ((state.res[ballType]?.value ?? 0) < 1) return false;
        state.res[ballType].value = Math.max(0, (state.res[ballType]?.value ?? 0) - 1);
        refundBallIfSaved(state, ballType);
        const techEff = computeTechEffects();
        const add = typeof techEff.catchChanceAdd === "number" ? techEff.catchChanceAdd : 0;
        const dragonRem = typeof state.skills?.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec) ? Math.max(0, state.skills.dragonCatchBoostRemainingSec) : 0;
        const dragonAdd = dragonRem > 0 ? 0.1 : 0;
        const mult = Math.max(0, 1 + add + dragonAdd);
        const base = baseCatchChanceByDex(p.dex);
        const fails = typeof state.rng?.catchFails === "number" ? state.rng.catchFails : 0;
        const pity = Math.min(0.02 * Math.max(0, Math.floor(fails)), 0.2);
        let ballMult = 1;
        if (ballType === "ultraball") ballMult = 2;
        else if (ballType === "quickball") {
          const caughtMap = state.dex && typeof state.dex === "object" ? state.dex.caught : null;
          const caughtCount = caughtMap && typeof caughtMap[p.id] === "number" ? caughtMap[p.id] : 0;
          ballMult = caughtCount === 0 ? 5 : 1;
        }
        const luckyMul = luckyCatchMul(state, getMonTypesForBias(p));
        let chance = base * mult * ballMult * luckyMul + pity;
        chance = clamp(chance, 0, 0.95);
        if (randFloat() > chance) {
          if (!state.rng) state.rng = { catchFails: 0 };
          state.rng.catchFails = Math.max(0, (state.rng.catchFails ?? 0) + pityFailStep(state, randFloat, ui.encounterNature));
          onCatchFailFun(state);
          noteCatchNearMiss(ui, p.id, chance);
          ui.encounterPid = null;
          ui.encounterNature = null;
          ui.encounterIsShiny = false;
          ui.shinyModalOpen = false;
          ui.mythicModalOpen = false;
          addLog(`自动捕捉失败：${p.name} 逃走了。`);
          const didAuto = tryAutoEncounter();
          if (!didAuto) { markCaptureDirty(); render(); }
          return true;
        }
        if (!state.rng) state.rng = { catchFails: 0 };
        state.rng.catchFails = 0;
        clearCatchNearMiss(ui);
        ui.encounterPid = null;
        ui.encounterNature = null;
        const isShiny = Boolean(ui.encounterIsShiny);
        ui.encounterIsShiny = false;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;
        const luxuryBonus = ballType === "luxuryball" ? 20 : 0;
        awardCaughtPokemon(p, { isShiny, affectionBonus: luxuryBonus, ballType });
        onCatchSuccessFun(state);
        if (luxuryBonus > 0) addLog(`豪华球效果：${p.name} 亲密度 +${luxuryBonus}`);
        const didAuto = tryAutoEncounter();
        if (!didAuto) { markCaptureDirty(); render(); }
        return true;
      };

      if (act === "makeBall") {
        const qtyWanted = typeof ui.makeBallQty === "number" ? Math.floor(ui.makeBallQty) : 1;
        const space = Math.max(0, (state.res.pokeball.cap ?? 0) - (state.res.pokeball.value ?? 0));
        const qty = Math.max(0, Math.min(clamp(qtyWanted, 1, 1000), space));
        if (qty <= 0) return;

        const cost = getPokeballMakeCost(qty);
        if (!canAfford(cost)) return;

        pay(cost);
        const before = state.res.pokeball.value;
        addRes("pokeball", qty);
        const after = state.res.pokeball.value;
        const made = Math.max(0, after - before);
        const bonus = eraPokeballBonusCrafted(state, made);
        if (bonus > 0) addRes("pokeball", bonus);
        const afterBonus = state.res.pokeball.value;
        const bonusMade = Math.max(0, afterBonus - after);
        state.pokeballMade = Math.max(0, (state.pokeballMade ?? 0) + made + bonusMade);
        if (made > 0 && typeof onPokeballCraft === "function") onPokeballCraft(made + bonusMade);
        if (made > 0) addLog(`制作：精灵球 +${made + bonusMade}${bonusMade > 0 ? `（时代加成 +${bonusMade}）` : ""}`);
        markCaptureDirty();
        render();
        return;
      }

      if (act === "encounter") {
        doNormalEncounter();
        if (ui._pendingAutoThrow) {
          ui._pendingAutoThrow = false;
          setTimeout(() => { tryAutoThrow(); }, 350);
        }
        return;
      }

      if (act === "encounterPlus") {
        if (typeof ui.encounterPid === "string" && ui.encounterPid) return;
        const charges0 =
          typeof state.encounterPlusCharges === "number" && Number.isFinite(state.encounterPlusCharges) ? state.encounterPlusCharges : 1;
        const cd0 =
          typeof state.encounterPlusCdSec === "number" && Number.isFinite(state.encounterPlusCdSec) ? state.encounterPlusCdSec : 0;
        const encPlusMaxBonus =
          typeof state.permanentBoosts?.encPlusMax === "number"
            ? Math.max(0, Math.min(20, Math.floor(state.permanentBoosts.encPlusMax)))
            : 0;
        const maxCharges = 10 + encPlusMaxBonus;
        const rechargeSec = 600 * eraEncounterRechargeMul(state) * natureEncounterRechargeMul(state);

        const charges1 = Math.max(0, Math.min(maxCharges, Math.floor(charges0)));
        if (charges1 <= 0) return;

        if (ui.captureAreaId === "mythic") {
          const need = 100;
          const cur = Math.max(0, Math.floor(state.res.futurecoin?.value ?? 0));
          if (cur < need) {
            ui.captureFcModalOpen = true;
            ui.captureFcNeed = need;
            ui.captureFcAction = "高级遭遇";
            markCaptureDirty();
            render();
            return;
          }
          state.res.futurecoin.value = cur - need;
          addLog(`神兽领域：未来币 -${need}（高级遭遇）`);
        }

        const pool = getCapturePool();
        if (!pool || pool.length === 0) {
          addLog("遭遇失败：该区域没有可遭遇的宝可梦。", true);
          return;
        }

        const mythicChance = 0.002;
        const isNormalArea = ui.captureAreaId !== "mythic";
        const hitMythic = isNormalArea && randFloat() < mythicChance;
        const mythicPool = hitMythic && typeof getMythicPool === "function" ? getMythicPool() : null;

        const caught = state.dex && typeof state.dex === "object" && state.dex.caught && typeof state.dex.caught === "object" ? state.dex.caught : {};
        const missing = pool.filter((p) => (typeof caught[p.id] === "number" ? caught[p.id] : 0) <= 0);
        const preferMissing = !hitMythic && missing.length > 0 && randFloat() < natureAdvMissingPreferChance(state, 0.75);
        const cand = preferMissing ? missing : pool;
        const techEff = computeTechEffects();
        const rareWeightMul = Math.max(0, typeof techEff.rareWeightMul === "number" ? techEff.rareWeightMul : 1);

        let chosen = cand[cand.length - 1];
        if (hitMythic && Array.isArray(mythicPool) && mythicPool.length > 0) {
          chosen = mythicPool[Math.floor(randFloat() * mythicPool.length)];
        } else {
          const tierWeight = (p) =>
            applyEncounterBias(
              rareWeight(p, p.tier === "epic" ? 15 : p.tier === "rare" ? 8 : p.tier === "uncommon" ? 3 : 1, rareWeightMul),
              p,
              state,
              getMonTypesForBias
            ) * luckyWeekEncounterMul(state, getMonTypesForBias(p));
          let total = 0;
          for (const p of cand) total += tierWeight(p);
          let r = randFloat() * total;
          for (const p of cand) {
            r -= tierWeight(p);
            if (r <= 0) {
              chosen = p;
              break;
            }
          }
        }

        ui.encounterPid = chosen.id;
        ui.encounterNature = rollNature();
        // 闪光概率计算：基础 1/1024，激活闪耀护符时 x2
        const baseShinyRate = 1 / 1024;
        const charmOn = typeof state.shinyCharmRemainingSec === "number" && state.shinyCharmRemainingSec > 0;
        const shinyMul = Math.max(0, typeof techEff.shinyChanceMul === "number" ? techEff.shinyChanceMul : 1);
        const shinyRate = (charmOn ? baseShinyRate * 2 : baseShinyRate) * shinyMul;
        const isShiny = randFloat() < shinyRate;
        ui.encounterIsShiny = isShiny;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;
        state.encounterPlusCharges = charges1 - 1;
        if (state.encounterPlusCharges < maxCharges && cd0 <= 0) state.encounterPlusCdSec = rechargeSec;
        addLog(`高级遭遇：${chosen.name}`);
        if (chosen.tier === "epic") {
          ui.mythicModalOpen = true;
          addLog(`！！！神兽出现：${chosen.name}！！！`, true);
          if (typeof pushTickerEvent === "function") pushTickerEvent("mythic", `高级遭遇神兽 ${chosen.name}`);
        }
        if (isShiny) {
          ui.shinyModalOpen = true;
          addLog(`！！！闪光出现：${chosen.name}！！！`, true);
          if (typeof pushTickerEvent === "function") pushTickerEvent("shiny", `高级遭遇闪光 ${chosen.name}`);
        }
        markCaptureDirty();
        render();
        return;
      }

      if (act === "run") {
        const enc = typeof ui.encounterPid === "string" ? getSpeciesByPid(ui.encounterPid) : null;
        if (!enc) return;

        const forced = partyHasAlwaysEscape(state);
        const ok = forced || randFloat() < 0.5;
        const okTexts = [
          "你把命运关在门外，转身就走。",
          "你与这里的因果断开了一瞬。",
          "你从叙事里溜走了。",
          "你把脚步写成了省略号…",
        ];
        const failTexts = [
          "你试图离场，但世界索要签名。",
          "你迈出一步，现实却拽住了衣角。",
          "你想逃离，却撞上了概率的墙。",
          "你从故事边缘滑落，留下了代价。",
        ];
        const lossParts = [];
        if (!ok) {
          const nameMap = { catnip: "树果", wood: "木材", stone: "石头", iron: "铁矿" };
          const keys0 = ["catnip", "wood", "stone", "iron"];
          const keys = keys0.filter((k) => state.res?.[k] && (state.res[k].value ?? 0) > 0);

          const maxPick = Math.min(2, keys.length);
          for (let i = 0; i < maxPick; i += 1) {
            const idx = Math.floor(randFloat() * keys.length);
            const k = keys.splice(idx, 1)[0];
            const cur = Math.max(0, Math.floor(state.res[k].value ?? 0));
            if (cur <= 0) continue;
            const pct = 0.05 + randFloat() * 0.45;
            let loss = Math.floor(cur * pct);
            if (loss <= 0) loss = 1;
            state.res[k].value = Math.max(0, cur - loss);
            lossParts.push(`${nameMap[k] ?? k} -${loss}`);
          }
        }

        ui.encounterPid = null;
        ui.encounterNature = null;
        ui.encounterIsShiny = false;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;

        if (ok) {
          const msg = forced
            ? "顽皮性格：你从叙事里溜走了。"
            : okTexts[Math.floor(randFloat() * okTexts.length)] || "逃跑成功！";
          addLog(msg, true);
        } else {
          const msg = failTexts[Math.floor(randFloat() * failTexts.length)] || "逃跑失败！";
          const lossText = lossParts.length > 0 ? lossParts.join("，") : "无";
          addLog(`${msg}（代价：${lossText}）`, true);
        }
        const didAuto = tryAutoEncounter();
        if (!didAuto) {
          markCaptureDirty();
          render();
        }
        return;
      }

      if (act === "throw") {
        const pid = typeof ui.encounterPid === "string" ? ui.encounterPid : null;
        const p = pid ? getSpeciesByPid(pid) : null;
        if (!p) return;
        
        const ballType = ui.selectedBallType || "pokeball";
        if ((state.res[ballType]?.value ?? 0) < 1) return;
        state.res[ballType].value = Math.max(0, (state.res[ballType]?.value ?? 0) - 1);
        refundBallIfSaved(state, ballType);

        const techEff = computeTechEffects();
        const add = typeof techEff.catchChanceAdd === "number" ? techEff.catchChanceAdd : 0;
        const dragonRem =
          typeof state.skills?.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec)
            ? Math.max(0, state.skills.dragonCatchBoostRemainingSec)
            : 0;
        const dragonAdd = dragonRem > 0 ? 0.1 : 0;
        const mult = Math.max(0, 1 + add + dragonAdd);
        const base = baseCatchChanceByDex(p.dex);
        const fails = typeof state.rng?.catchFails === "number" ? state.rng.catchFails : 0;
        const pity = Math.min(0.02 * Math.max(0, Math.floor(fails)), 0.2);
        
        // 特殊精灵球效果
        let ballMult = 1;
        if (ballType === "ultraball") {
          ballMult = 2; // 高级球：捕获率 x2
        } else if (ballType === "quickball") {
          // 先机球：首次遭遇 x5
          const caughtMap = state.dex && typeof state.dex === "object" ? state.dex.caught : null;
          const caughtCount = caughtMap && typeof caughtMap[p.id] === "number" ? caughtMap[p.id] : 0;
          ballMult = caughtCount === 0 ? 5 : 1;
        } else if (ballType === "luxuryball") {
          ballMult = 1; // 豪华球：捕获率不变，但捕获后亲密度+20
        }
        
        let chance = base * mult * ballMult * luckyCatchMul(state, getMonTypesForBias(p)) + pity;
        chance = clamp(chance, 0, 0.95);

        if (randFloat() > chance) {
          if (!state.rng) state.rng = { catchFails: 0 };
          state.rng.catchFails = Math.max(0, (state.rng.catchFails ?? 0) + pityFailStep(state, randFloat, ui.encounterNature));
          onCatchFailFun(state);
          noteCatchNearMiss(ui, p.id, chance);

          if (Boolean(ui.captureAutoEncounter)) {
            ui.encounterPid = null;
            ui.encounterNature = null;
            ui.encounterIsShiny = false;
            ui.shinyModalOpen = false;
            ui.mythicModalOpen = false;
            addLog(`捕捉失败：${p.name} 逃走了。`);
            const didAuto = tryAutoEncounter();
            if (!didAuto) {
              markCaptureDirty();
              render();
            }
            return;
          }

          // 捕捉失败抖动动画
          if (elCaptureActions) {
            elCaptureActions.classList.remove("capture-fail-shake");
            void elCaptureActions.offsetWidth;
            elCaptureActions.classList.add("capture-fail-shake");
            setTimeout(() => elCaptureActions.classList.remove("capture-fail-shake"), 500);
          }

          if (chance >= 0.35) addLog(`差一点！成功率约 ${Math.round(chance * 100)}%`);

          const clearEncounter = randFloat() < 0.5;
          if (clearEncounter) {
            ui.encounterPid = null;
            ui.encounterNature = null;
            ui.encounterIsShiny = false;
            ui.shinyModalOpen = false;
            ui.mythicModalOpen = false;
            addLog(`捕捉失败：${p.name} 逃走了。`);
          } else {
            addLog(`捕捉失败：${p.name} 挣扎中！可以继续投掷精灵球。`);
          }

          markCaptureDirty();
          render();
          return;
        }

        if (!state.rng) state.rng = { catchFails: 0 };
        state.rng.catchFails = 0;
        clearCatchNearMiss(ui);
        ui.encounterPid = null;
        ui.encounterNature = null;
        const isShiny = Boolean(ui.encounterIsShiny);
        ui.encounterIsShiny = false;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;
        
        // 捕捉成功动画
        if (elCaptureActions) {
          const flashClass = isShiny ? "capture-shiny-flash" : "capture-success-flash";
          elCaptureActions.classList.remove("capture-success-flash", "capture-shiny-flash", "capture-fail-shake");
          void elCaptureActions.offsetWidth;
          elCaptureActions.classList.add(flashClass);
          setTimeout(() => elCaptureActions.classList.remove(flashClass), 900);
        }
        
        // 豪华球效果：捕获后亲密度+20
        const luxuryBonus = ballType === "luxuryball" ? 20 : 0;
        
        // 记录捕捉前的唯一数量，用于里程碑检测
        const uniqueBefore = Object.values(state.dex?.caught ?? {}).filter((v) => typeof v === "number" && v > 0).length;
        
        awardCaughtPokemon(p, { isShiny, affectionBonus: luxuryBonus, ballType });
        onCatchSuccessFun(state);
        
        if (luxuryBonus > 0) {
          addLog(`豪华球效果：${p.name} 亲密度 +${luxuryBonus}`);
        }
        
        // 里程碑检测：检查是否刚达到某区域解锁门槛
        const MILESTONES = [20, 55, 110, 170, 230, 290, 360, 440];
        const MILESTONE_NAMES = {
          20: "城都树林", 55: "丰缘海岸", 110: "神奥雪原",
          170: "合众沙漠", 230: "卡洛斯花田", 290: "阿罗拉海滩",
          360: "伽勒尔旷野", 440: "神兽领域",
        };
        const uniqueAfter = Object.values(state.dex?.caught ?? {}).filter((v) => typeof v === "number" && v > 0).length;
        for (const m of MILESTONES) {
          if (uniqueBefore < m && uniqueAfter >= m) {
            addLog(`★ 新区域解锁：${MILESTONE_NAMES[m]}！快去遭遇新宝可梦吧！`, true);
            if (typeof pushTickerEvent === "function") pushTickerEvent("unlock", `解锁新区域 ${MILESTONE_NAMES[m]}`);
          }
        }
        
        const didAuto = tryAutoEncounter();
        if (!didAuto) {
          markCaptureDirty();
          render();
        }
        return;
      }

      if (act === "masterball") {
        const pid = typeof ui.encounterPid === "string" ? ui.encounterPid : null;
        const p = pid ? getSpeciesByPid(pid) : null;
        if (!p) return;
        if ((state.res.masterball?.value ?? 0) < 1) return;
        state.res.masterball.value = Math.max(0, (state.res.masterball?.value ?? 0) - 1);

        if (!state.rng) state.rng = { catchFails: 0 };
        state.rng.catchFails = 0;
        clearCatchNearMiss(ui);
        ui.encounterPid = null;
        ui.encounterNature = null;
        const isShiny = Boolean(ui.encounterIsShiny);
        ui.encounterIsShiny = false;
        ui.shinyModalOpen = false;
        ui.mythicModalOpen = false;
        // 大师球捕捉动画
        if (elCaptureActions) {
          elCaptureActions.classList.remove("capture-success-flash", "capture-shiny-flash");
          void elCaptureActions.offsetWidth;
          elCaptureActions.classList.add("capture-success-flash");
          setTimeout(() => elCaptureActions.classList.remove("capture-success-flash"), 900);
        }
        const uniqueBeforeMb = Object.values(state.dex?.caught ?? {}).filter((v) => typeof v === "number" && v > 0).length;
        awardCaughtPokemon(p, { isShiny, ballType: "masterball" });
        onCatchSuccessFun(state);
        addLog(`大师球捕捉：${p.name} 捕捉成功！`, true);
        const uniqueAfterMb = Object.values(state.dex?.caught ?? {}).filter((v) => typeof v === "number" && v > 0).length;
        const MILESTONES_MB = { 20:"城都树林",55:"丰缘海岸",110:"神奥雪原",170:"合众沙漠",230:"卡洛斯花田",290:"阿罗拉海滩",360:"伽勒尔旷野",440:"神兽领域" };
        for (const [m, name] of Object.entries(MILESTONES_MB)) {
          if (uniqueBeforeMb < Number(m) && uniqueAfterMb >= Number(m)) {
            addLog(`★ 新区域解锁：${name}！快去遭遇新宝可梦吧！`, true);
            if (typeof pushTickerEvent === "function") pushTickerEvent("unlock", `解锁新区域 ${name}`);
          }
        }
        const didAuto = tryAutoEncounter();
        if (!didAuto) {
          markCaptureDirty();
          render();
        }
        return;
      }

      // 自动捕捉开关
      if (act === "autoThrowToggle") {
        ui.captureAutoThrow = !Boolean(ui.captureAutoThrow);
        // 关闭时清除待投球标记
        if (!ui.captureAutoThrow) ui._pendingAutoThrow = false;
        markCaptureDirty();
        render();
        return;
      }

      if (act === "catch") {
        doCatch();
        markCaptureDirty();
        render();
      }
    };

    elCaptureActions.addEventListener("pointerup", onCaptureActionsActivate);
    elCaptureActions.addEventListener("click", onCaptureActionsActivate);

    elCaptureActions.addEventListener("change", (ev) => {
      const state = getState();

      const ballSelector = ev.target?.closest?.("select[data-ball-selector]");
      if (ballSelector && elCaptureActions.contains(ballSelector)) {
        ui.selectedBallType = ballSelector.value || "pokeball";
        markCaptureDirty();
        render();
        return;
      }

      const autoEncToggle = ev.target?.closest?.("input[data-auto-encounter-toggle]");
      if (autoEncToggle && elCaptureActions.contains(autoEncToggle)) {
        ui.captureAutoEncounter = Boolean(autoEncToggle.checked);
        markCaptureDirty();
        render();
        return;
      }

      const autoThrowToggle = ev.target?.closest?.("input[data-auto-throw-toggle]");
      if (autoThrowToggle && elCaptureActions.contains(autoThrowToggle)) {
        ui.captureAutoThrow = Boolean(autoThrowToggle.checked);
        if (!ui.captureAutoThrow) ui._pendingAutoThrow = false;
        markCaptureDirty();
        render();
        return;
      }

      const autoToggle = ev.target?.closest?.("input[data-auto-ball-toggle]");
      if (autoToggle && elCaptureActions.contains(autoToggle)) {
        if (!state.auto || typeof state.auto !== "object") {
          state.auto = {
            autoBuildOn: false,
            autoBuildMode: "cheap",
            autoBuildCarrySec: 0,
            autoBallOn: false,
            autoBallQty: 1,
            autoBallCarrySec: 0,
          };
        }
        state.auto.autoBallOn = Boolean(autoToggle.checked);
        markCaptureDirty();
        render();
        return;
      }

      const sel = ev.target?.closest?.("select[data-capture-qty],select[data-ball-selector]");
      if (!sel || !elCaptureActions.contains(sel)) return;
      const v = Number(sel.value);
      ui.makeBallQty = Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1;
      ui.captureQtyFocus = false;
      markCaptureDirty();
      render();
    });
  }
}
