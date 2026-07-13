import { eraPokeballBonusCrafted } from "../systems/era.js";

export function createRenderBonfireActions({ elBonfireActions, elBtnGather, ui, getState }) {
  const fmtRemain = (sec) => {
    const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    const pad2 = (x) => String(x).padStart(2, "0");
    return `${mm}:${pad2(ss)}`;
  };

  return function renderBonfireActions() {
    const state = typeof getState === "function" ? getState() : null;
    if (elBtnGather && state && typeof state === "object") {
      const charges0 =
        typeof state.gatherCharges === "number" && Number.isFinite(state.gatherCharges) ? state.gatherCharges : 1000;
      const charges = Math.max(0, Math.min(1000, Math.floor(charges0)));
      const cd0 = typeof state.gatherCdSec === "number" && Number.isFinite(state.gatherCdSec) ? state.gatherCdSec : 0;
      const cd = Math.max(0, Math.ceil(cd0));
      const text = charges >= 1000 ? `采集 ${charges}/1000` : cd > 0 ? `采集 ${charges}/1000（+1 ${fmtRemain(cd)}）` : `采集 ${charges}/1000`;
      elBtnGather.textContent = text;
      elBtnGather.disabled = charges <= 0;
    }
    if (!elBonfireActions) return;
    elBonfireActions.innerHTML = "";
    if (ui) ui.bonfireDirty = false;
  };
}

export function initBonfireTab({ elBonfireActions, elBtnGather, ui, getPokeballMakeCost, canAfford, pay, addRes, addLog, render, doCatch, getState, onGather, onPokeballCraft }) {
  if (elBtnGather) {
    let lastGatherAtMs = 0;
    elBtnGather.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastGatherAtMs < 100) return;
      lastGatherAtMs = now;

      const state = typeof getState === "function" ? getState() : null;
      if (state && typeof state === "object") {
        const charges0 =
          typeof state.gatherCharges === "number" && Number.isFinite(state.gatherCharges) ? Math.max(0, Math.floor(state.gatherCharges)) : 0;
        const cd0 = typeof state.gatherCdSec === "number" && Number.isFinite(state.gatherCdSec) ? Math.max(0, state.gatherCdSec) : 0;
        const maxCharges = 1000;
        const rechargeSec = 10;
        if (charges0 <= 0) {
          return;
        }

        state.gatherCharges = charges0 - 1;
        if (state.gatherCharges < maxCharges && cd0 <= 0) state.gatherCdSec = rechargeSec;

        const prev = typeof state.gatherClicks === "number" && Number.isFinite(state.gatherClicks) ? state.gatherClicks : 0;
        state.gatherClicks = Math.max(0, Math.floor(prev)) + 1;
      }

      const clicks =
        state && typeof state === "object" && typeof state.gatherClicks === "number" && Number.isFinite(state.gatherClicks)
          ? Math.max(1, Math.floor(state.gatherClicks))
          : 1;

      const tierFast = Math.floor((clicks - 1) / 100);
      const tier = tierFast <= 9 ? tierFast : 9 + Math.floor((clicks - 1 - 9 * 100) / 1000);

      // Early clicks are fatter so the first research isn't a click marathon
      const cat = Math.min(100, 3 + tier * 2);
      const wood = Math.min(100, 1 + tier * 0.75);
      const min = Math.min(100, 0.5 + tier * 0.35);

      const parts = [];
      const catBefore = state?.res?.catnip?.value ?? 0;
      addRes("catnip", cat);
      const catGained = Math.max(0, (state?.res?.catnip?.value ?? 0) - catBefore);
      parts.push(`树果 +${cat}`);
      if (state?.unlocks?.wood) {
        addRes("wood", wood);
        parts.push(`球果 +${wood}`);
      }
      if (state?.unlocks?.minerals) {
        addRes("minerals", min);
        parts.push(`进化石碎片 +${min}`);
      }
      addLog(`采集：${parts.join("，")}`);
      // Pass intended yield so era berry_earned isn't softlocked by full catnip cap
      if (typeof onGather === "function") onGather(cat, catGained);
      if (ui) ui.bonfireDirty = true;
      render();
    });
  }

  if (!elBonfireActions) return;

  elBonfireActions.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("button[data-action]");
    if (!btn || !elBonfireActions.contains(btn)) return;
    if (btn.disabled) return;

    const act = btn.getAttribute("data-action");
    if (act === "makeBall") {
      const makeCost = getPokeballMakeCost(1, { consume: true });
      if (!canAfford(makeCost)) return;
      pay(makeCost);
      const state = typeof getState === "function" ? getState() : null;
      const before = state?.res?.pokeball?.value ?? 0;
      addRes("pokeball", 1);
      const after = state?.res?.pokeball?.value ?? before;
      const made = Math.max(0, after - before);
      const bonus = eraPokeballBonusCrafted(state, made);
      if (bonus > 0) addRes("pokeball", bonus);
      const afterBonus = state?.res?.pokeball?.value ?? after;
      const bonusMade = Math.max(0, afterBonus - after);
      if (state && typeof state === "object") {
        state.pokeballMade = Math.max(0, (state.pokeballMade ?? 0) + made + bonusMade);
      }
      if (typeof onPokeballCraft === "function") onPokeballCraft(made + bonusMade);
      addLog(`制作：精灵球 +${made + bonusMade}${bonusMade > 0 ? `（时代加成 +${bonusMade}）` : ""}`);
      if (ui) ui.bonfireDirty = true;
      render();
      return;
    }

    if (act === "catch") {
      doCatch();
      if (ui) ui.bonfireDirty = true;
      render();
    }
  });
}
