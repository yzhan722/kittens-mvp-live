const BUILDING_MAX_LEVEL = 50;

export function createRenderBuildings({ elBuildings, defs, canAfford, getBuildingCost, getState }) {
  return function renderBuildings() {
    const state = getState();

    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    if (activeEl && elBuildings && elBuildings.contains(activeEl) && activeEl.matches?.("select[data-auto-build-mode]")) {
      return;
    }

    const groups = new Map();
    const groupOrder = ["树果", "球果", "碎片", "研究", "精灵球", "功能建筑", "存储"];
    for (const k of groupOrder) groups.set(k, []);

    const auto = state.auto && typeof state.auto === "object" ? state.auto : null;
    const autoOn = Boolean(auto && auto.autoBuildOn);
    const autoMode = typeof auto?.autoBuildMode === "string" && auto.autoBuildMode ? auto.autoBuildMode : "prod";
    const autoUnlocked = Boolean(state.unlocks?.autoBuild);

    for (const [bid, bdef] of Object.entries(defs.buildings)) {
      if (!bdef.visible(state)) continue;
      const owned = state.buildings[bid].owned;
      const cost = getBuildingCost(bid);
      const maxLvl = typeof bdef.maxLevel === "number" && Number.isFinite(bdef.maxLevel) ? Math.max(1, Math.floor(bdef.maxLevel)) : BUILDING_MAX_LEVEL;
      const isMax = owned >= maxLvl;
      const ok = !isMax && canAfford(cost);
      const pct = isMax ? 100 : Math.min(100, Math.round((owned / maxLvl) * 100));

      const costText = Object.entries(cost)
        .map(([rid, v]) => `${defs.resources[rid].name}${v}`)
        .join(" / ");

      const cat = typeof bdef.category === "string" && bdef.category ? bdef.category : "存储";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${bdef.name}</div>
            <div class="row__desc">${bdef.desc}</div>
            <div class="building-level-bar" aria-label="等级 ${owned}/${maxLvl}">
              <div class="building-level-bar__track">
                <div class="building-level-bar__fill${isMax ? " is-maxed" : ""}" style="width:${pct}%"></div>
              </div>
              <div class="building-level-bar__label">Lv.${owned}${isMax ? " 满级" : `/${maxLvl}`}</div>
            </div>
          </div>
          <div class="row__right">
            <div class="badge ${isMax ? "badge--muted" : ok ? "badge--ok" : ""}">拥有：${owned}${isMax ? " / 满级" : ""}</div>
            <div class="badge">${isMax ? "已满级" : `花费：${costText}`}</div>
            <button class="btn btn--primary btn--small" data-buy="${bid}" ${ok ? "" : "disabled"}>${isMax ? "已满级" : "建造"}</button>
          </div>
        </div>
      `);
    }

    const sections = [];

    if (autoUnlocked) {
      sections.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">自动建造</div>
            <div class="row__desc">开启后会自动尝试建造可负担的建筑（每秒最多 1 次）。</div>
          </div>
          <div class="row__right">
            <label class="check">
              <input type="checkbox" data-auto-build-toggle ${autoOn ? "checked" : ""} />
              <span>开启</span>
            </label>
            <select class="input" data-auto-build-mode>
              <option value="prod" ${autoMode === "prod" ? "selected" : ""}>产量优先</option>
              <option value="storage" ${autoMode === "storage" ? "selected" : ""}>存储优先</option>
            </select>
          </div>
        </div>
      `);
    } else {
      sections.push(`
        <div class="row is-locked">
          <div class="row__left">
            <div class="row__title">自动建造</div>
            <div class="row__desc">在“未来币商店”解锁后可用。</div>
          </div>
          <div class="row__right">
            <div class="badge badge--muted">未解锁</div>
          </div>
        </div>
      `);
    }

    const pushCat = (cat, rows) => {
      if (!rows || rows.length === 0) return;
      sections.push(`
        <div class="building-section" role="group" aria-label="${cat}">
          <div class="building-section__title">${cat}</div>
        </div>
      `);
      sections.push(rows.join(""));
    };

    for (const cat of groupOrder) {
      pushCat(cat, groups.get(cat) ?? []);
    }
    for (const [cat, rows] of groups.entries()) {
      if (groupOrder.includes(cat)) continue;
      pushCat(cat, rows);
    }

    elBuildings.innerHTML = sections.join("");
  };
}
