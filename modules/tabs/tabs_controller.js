const PRIMARY_TABS = new Set(["bonfire", "science", "capture", "mons", "future"]);

export function createTabController({
  ui,
  elTabs,
  elPanels,
  renderDex,
  renderCapture,
  renderItems,
  renderMons,
  renderFunctions,
  renderLeaderboard,
  renderHelp,
  renderPve,
}) {
  let moreMenu = null;
  let moreBtn = null;

  function ensureMoreChrome() {
    if (!elTabs || moreBtn) return;
    moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "tab tab--more";
    moreBtn.setAttribute("data-tab-more", "1");
    moreBtn.setAttribute("aria-haspopup", "true");
    moreBtn.setAttribute("aria-expanded", "false");
    moreBtn.setAttribute("aria-controls", "tabsMoreMenu");
    moreBtn.textContent = "更多";
    elTabs.appendChild(moreBtn);

    moreMenu = document.createElement("div");
    moreMenu.id = "tabsMoreMenu";
    moreMenu.className = "tabsMoreMenu";
    moreMenu.hidden = true;
    moreMenu.setAttribute("role", "menu");
    moreMenu.setAttribute("aria-label", "更多功能");
    elTabs.insertAdjacentElement("afterend", moreMenu);

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = moreMenu.hidden;
      moreMenu.hidden = !open;
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      moreBtn.classList.toggle("is-open", open);
    });

    document.addEventListener("click", () => {
      if (!moreMenu || moreMenu.hidden) return;
      moreMenu.hidden = true;
      moreBtn.setAttribute("aria-expanded", "false");
      moreBtn.classList.remove("is-open");
    });
    moreMenu.addEventListener("click", (e) => e.stopPropagation());
  }

  function closeMoreMenu() {
    if (!moreMenu || !moreBtn) return;
    moreMenu.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
    moreBtn.classList.remove("is-open");
  }

  /** Call after unlock rules set each tab's unlocked flag via data-unlocked / style. */
  function refreshTabChrome() {
    if (!elTabs) return;
    ensureMoreChrome();

    const items = [];
    elTabs.querySelectorAll(".tab[data-tab]").forEach((tabEl) => {
      const name = tabEl.getAttribute("data-tab");
      if (!name) return;
      const unlocked = tabEl.getAttribute("data-unlocked") !== "0";
      const isPrimary = PRIMARY_TABS.has(name);
      const isActive = ui.activeTab === name;

      if (!unlocked) {
        tabEl.style.display = "none";
        return;
      }

      // Primary always in bar; secondary only when active (so 更多 stays short)
      if (isPrimary || isActive) {
        tabEl.style.display = "";
      } else {
        tabEl.style.display = "none";
        items.push({ name, label: (tabEl.textContent || name).trim() });
      }
    });

    if (moreMenu) {
      if (items.length === 0) {
        moreBtn.style.display = "none";
        closeMoreMenu();
        moreMenu.innerHTML = "";
      } else {
        moreBtn.style.display = "";
        moreMenu.innerHTML = items
          .map(
            (it) =>
              `<button type="button" class="tabsMoreMenu__item" data-more-tab="${it.name}">${it.label}</button>`
          )
          .join("");
        moreMenu.querySelectorAll("[data-more-tab]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const name = btn.getAttribute("data-more-tab");
            closeMoreMenu();
            if (name) activateTab(name);
          });
        });
      }
    }
  }

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
    if (name === "social") ui.socialDirty = true;
    if (name === "options") ui.optionsDirty = true;
    if (name === "items") ui.itemsDirty = true;

    elTabs.querySelectorAll(".tab[data-tab]").forEach((t) => {
      const isActive = t.getAttribute("data-tab") === name;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
      t.tabIndex = isActive ? 0 : -1;
      const controls = t.getAttribute("aria-controls") || `panel-${t.getAttribute("data-tab")}`;
      if (!t.id) t.id = `tab-${t.getAttribute("data-tab")}`;
      if (!t.getAttribute("aria-controls")) t.setAttribute("aria-controls", controls);
    });

    elPanels.querySelectorAll(".panel").forEach((p) => {
      const isActive = p.id === `panel-${name}`;
      p.classList.toggle("is-active", isActive);
      p.toggleAttribute("hidden", !isActive);
      const tabId = p.id?.replace(/^panel-/, "tab-");
      if (tabId && !p.getAttribute("aria-labelledby")) p.setAttribute("aria-labelledby", tabId);
    });

    if (name === "dex") renderDex();
    if (name === "capture") renderCapture();
    if (name === "items") renderItems();
    if (name === "mons") renderMons();
    if (name === "functions" && typeof renderFunctions === "function") renderFunctions();
    if (name === "leaderboard" && typeof renderLeaderboard === "function") renderLeaderboard();
    if (name === "help" && typeof renderHelp === "function") renderHelp();
    if (name === "pve" && typeof renderPve === "function") renderPve();

    refreshTabChrome();
  }

  if (elTabs) {
    elTabs.querySelectorAll(".tab[data-tab]").forEach((t) => {
      t.addEventListener("click", () => {
        const name = t.getAttribute("data-tab");
        if (!name) return;
        activateTab(name);
      });
    });
    ensureMoreChrome();
  }

  return { activateTab, refreshTabChrome, PRIMARY_TABS };
}
