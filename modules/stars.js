import { clamp } from "./utils.js";

export function clampStar(v) {
  return clamp(Math.floor(typeof v === "number" && Number.isFinite(v) ? v : 0), 0, 5);
}

export function getStarBonusMul(stars) {
  const s = clampStar(stars);
  // 优化星级加成：★5加成从×3降为×2.5，曲线更平滑
  // ★0:+0% ★1:+12% ★2:+30% ★3:+60% ★4:+100% ★5:+150%
  const bonus = [0, 0.12, 0.30, 0.60, 1.00, 1.50][s] ?? 0;
  return 1 + bonus;
}

export function getStarUpgradeNeed(stars) {
  const s = clampStar(stars);
  if (s >= 5) return Infinity;
  return 2 ** (s + 1) + 1;
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
