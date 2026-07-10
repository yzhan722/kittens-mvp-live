export function initTechTab({ elTech, elAutoResearchToggle, elAutoResearchMode, getState, startResearchByTid, tryAutoResearch, render }) {
  if (elTech) {
    elTech.addEventListener("click", (ev) => {
      const btn = ev.target?.closest?.("button[data-research]");
      if (!btn || !elTech.contains(btn)) return;
      if (btn.disabled) return;

      const tid = btn.getAttribute("data-research");
      if (!tid) return;
      startResearchByTid(tid, "manual");
    });
  }

  if (elAutoResearchToggle) {
    elAutoResearchToggle.addEventListener("change", () => {
      const state = getState();
      if (!state.unlocks?.autoResearch) {
        state.autoResearchOn = false;
        elAutoResearchToggle.checked = false;
        return;
      }
      state.autoResearchOn = Boolean(elAutoResearchToggle.checked);
      if (state.autoResearchOn) {
        tryAutoResearch();
      }
      render();
    });
  }

  if (elAutoResearchMode) {
    elAutoResearchMode.addEventListener("change", () => {
      const state = getState();
      if (!state.unlocks?.autoResearch) {
        if (elAutoResearchMode) elAutoResearchMode.value = "time";
        return;
      }
      const v = elAutoResearchMode.value;
      state.autoResearchMode = v === "cost" ? "cost" : "time";
      if (state.autoResearchOn) {
        tryAutoResearch();
      }
      render();
    });
  }
}
