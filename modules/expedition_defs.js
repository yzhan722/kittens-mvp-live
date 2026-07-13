// 远征等级定义（唯一数据源）
// 维护者窗口：B

export const EXP_LEVELS = [
  { key: "basic", name: "初级", req: 1000, exp: 300, coin: 50, pot: 3, unlockLvl: 1 },
  { key: "intermediate", name: "中级", req: 3000, exp: 1000, coin: 200, pot: 10, unlockLvl: 2 },
  { key: "advanced", name: "高级", req: 6000, exp: 4000, coin: 500, pot: 20, unlockLvl: 4 },
  { key: "super", name: "超级", req: 12000, exp: 20000, coin: 300, pot: 30, unlockLvl: 7 },
  { key: "master", name: "大师", req: 30000, exp: 100000, coin: 800, pot: 100, unlockLvl: 10 },
  { key: "elite", name: "精英", req: 50000, exp: 200000, coin: 1200, pot: 150, unlockLvl: 12 },
  { key: "legend", name: "传奇", req: 100000, exp: 500000, coin: 2500, pot: 300, unlockLvl: 15 },
];

export function getExpLevelDef(key) {
  const k = typeof key === "string" ? key : "basic";
  return EXP_LEVELS.find((x) => x.key === k) ?? EXP_LEVELS[0];
}

export function getExpLevelKeys() {
  return EXP_LEVELS.map((x) => x.key);
}
