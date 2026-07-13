export function createRenderDex({
  elDexSummary,
  elDexList,
  elDexPrev,
  elDexNext,
  elDexPageInfo,
  elDexArea,
  elDexRegionInfo,
  ui,
  defs,
  getState,
  clamp,
  pad3,
  escapeHtml,
  renderPokemonIcon,
  dexCaughtCount,
  computeDexEffects,
  getCaptureAreas,
}) {
  return function renderDex() {
    const state = getState();
    if (!elDexSummary || !elDexList || !elDexPrev || !elDexNext || !elDexPageInfo) return;
    if (ui.activeTab !== "dex") return;
    if (!ui.dexDirty) return;

    const totalSpecies = defs.pokemon.length;
    const { unique, total } = dexCaughtCount();
    const dexEff = computeDexEffects();
    const dexPct = totalSpecies > 0 ? Math.round((unique / totalSpecies) * 100) : 0;

    elDexSummary.innerHTML = `
      <div class="row dex-summary">
        <div class="row__left">
          <div class="row__title">完成度</div>
          <div class="row__desc">已登记：${unique}/${totalSpecies}（${dexPct}%） · 总捕获：${total}</div>
          <div class="dex-progress" aria-label="图鉴完成度 ${dexPct}%"><div class="dex-progress__fill" style="width:${dexPct}%"></div></div>
        </div>
        <div class="row__right">
          <div class="badge">树果产量 x${dexEff.catnipPerSecMul.toFixed(2)}</div>
          <div class="badge">球果产量 x${dexEff.woodRateMul.toFixed(2)}</div>
          <div class="badge">碎片产量 x${dexEff.mineralsRateMul.toFixed(2)}</div>
        </div>
      </div>
    `;

    const caught = state.dex.caught;
    const q = (ui.dexQuery || "").trim();
    const onlyCaught = Boolean(ui.dexOnlyCaught);
    const onlyMissing = Boolean(ui.dexOnlyMissing);

    const areas = getCaptureAreas();
    const areaId = ui.dexAreaId || "all";
    const area = areaId === "all" ? null : areas.find((a) => a.id === areaId) ?? null;
    if (areaId !== "all" && !area) ui.dexAreaId = "all";

    if (elDexArea) {
      const allSelected = (ui.dexAreaId || "all") === "all";
      elDexArea.innerHTML = [`<option value="all" ${allSelected ? "selected" : ""}>所有区域</option>`]
        .concat(
          areas.map((a) => {
            const sel = a.id === ui.dexAreaId;
            const suffix = a.unlocked ? "" : "（未解锁）";
            return `<option value="${a.id}" ${sel ? "selected" : ""}>${escapeHtml(a.name)}${suffix}</option>`;
          })
        )
        .join("");
    }

    if (elDexRegionInfo) {
      const label = area ? area.name : "所有区域";
      elDexRegionInfo.textContent = `当前区域：${label}`;
    }

    const poolFn = area ? area.pool : null;

    const filtered = defs.pokemon.filter((p) => {
      if (poolFn && !poolFn(p)) return false;
      const n = typeof caught[p.id] === "number" ? caught[p.id] : 0;
      const seen = n > 0;
      if (onlyMissing && seen) return false;
      if (!onlyMissing && onlyCaught && !seen) return false;
      if (!q) return true;
      const qLower = q.toLowerCase();
      const dexStr = String(p.dex);
      if (dexStr === qLower || pad3(p.dex) === qLower) return true;
      return p.name.toLowerCase().includes(qLower);
    });

    const pageSize = ui.dexPageSize;
    const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
    ui.dexPage = clamp(ui.dexPage, 0, maxPage);

    const start = ui.dexPage * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    if (elDexPageInfo) {
      elDexPageInfo.textContent = `第 ${ui.dexPage + 1}/${maxPage + 1} 页（共 ${filtered.length} 条）`;
    }
    if (elDexPrev) elDexPrev.disabled = ui.dexPage <= 0;
    if (elDexNext) elDexNext.disabled = ui.dexPage >= maxPage;

    const rows = [];
    for (const p of slice) {
      const n = typeof caught[p.id] === "number" ? caught[p.id] : 0;
      const seen = n > 0;
      const revealMissing = onlyMissing;
      const title = seen || revealMissing ? p.name : "????";

      const icon = seen || revealMissing ? renderPokemonIcon(p.dex, p.name) : "";
      const locked = !seen && !revealMissing;

      rows.push(`
        <div class="row ${locked ? "is-locked" : ""}">
          <div class="row__left">
            <div class="row__title row__titleLine">${icon}<span>No.${pad3(p.dex)} ${title}</span></div>
          </div>
          <div class="row__right">
            <div class="badge ${seen ? "badge--ok" : "badge--muted"}">${seen ? `数量：${n}` : "-"}</div>
            ${!seen ? `<button type="button" class="btn btn--small" data-dex-goto-capture="${escapeHtml(p.id)}">去捕捉</button>` : ""}
          </div>
        </div>
      `);
    }

    elDexList.innerHTML = rows.join("");
    ui.dexDirty = false;
  };
}
