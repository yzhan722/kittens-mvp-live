// ===== modules/systems/server_buffs.js =====
// 全服Buff系统：常量定义 + 纯函数查询
// 维护者窗口：D
// 依赖：clamp (utils.js), ui 对象（运行时注入）
// =============================================

export const SERVER_BUFF_KEYS = ["exp", "resProd", "resCap", "research", "capture", "aff"];
export const SERVER_BUFF_BUY_MAX_MINUTES = 30 * 24 * 60;
export const SERVER_BUFF_POLL_INTERVAL_MS = 8000;

export const SERVER_BUFF_UI = {
  exp:      { name: "全服经验",     icon: "经验", perLvl: 0.1 },
  resProd:  { name: "全服资源产量", icon: "资源", perLvl: 0.1 },
  resCap:   { name: "全服资源上限", icon: "上限", perLvl: 0.1 },
  research: { name: "全服科研速度", icon: "科研", perLvl: 0.2 },
  capture:  { name: "全服捕获率",   icon: "捕获", perLvl: 0.1 },
  aff:      { name: "全服亲密度",   icon: "亲密", perLvl: 0.1 },
};

/**
 * 从 ui.serverBuffLevels (Map) 或 ui.serverBuffs.items (Array) 中读取某个Buff等级
 * @param {string} key
 * @param {{ serverBuffLevels?: Map, serverBuffs?: { items?: Array } }} ui
 * @returns {number}
 */
export function getServerBuffLevel(key, ui) {
  const k = String(key || "");
  if (!SERVER_BUFF_KEYS.includes(k)) return 0;
  const map = ui.serverBuffLevels;
  if (map && typeof map.get === "function") {
    const lvl = map.get(k);
    return typeof lvl === "number" && Number.isFinite(lvl) ? Math.max(0, Math.floor(lvl)) : 0;
  }
  const items = Array.isArray(ui.serverBuffs?.items) ? ui.serverBuffs.items : [];
  const it = items.find((x) => x && String(x.key || "") === k) ?? null;
  const lvl = typeof it?.level === "number" && Number.isFinite(it.level) ? Math.max(0, Math.floor(it.level)) : 0;
  return lvl;
}

/**
 * 某个Buff的加成百分比（小数形式，如 0.3 = +30%）
 */
export function serverBuffPct(key, ui) {
  const k = String(key || "");
  const cfg = SERVER_BUFF_UI[k];
  if (!cfg) return 0;
  const lvl = getServerBuffLevel(k, ui);
  return Math.max(0, (cfg.perLvl ?? 0) * lvl);
}

/**
 * 某个Buff的乘数（如 1.3）
 */
export function serverBuffMul(key, ui) {
  return 1 + serverBuffPct(key, ui);
}

/**
 * 科研速度Buff对应的时间乘数（研究时间的倒数加成）
 * 返回值 < 1 意味着研究更快
 */
export function serverBuffResearchTimeMul(ui, clamp) {
  const lvl = getServerBuffLevel("research", ui);
  const spd = 1 + 0.2 * Math.max(0, lvl);
  return clamp(1 / spd, 1 / 3, 1);
}

/**
 * 返回某个Buff效果的可读文本
 */
export function serverBuffEffectText(key, lvl) {
  const cfg = SERVER_BUFF_UI[key];
  if (!cfg) return "";
  const l = Math.max(0, Math.floor(lvl || 0));
  if (l <= 0) return "未激活";
  const pct = Math.round(cfg.perLvl * l * 100);
  if (key === "research") return `科研速度 +${pct}%`;
  if (key === "capture") return `捕获成功率 +${pct}%`;
  if (key === "aff") return `亲密度获得 +${pct}%`;
  return `+${pct}%`;
}
