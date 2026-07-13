/** Log panel collapse + responsive placement (sidebar vs bottom). */

export function createLogUiSystem({ elLog, elLogToggle, ui, render, logCollapseKey }) {
  function setLogCollapsed(collapsed) {
    if (!elLog) return;
    elLog.classList.toggle("is-collapsed", Boolean(collapsed));
    if (elLogToggle) elLogToggle.textContent = collapsed ? "展开" : "收起";
    try {
      localStorage.setItem(logCollapseKey, collapsed ? "1" : "0");
    } catch {
      /* ponytail: private mode */
    }
    if (!collapsed) {
      ui.logDirty = true;
      render();
    }
  }

  function moveLogToBottom() {
    const titleRow = document.querySelector(".sidebar__sectionTitleRow--log");
    const divider = document.querySelector(".sidebar__divider--log");
    if (!elLog || !titleRow) return;

    let host = document.getElementById("bottomLog");
    if (!host) {
      host = document.createElement("section");
      host.id = "bottomLog";
      host.className = "bottomLog";
      const inner = document.createElement("div");
      inner.className = "bottomLog__inner";
      host.appendChild(inner);
      const footer = document.querySelector("footer.footer");
      if (footer && footer.parentNode) footer.parentNode.insertBefore(host, footer);
      else document.body.appendChild(host);
    }

    const inner = host.querySelector(".bottomLog__inner") || host;
    if (divider) inner.appendChild(divider);
    inner.appendChild(titleRow);
    inner.appendChild(elLog);
  }

  function moveLogToSidebar() {
    const titleRow = document.querySelector(".sidebar__sectionTitleRow--log");
    const divider = document.querySelector(".sidebar__divider--log");
    const sidebar = document.querySelector("aside.sidebar");
    if (!elLog || !titleRow || !sidebar) return;

    const hint = document.getElementById("hint");
    const anchor = hint && hint.parentNode === sidebar ? hint : null;

    const host = document.getElementById("bottomLog");
    if (host && host.parentNode) host.parentNode.removeChild(host);

    const insertAfter = anchor || null;
    if (divider) {
      if (insertAfter && insertAfter.nextSibling) sidebar.insertBefore(divider, insertAfter.nextSibling);
      else if (insertAfter) sidebar.appendChild(divider);
      else sidebar.insertBefore(divider, sidebar.firstChild);
    }

    const afterDivider = divider && divider.parentNode === sidebar ? divider : insertAfter;
    if (afterDivider && afterDivider.nextSibling) sidebar.insertBefore(titleRow, afterDivider.nextSibling);
    else if (afterDivider) sidebar.appendChild(titleRow);
    else sidebar.insertBefore(titleRow, sidebar.firstChild);

    if (titleRow.nextSibling) sidebar.insertBefore(elLog, titleRow.nextSibling);
    else sidebar.appendChild(elLog);
  }

  function initLogCollapse() {
    if (!elLog || !elLogToggle) return;
    let collapsed = true;
    try {
      const raw = localStorage.getItem(logCollapseKey);
      if (raw === "1") collapsed = true;
      if (raw === "0") collapsed = false;
    } catch {
      /* ignore */
    }

    setLogCollapsed(collapsed);

    elLogToggle.addEventListener("click", () => {
      const next = !elLog.classList.contains("is-collapsed");
      setLogCollapsed(next);
    });
  }

  function initLogPlacement() {
    try {
      const mq = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 980px)") : null;
      const apply = () => {
        if (mq && mq.matches) moveLogToBottom();
        else moveLogToSidebar();
      };
      apply();
      if (mq) {
        if (typeof mq.addEventListener === "function") mq.addEventListener("change", apply);
        else if (typeof mq.addListener === "function") mq.addListener(apply);
      }
    } catch {
      moveLogToSidebar();
    }
  }

  return { setLogCollapsed, initLogCollapse, initLogPlacement };
}
