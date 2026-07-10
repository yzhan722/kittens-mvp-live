export function initBuildingsTab({ elBuildings, getState, BUILDING_MAX_LEVEL, getBuildingCost, canAfford, pay, addLog, render, defs }) {
  if (!elBuildings) return;

  elBuildings.addEventListener("change", (ev) => {
    const state = getState();
    if (!state.auto || typeof state.auto !== "object") {
      state.auto = {
        autoBuildOn: false,
        autoBuildMode: "prod",
        autoBuildCarrySec: 0,
        autoBallOn: false,
        autoBallQty: 1,
        autoBallCarrySec: 0,
      };
    }

    const toggle = ev.target?.closest?.("input[data-auto-build-toggle]");
    if (toggle && elBuildings.contains(toggle)) {
      state.auto.autoBuildOn = Boolean(toggle.checked);
      render();
      return;
    }

    const modeSel = ev.target?.closest?.("select[data-auto-build-mode]");
    if (modeSel && elBuildings.contains(modeSel)) {
      state.auto.autoBuildMode = String(modeSel.value || "prod");
      render();
      return;
    }
  });

  elBuildings.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("button[data-buy]");
    if (!btn || !elBuildings.contains(btn)) return;
    if (btn.disabled) return;

    const bid = btn.getAttribute("data-buy");
    if (!bid) return;

    const state = getState();
    const owned = state.buildings[bid]?.owned ?? 0;
    const bdef = defs.buildings?.[bid];
    const maxLvl = typeof bdef?.maxLevel === "number" && Number.isFinite(bdef.maxLevel) ? Math.max(1, Math.floor(bdef.maxLevel)) : BUILDING_MAX_LEVEL;
    if (owned >= maxLvl) return;

    const cost = getBuildingCost(bid);
    if (!canAfford(cost)) return;

    pay(cost);
    state.buildings[bid].owned += 1;
    addLog(`建造：${defs.buildings[bid].name} +1`);
    render();
  });
}
