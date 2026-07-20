import {
  shinyGalleryEntries,
  shinyUniqueCount,
  syncShinyGalleryFromMons,
} from "../systems/collection_fun.js";

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
  canClaimDexRegion,
  markDexRegionClaimed,
}) {
  return function renderDex() {
    const state = getState();
    if (!elDexSummary || !elDexList || !elDexPrev || !elDexNext || !elDexPageInfo) return;
    if (ui.activeTab !== "dex") return;
    if (!ui.dexDirty) return;

    syncShinyGalleryFromMons(state);

    const totalSpecies = defs.pokemon.length;
    const { unique, total } = dexCaughtCount();
    const dexEff = computeDexEffects();
    const dexPct = totalSpecies > 0 ? Math.round((unique / totalSpecies) * 100) : 0;
    const shinyCount = Math.max(0, Math.floor(Number.isFinite(state.shinyCount) ? state.shinyCount : 0));
    const shinyUnique = shinyUniqueCount(state);
    const shinyFromMons = Array.isArray(state.mons?.list)
      ? state.mons.list.filter((m) => m && m.isShiny).length
      : 0;
    const shinyShow = Math.max(shinyCount, shinyFromMons, shinyUnique);

    const areas = getCaptureAreas();
    const areaId = ui.dexAreaId || "all";
    const area = areaId === "all" ? null : areas.find((a) => a.id === areaId) ?? null;
    if (areaId !== "all" && !area) ui.dexAreaId = "all";

    let regionGoalHtml = "";
    if (area && typeof area.pool === "function") {
      const regionPool = defs.pokemon.filter(area.pool);
      const regionTotal = regionPool.length;
      let regionCaught = 0;
      const caughtMap = state.dex?.caught || {};
      for (const p of regionPool) {
        if (typeof caughtMap[p.id] === "number" && caughtMap[p.id] > 0) regionCaught += 1;
      }
      const regionPct = regionTotal > 0 ? Math.round((regionCaught / regionTotal) * 100) : 0;
      const regionDone = regionTotal > 0 && regionCaught >= regionTotal;
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      const canClaim = regionDone && canClaimDexRegion(state.meta, area.id);
      const claimed = regionDone && !canClaimDexRegion(state.meta, area.id);
      regionGoalHtml = `
        <div class="row__desc">区域目标：${escapeHtml(area.name)} ${regionCaught}/${regionTotal}（${regionPct}%）
          ${regionDone ? `<span class="badge badge--ok">区域完成</span>` : ""}
          ${canClaim ? `<button type="button" class="btn btn--small btn--primary" data-dex-claim-region="${escapeHtml(area.id)}">领取 +10 未来币</button>` : ""}
          ${claimed ? `<span class="badge">已领区域奖</span>` : ""}
        </div>`;
    }

    let nextCatchHtml = "";
    {
      const caughtMap = state.dex?.caught || {};
      const pool = area && typeof area.pool === "function" ? defs.pokemon.filter(area.pool) : defs.pokemon;
      const missing = pool.find((p) => !(typeof caughtMap[p.id] === "number" && caughtMap[p.id] > 0));
      if (missing) {
        nextCatchHtml = `<div class="row__desc">下一只推荐：${escapeHtml(missing.name)} <button type="button" class="btn btn--small btn--primary" data-dex-goto-capture="1">去捕捉</button></div>`;
      } else if (dexPct >= 100) {
        nextCatchHtml = `<div class="row__desc"><span class="badge badge--ok">当前范围已全收集</span></div>`;
      }
    }

    const gallery = shinyGalleryEntries(state, 16);
    const shareNames = gallery
      .slice(0, 6)
      .map((e) => e.name)
      .filter(Boolean);
    const shareText = shareNames.length
      ? `我的闪光馆（${shinyUnique}）：${shareNames.join("、")}${gallery.length > 6 ? "…" : ""} — 宝可梦放置冒险`
      : "";
    const galleryHtml =
      gallery.length > 0
        ? `<div class="row__desc" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
            <span class="badge badge--ok">闪光馆 ${shinyUnique}</span>
            ${gallery
              .map(
                (e) =>
                  `<span class="row__titleLine" title="${escapeHtml(e.name)}">${renderPokemonIcon(e.dex, e.name, true)}<span class="muted" style="font-size:11px">${escapeHtml(e.name)}</span></span>`
              )
              .join("")}
            <button type="button" class="btn btn--small btn--ghost" data-dex-shiny-share data-share="${escapeHtml(shareText)}">复制分享</button>
          </div>`
        : `<div class="row__desc muted">闪光馆空空如也 — 捕捉或孵出闪光后会出现在这里。</div>`;

    elDexSummary.innerHTML = `
      <div class="row dex-summary">
        <div class="row__left">
          <div class="row__title">完成度</div>
          <div class="row__desc">已登记：${unique}/${totalSpecies}（${dexPct}%） · 总捕获：${total}${shinyShow > 0 ? ` · 闪光 ${shinyShow}` : ""}${shinyUnique > 0 ? ` · 闪光图鉴 ${shinyUnique}` : ""}</div>
          ${regionGoalHtml}
          ${nextCatchHtml}
          ${galleryHtml}
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
    const onlyShiny = Boolean(ui.dexOnlyShiny);
    const shinyMap = state.dex?.shiny && typeof state.dex.shiny === "object" ? state.dex.shiny : {};

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
      elDexRegionInfo.textContent = onlyShiny ? `闪光收藏 · ${label}` : `当前区域：${label}`;
    }

    const poolFn = area ? area.pool : null;

    const filtered = defs.pokemon.filter((p) => {
      if (poolFn && !poolFn(p)) return false;
      if (onlyShiny) return Boolean(shinyMap[p.id]);
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
      const isShinyEntry = Boolean(shinyMap[p.id]);
      const revealMissing = onlyMissing;
      const title = seen || revealMissing || isShinyEntry ? p.name : "????";

      const icon = seen || revealMissing || isShinyEntry ? renderPokemonIcon(p.dex, p.name, isShinyEntry) : "";
      const locked = !seen && !revealMissing && !isShinyEntry;

      rows.push(`
        <div class="row ${locked ? "is-locked" : ""}">
          <div class="row__left">
            <div class="row__title row__titleLine">${icon}<span>No.${pad3(p.dex)} ${title}${isShinyEntry ? " ★" : ""}</span></div>
          </div>
          <div class="row__right">
            <div class="badge ${isShinyEntry ? "badge--ok" : seen ? "badge--ok" : "badge--muted"}">${isShinyEntry ? "闪光图鉴" : seen ? `数量：${n}` : "-"}</div>
            ${!seen ? `<button type="button" class="btn btn--small" data-dex-goto-capture="${escapeHtml(p.id)}">去捕捉</button>` : ""}
          </div>
        </div>
      `);
    }

    elDexList.innerHTML = rows.join("");
    ui.dexDirty = false;
  };
}
