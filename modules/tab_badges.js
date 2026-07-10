// Tab 红点提示系统
// 当某个Tab有值得关注的操作时，显示红点

export function createTabBadgeSystem({ elTabs, getState, defs }) {
  // 计算各Tab是否需要显示红点
  function computeBadges() {
    const state = getState();
    const badges = {};

    // 研究Tab：有可研究的科技
    try {
      const techs = defs?.techs ? Object.values(defs.techs) : [];
      const canResearch = techs.some((t) => {
        if (!t || state.techFlags?.[t.id]) return false;
        if (typeof t.require === "function" && !t.require(state)) return false;
        // 简单检查：是否有成本且未研究
        return true;
      });
      if (canResearch) badges["science"] = true;
    } catch {}

    // 捕捉Tab：有精灵球且已解锁捕捉
    try {
      if (state.unlocks?.pokeball && (state.res?.pokeball?.value ?? 0) > 0) {
        badges["capture"] = true;
      }
    } catch {}

    // 功能Tab：有训练槽空位且有精灵
    try {
      const monCount = state.mons?.list?.length ?? 0;
      if (monCount > 0) badges["functions"] = true;
    } catch {}

    // 精灵Tab：有精灵
    try {
      if ((state.mons?.list?.length ?? 0) > 0) badges["mons"] = true;
    } catch {}

    return badges;
  }

  function updateBadges() {
    if (!elTabs) return;
    const badges = computeBadges();
    elTabs.querySelectorAll(".tab[data-tab]").forEach((tabEl) => {
      const tabName = tabEl.getAttribute("data-tab");
      const hasBadge = Boolean(badges[tabName]);
      const isActive = tabEl.classList.contains("is-active");
      // 激活的Tab不显示红点
      let dot = tabEl.querySelector(".tab__badge");
      if (hasBadge && !isActive) {
        if (!dot) {
          dot = document.createElement("span");
          dot.className = "tab__badge";
          dot.setAttribute("aria-hidden", "true");
          tabEl.appendChild(dot);
        }
      } else if (dot) {
        dot.remove();
      }
    });
  }

  return { updateBadges };
}
