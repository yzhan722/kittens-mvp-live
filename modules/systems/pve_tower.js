/** Endless-ish weekly tower floors for PvE tab — local, resets by ISO week. */

export const PVE_TOWER_FLOORS = [
  { floor: 1, name: "塔·1F 虫群", type: "bug", enemies: [{ dex: 10, name: "绿毛虫", lvl: 20, stars: 0 }, { dex: 11, name: "铁甲蛹", lvl: 22, stars: 0 }], rewards: { futurecoin: 40, exp: 400 } },
  { floor: 2, name: "塔·2F 水流", type: "water", enemies: [{ dex: 54, name: "可达鸭", lvl: 24, stars: 0 }, { dex: 55, name: "哥达鸭", lvl: 28, stars: 1 }], rewards: { futurecoin: 60, exp: 600 } },
  { floor: 3, name: "塔·3F 烈焰", type: "fire", enemies: [{ dex: 58, name: "卡蒂狗", lvl: 28, stars: 0 }, { dex: 59, name: "风速狗", lvl: 34, stars: 1 }], rewards: { futurecoin: 80, exp: 900 } },
  { floor: 4, name: "塔·4F 雷鸣", type: "electric", enemies: [{ dex: 25, name: "皮卡丘", lvl: 32, stars: 1 }, { dex: 26, name: "雷丘", lvl: 38, stars: 1 }], rewards: { futurecoin: 100, exp: 1200 } },
  { floor: 5, name: "塔·5F 龙影", type: "dragon", enemies: [{ dex: 147, name: "迷你龙", lvl: 36, stars: 1 }, { dex: 148, name: "哈克龙", lvl: 42, stars: 2 }], rewards: { futurecoin: 140, exp: 1800 } },
  { floor: 6, name: "塔·6F 恶戏", type: "dark", enemies: [{ dex: 197, name: "月亮伊布", lvl: 40, stars: 1 }, { dex: 229, name: "黑鲁加", lvl: 46, stars: 2 }], rewards: { futurecoin: 180, exp: 2200 } },
  { floor: 7, name: "塔·7F 钢壁", type: "steel", enemies: [{ dex: 208, name: "大钢蛇", lvl: 44, stars: 2 }, { dex: 306, name: "波士可多拉", lvl: 50, stars: 2 }], rewards: { futurecoin: 220, exp: 2800 } },
  { floor: 8, name: "塔·顶 冠军幻影", type: "dragon", enemies: [{ dex: 149, name: "快龙", lvl: 52, stars: 2 }, { dex: 373, name: "暴飞龙", lvl: 55, stars: 2 }, { dex: 445, name: "烈咬陆鲨", lvl: 58, stars: 2 }], rewards: { futurecoin: 320, exp: 4000, evolutionStone: 1 } },
];

export function isoWeekKey(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((x - yearStart) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function ensureTowerState(state) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const week = isoWeekKey();
  let t = state.meta.pveTower;
  if (!t || typeof t !== "object" || t.week !== week) {
    t = { week, floor: 1, best: 0, cleared: false };
    state.meta.pveTower = t;
  }
  if (typeof t.floor !== "number") t.floor = 1;
  if (typeof t.best !== "number") t.best = 0;
  if (typeof t.cleared !== "boolean") t.cleared = false;
  t.floor = Math.max(1, Math.min(PVE_TOWER_FLOORS.length, Math.floor(t.floor)));
  return t;
}

export function isTowerCleared(tower) {
  return Boolean(tower && tower.cleared);
}

export function getTowerFloor(floor) {
  const n = Math.max(1, Math.floor(floor || 1));
  return PVE_TOWER_FLOORS.find((f) => f.floor === n) || null;
}
