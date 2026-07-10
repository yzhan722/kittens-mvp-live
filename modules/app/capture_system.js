// 捕获系统管理
import { CAPTURE_AREAS } from "../config.js";
import { getCaptureRate } from "../pokemon_defs.js";

export function createCaptureSystem({ defs, getState, state, ui, randFloat }) {
  const readState = typeof getState === "function" ? getState : () => state;
  const rng = typeof randFloat === "function" ? randFloat : Math.random;

  // 获取已捕获的唯一宝可梦数量
  function getCaughtUniqueCount() {
    const s = readState();
    const caught = s?.dex?.caught ?? {};
    let unique = 0;
    for (const v of Object.values(caught)) {
      const n = typeof v === "number" ? v : 0;
      if (n > 0) unique += 1;
    }
    return unique;
  }

  // 获取捕获区域列表
  function getAreas() {
    const unique = getCaughtUniqueCount();
    return CAPTURE_AREAS.map((area) => ({
      ...area,
      unlocked: unique >= area.unlockReq,
    }));
  }

  // 获取已解锁的区域
  function getUnlockedAreas() {
    return getAreas().filter((a) => a.unlocked);
  }

  // 确保当前区域有效
  function ensureAreaValid() {
    const unlocked = getUnlockedAreas();
    if (unlocked.length === 0) {
      ui.captureAreaId = "kanto";
      return;
    }
    const current = unlocked.find((a) => a.id === ui.captureAreaId);
    if (!current) {
      ui.captureAreaId = unlocked[0].id;
    }
  }

  // 获取当前激活的区域
  function getActiveArea() {
    ensureAreaValid();
    const areas = getAreas();
    return areas.find((a) => a.id === ui.captureAreaId) ?? areas[0];
  }

  // 获取当前区域的宝可梦池
  function getPool() {
    const area = getActiveArea();
    const pool = defs.pokemon.filter(area.pool);
    return pool;
  }

  // 获取神话宝可梦池
  function getMythicPool() {
    return defs.pokemon.filter((p) => p && p.tier === "epic");
  }

  // 基于官方 capture_rate 计算基础捕获概率
  // 公式：(capture_rate / 255) / 2，即官方概率的一半
  function getBaseCatchChanceByDex(dex) {
    const rate = getCaptureRate(dex);
    return (rate / 255) / 2;
  }

  // 兼容旧代码的稀有度查询（用于显示）
  function getBaseCatchChanceByTier(tier) {
    // 使用各稀有度的典型 capture_rate 计算
    if (tier === "epic") return getBaseCatchChanceByDex(150); // capture_rate ~3
    if (tier === "rare") return getBaseCatchChanceByDex(26); // capture_rate ~45
    if (tier === "uncommon") return getBaseCatchChanceByDex(25); // capture_rate ~190
    return getBaseCatchChanceByDex(10); // common, capture_rate ~255
  }

  // 从池中随机选择宝可梦
  function pickRandomFromPool(pool) {
    const weights = {
      common: 80,
      uncommon: 15,
      rare: 4,
      epic: 1,
    };

    let total = 0;
    for (const p of pool) total += weights[p.tier] ?? 1;
    let r = rng() * total;
    for (const p of pool) {
      r -= weights[p.tier] ?? 1;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  return {
    getCaughtUniqueCount,
    getAreas,
    getUnlockedAreas,
    ensureAreaValid,
    getActiveArea,
    getPool,
    getMythicPool,
    getBaseCatchChanceByDex,
    getBaseCatchChanceByTier,
    pickRandomFromPool,
  };
}
