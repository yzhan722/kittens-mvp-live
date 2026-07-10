export function createTabController({ ui, elTabs, elPanels, renderDex, renderCapture, renderItems, renderMons, renderFunctions, renderLeaderboard, renderHelp, renderPve }) {
  function activateTab(name) {
    if (!elTabs || !elPanels) return;

    ui.activeTab = name;
    if (name === "dex") ui.dexDirty = true;
    if (name === "capture") ui.captureDirty = true;
    if (name === "future") ui.futureDirty = true;
    if (name === "mons") ui.monsDirty = true;
    if (name === "functions") ui.functionsDirty = true;
    if (name === "leaderboard") ui.leaderboardDirty = true;
    if (name === "help") ui.helpDirty = true;
    if (name === "bonfire") ui.bonfireDirty = true;
    if (name === "pve") ui.pveDirty = true;

    elTabs.querySelectorAll(".tab").forEach((t) => {
      const isActive = t.getAttribute("data-tab") === name;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    elPanels.querySelectorAll(".panel").forEach((p) => {
      const isActive = p.id === `panel-${name}`;
      p.classList.toggle("is-active", isActive);
      p.toggleAttribute("hidden", !isActive);
    });

    if (name === "dex") {
      renderDex();
    }

    if (name === "capture") {
      renderCapture();
    }

    if (name === "items") {
      renderItems();
    }

    if (name === "mons") {
      renderMons();
    }

    if (name === "functions" && typeof renderFunctions === "function") {
      renderFunctions();
    }

    if (name === "leaderboard" && typeof renderLeaderboard === "function") {
      renderLeaderboard();
    }

    if (name === "help" && typeof renderHelp === "function") {
      renderHelp();
    }

    if (name === "pve" && typeof renderPve === "function") {
      renderPve();
    }
  }

  if (elTabs) {
    elTabs.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => {
        const name = t.getAttribute("data-tab");
        if (!name) return;
        activateTab(name);
      });
    });
  }

  return { activateTab };
}
