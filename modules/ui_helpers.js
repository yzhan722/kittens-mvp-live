// UI 辅助工具函数
import { GAME_CONFIG } from "./config.js";

// 本地存储辅助
export function readLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// 日期格式化
export function formatLocalYmd(t = Date.now()) {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 时长格式化
export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}分钟`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return mm > 0 ? `${h}小时${mm}分钟` : `${h}小时`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh > 0 ? `${d}天${hh}小时` : `${d}天`;
}

// 日志折叠管理
export function createLogCollapseManager(elLog, elLogToggle) {
  const KEY = GAME_CONFIG.STORAGE.LOG_COLLAPSE_KEY;

  function setCollapsed(collapsed) {
    if (!elLog) return;
    elLog.classList.toggle("is-collapsed", Boolean(collapsed));
    if (elLogToggle) elLogToggle.textContent = collapsed ? "展开" : "收起";
    writeLocalStorage(KEY, collapsed ? "1" : "0");
  }

  function init() {
    if (!elLog || !elLogToggle) return;
    let collapsed = true;
    const raw = readLocalStorage(KEY);
    if (raw === "1") collapsed = true;
    if (raw === "0") collapsed = false;

    setCollapsed(collapsed);

    elLogToggle.addEventListener("click", () => {
      const next = !elLog.classList.contains("is-collapsed");
      setCollapsed(next);
    });
  }

  return { init, setCollapsed };
}

// 公告折叠管理
export function createBulletinCollapseManager(elBulletin, elBulletinToggle) {
  const KEY = GAME_CONFIG.STORAGE.BULLETIN_COLLAPSE_KEY;

  function setCollapsed(collapsed) {
    if (!elBulletin) return;
    elBulletin.classList.toggle("is-collapsed", Boolean(collapsed));
    if (elBulletinToggle) elBulletinToggle.textContent = collapsed ? "展开" : "收起";
    writeLocalStorage(KEY, collapsed ? "1" : "0");
  }

  function init() {
    if (!elBulletin || !elBulletinToggle) return;
    let collapsed = false;
    const raw = readLocalStorage(KEY);
    if (raw === "1") collapsed = true;
    if (raw === "0") collapsed = false;

    setCollapsed(collapsed);

    elBulletinToggle.addEventListener("click", () => {
      const next = !elBulletin.classList.contains("is-collapsed");
      setCollapsed(next);
    });
  }

  return { init, setCollapsed };
}

// 提示信息管理
export function createHintManager(elHint) {
  let timeoutId = null;

  function show(text, ttl = GAME_CONFIG.UI.HINT_DEFAULT_TTL) {
    if (!elHint) return;
    elHint.textContent = text;
    elHint.hidden = !text;
    if (timeoutId) clearTimeout(timeoutId);
    if (ttl > 0) {
      timeoutId = setTimeout(() => {
        elHint.textContent = "";
        elHint.hidden = true;
      }, ttl);
    }
  }

  function clear() {
    if (!elHint) return;
    elHint.textContent = "";
    elHint.hidden = true;
    if (timeoutId) clearTimeout(timeoutId);
  }

  return { show, clear };
}

// 日志管理
export function createLogManager(state, ui) {
  function add(msg, important = false) {
    if (!important && ui.logLastMsg === msg && ui.logLastCount >= 1 && Array.isArray(state.log) && state.log.length > 0) {
      ui.logLastCount += 1;
      const last = state.log[state.log.length - 1];
      if (last && typeof last === "object") {
        last.count = ui.logLastCount;
      }
      return;
    }

    ui.logLastMsg = msg;
    ui.logLastCount = 1;
    if (!Array.isArray(state.log)) state.log = [];
    state.log.push({ msg, t: Date.now(), count: 1 });
    if (state.log.length > 100) state.log.shift();
  }

  return { add };
}
