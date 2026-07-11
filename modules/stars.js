import { clamp } from "./utils.js";

export function clampStar(v) {
  return clamp(Math.floor(typeof v === "number" && Number.isFinite(v) ? v : 0), 0, 5);
}

export function getStarBonusMul(stars) {
  const s = clampStar(stars);
  // ★0:+0% ★1:+8% ★2:+20% ★3:+45% ★4:+85% ★5:+140% — 早期弱、满星仍强
  const bonus = [0, 0.08, 0.2, 0.45, 0.85, 1.4][s] ?? 0;
  return 1 + bonus;
}

export function getStarUpgradeNeed(stars) {
  const s = clampStar(stars);
  if (s >= 5) return Infinity;
  // ★0→1:5 ★1→2:10 ★2→3:20 ★3→4:40 ★4→5:80（同进化系材料）
  return 5 * 2 ** s;
}

/** 升到下一星所需等级/亲密度门槛（当前 stars → stars+1） */
export function getStarUpgradeGate(stars) {
  const s = clampStar(stars);
  if (s >= 5) return null;
  const gates = [
    { lvl: 5, aff: 10 },
    { lvl: 15, aff: 25 },
    { lvl: 30, aff: 45 },
    { lvl: 50, aff: 70 },
    { lvl: 70, aff: 90 },
  ];
  return gates[s] ?? null;
}

export function meetsStarUpgradeGate(mon, stars = mon?.stars) {
  const gate = getStarUpgradeGate(stars);
  if (!gate) return false;
  const lvl = Math.max(1, Math.floor(typeof mon?.lvl === "number" && Number.isFinite(mon.lvl) ? mon.lvl : 1));
  const aff = clamp(typeof mon?.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0, 0, 100);
  return lvl >= gate.lvl && aff >= gate.aff;
}

export function renderStars(stars) {
  const s = clampStar(stars);
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    const color = i < s ? "#f5c542" : "#666";
    out += `<span style="color:${color}">★</span>`;
  }
  return out;
}
