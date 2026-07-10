export function initDexTab({ ui, elDexArea, elDexSearch, elDexOnlyCaught, elDexOnlyMissing, elDexPrev, elDexNext, markDexDirty }) {
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
        if (elDexOnlyMissing) elDexOnlyMissing.checked = false;
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
        if (elDexOnlyCaught) elDexOnlyCaught.checked = false;
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
