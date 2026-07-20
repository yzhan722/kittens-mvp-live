import { canClaimDexRegion, markDexRegionClaimed } from "../systems/gameplay_fun.js";

export function initDexTab({
  ui,
  elDexArea,
  elDexSearch,
  elDexOnlyCaught,
  elDexOnlyMissing,
  elDexOnlyShiny,
  elDexPrev,
  elDexNext,
  elDexList,
  elDexSummary,
  markDexDirty,
  setActiveTab,
  getState,
  addRes,
  addLog,
  render,
}) {
  if (typeof setActiveTab === "function") {
    for (const host of [elDexList, elDexSummary]) {
      if (!host) continue;
      host.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("[data-dex-goto-capture]");
        if (!btn || !host.contains(btn)) return;
        setActiveTab("capture");
      });
    }
  }

  if (elDexSummary) {
    elDexSummary.addEventListener("click", async (e) => {
      const btn = e.target?.closest?.("[data-dex-shiny-share]");
      if (!btn || !elDexSummary.contains(btn)) return;
      const text = btn.getAttribute("data-share") || "";
      if (!text) return;
      try {
        if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        if (typeof addLog === "function") addLog("已复制闪光馆分享文案", true);
      } catch {
        if (typeof addLog === "function") addLog("复制失败，请手动选中分享");
      }
    });
  }

  const claimHost = elDexSummary || elDexList;
  if (claimHost) {
    claimHost.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-dex-claim-region]");
      if (!btn || !claimHost.contains(btn)) return;
      if (btn.disabled) return;
      const areaId = btn.getAttribute("data-dex-claim-region");
      if (!areaId) return;
      const state = typeof getState === "function" ? getState() : null;
      if (!state || typeof state !== "object") return;
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      if (!canClaimDexRegion(state.meta, areaId)) {
        if (typeof addLog === "function") addLog("该区域奖励已领取");
        return;
      }
      if (!markDexRegionClaimed(state.meta, areaId)) return;
      if (typeof addRes === "function") addRes("futurecoin", 10);
      if (typeof addLog === "function") addLog(`图鉴区域完成奖励：未来币 +10`, true);
      markDexDirty(false);
      if (typeof render === "function") render();
    });
  }

  if (elDexSearch) {
    elDexSearch.value = ui.dexQuery;
    elDexSearch.addEventListener("input", () => {
      ui.dexQuery = elDexSearch.value ?? "";
      markDexDirty(true);
    });
  }

  if (elDexArea) {
    elDexArea.addEventListener("change", () => {
      ui.dexAreaId = elDexArea.value || "all";
      markDexDirty(true);
    });
  }

  if (elDexOnlyCaught) {
    elDexOnlyCaught.checked = ui.dexOnlyCaught;
    elDexOnlyCaught.addEventListener("change", () => {
      ui.dexOnlyCaught = Boolean(elDexOnlyCaught.checked);
      if (ui.dexOnlyCaught) {
        ui.dexOnlyMissing = false;
        ui.dexOnlyShiny = false;
        if (elDexOnlyMissing) elDexOnlyMissing.checked = false;
        if (elDexOnlyShiny) elDexOnlyShiny.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexOnlyMissing) {
    elDexOnlyMissing.checked = ui.dexOnlyMissing;
    elDexOnlyMissing.addEventListener("change", () => {
      ui.dexOnlyMissing = Boolean(elDexOnlyMissing.checked);
      if (ui.dexOnlyMissing) {
        ui.dexOnlyCaught = false;
        ui.dexOnlyShiny = false;
        if (elDexOnlyCaught) elDexOnlyCaught.checked = false;
        if (elDexOnlyShiny) elDexOnlyShiny.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexOnlyShiny) {
    elDexOnlyShiny.checked = ui.dexOnlyShiny;
    elDexOnlyShiny.addEventListener("change", () => {
      ui.dexOnlyShiny = Boolean(elDexOnlyShiny.checked);
      if (ui.dexOnlyShiny) {
        ui.dexOnlyCaught = false;
        ui.dexOnlyMissing = false;
        if (elDexOnlyCaught) elDexOnlyCaught.checked = false;
        if (elDexOnlyMissing) elDexOnlyMissing.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexPrev) {
    elDexPrev.addEventListener("click", () => {
      ui.dexPage -= 1;
      markDexDirty(false);
    });
  }

  if (elDexNext) {
    elDexNext.addEventListener("click", () => {
      ui.dexPage += 1;
      markDexDirty(false);
    });
  }
}
