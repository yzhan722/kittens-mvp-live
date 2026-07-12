// PvE 关卡挑战 — 关卡定义
// 每个 chapter 包含多个 stage，线性解锁

export const PVE_DAILY_MAX = 20; // 提升每日次数上限：10→20

export const PVE_CHAPTERS = [
  {
    id: "1",
    name: "关都试炼",
    unlockDex: 0,
    stages: [
      {
        id: "1-1", name: "常磐森林",
        type: "bug",
        enemies: [
          { dex: 10, name: "绿毛虫", lvl: 5, stars: 0 },
          { dex: 13, name: "独角虫", lvl: 5, stars: 0 },
        ],
        rewards: { futurecoin: 20, exp: 100 },
        repeatRewards: { futurecoin: 8, exp: 50 },
        unlockReq: null,
      },
      {
        id: "1-2", name: "尼比道馆",
        type: "rock",
        enemies: [
          { dex: 74, name: "小拳石", lvl: 12, stars: 0 },
          { dex: 95, name: "大岩蛇", lvl: 14, stars: 1 },
        ],
        rewards: { futurecoin: 50, exp: 300, evolutionEnergy: 1 },
        repeatRewards: { futurecoin: 22, exp: 135 },
        unlockReq: "1-1",
      },
      {
        id: "1-3", name: "华蓝道馆",
        type: "water",
        enemies: [
          { dex: 120, name: "海星星", lvl: 18, stars: 0 },
          { dex: 121, name: "宝石海星", lvl: 21, stars: 1 },
        ],
        rewards: { futurecoin: 80, exp: 500, evolutionEnergy: 2 },
        repeatRewards: { futurecoin: 36, exp: 225 },
        unlockReq: "1-2",
      },
      {
        id: "1-4", name: "枯叶道馆",
        type: "electric",
        enemies: [
          { dex: 100, name: "霹雳电球", lvl: 21, stars: 0 },
          { dex: 26, name: "雷丘", lvl: 24, stars: 1 },
        ],
        rewards: { futurecoin: 100, exp: 800, evolutionEnergy: 2 },
        repeatRewards: { futurecoin: 45, exp: 360 },
        unlockReq: "1-3",
      },
      {
        id: "1-5", name: "彩虹道馆",
        type: "grass",
        enemies: [
          { dex: 71, name: "口呆花", lvl: 24, stars: 0 },
          { dex: 114, name: "蔓藤怪", lvl: 24, stars: 0 },
          { dex: 45, name: "霸王花", lvl: 29, stars: 1 },
        ],
        rewards: { futurecoin: 120, exp: 1200, evolutionStone: 1 },
        repeatRewards: { futurecoin: 54, exp: 540 },
        unlockReq: "1-4",
      },
      {
        id: "1-6", name: "浅红道馆",
        type: "poison",
        enemies: [
          { dex: 109, name: "瓦斯弹", lvl: 37, stars: 0 },
          { dex: 110, name: "双弹瓦斯", lvl: 39, stars: 0 },
          { dex: 89, name: "臭臭泥", lvl: 43, stars: 2 },
        ],
        rewards: { futurecoin: 150, exp: 2000, evolutionStone: 1 },
        repeatRewards: { futurecoin: 68, exp: 900 },
        unlockReq: "1-5",
      },
      {
        id: "1-7", name: "红莲道馆",
        type: "fire",
        enemies: [
          { dex: 58, name: "卡蒂狗", lvl: 42, stars: 0 },
          { dex: 78, name: "烈焰马", lvl: 40, stars: 1 },
          { dex: 59, name: "风速狗", lvl: 47, stars: 2 },
        ],
        rewards: { futurecoin: 200, exp: 3000, evolutionStone: 2 },
        repeatRewards: { futurecoin: 90, exp: 1350 },
        unlockReq: "1-6",
      },
      {
        id: "1-8", name: "常磐道馆",
        type: "ground",
        enemies: [
          { dex: 51, name: "三地鼠", lvl: 42, stars: 1 },
          { dex: 31, name: "尼多后", lvl: 44, stars: 1 },
          { dex: 112, name: "铁甲犀牛", lvl: 50, stars: 2 },
        ],
        rewards: { futurecoin: 250, exp: 5000, evolutionStone: 2, linkRope: 1 },
        repeatRewards: { futurecoin: 112, exp: 2250 },
        unlockReq: "1-7",
      },
    ],
  },
  {
    id: "2",
    name: "城都试炼",
    unlockDex: 25,
    stages: [
      {
        id: "2-1", name: "桔梗道馆",
        type: "flying",
        enemies: [
          { dex: 16, name: "波波", lvl: 7, stars: 0 },
          { dex: 17, name: "比比鸟", lvl: 9, stars: 0 },
        ],
        rewards: { futurecoin: 30, exp: 150 },
        repeatRewards: { futurecoin: 14, exp: 68 },
        unlockReq: null,
      },
      {
        id: "2-2", name: "檀木道馆",
        type: "bug",
        enemies: [
          { dex: 11, name: "铁甲蛹", lvl: 14, stars: 0 },
          { dex: 168, name: "阿利多斯", lvl: 16, stars: 1 },
        ],
        rewards: { futurecoin: 60, exp: 400 },
        repeatRewards: { futurecoin: 27, exp: 180 },
        unlockReq: "2-1",
      },
      {
        id: "2-3", name: "满金道馆",
        type: "normal",
        enemies: [
          { dex: 35, name: "皮皮", lvl: 18, stars: 0 },
          { dex: 241, name: "大奶罐", lvl: 20, stars: 1 },
        ],
        rewards: { futurecoin: 80, exp: 600, evolutionEnergy: 2 },
        repeatRewards: { futurecoin: 36, exp: 270 },
        unlockReq: "2-2",
      },
      {
        id: "2-4", name: "圆朱道馆",
        type: "ghost",
        enemies: [
          { dex: 92, name: "鬼斯", lvl: 21, stars: 0 },
          { dex: 93, name: "鬼斯通", lvl: 23, stars: 0 },
          { dex: 94, name: "耿鬼", lvl: 25, stars: 2 },
        ],
        rewards: { futurecoin: 120, exp: 1000, evolutionEnergy: 3 },
        repeatRewards: { futurecoin: 54, exp: 450 },
        unlockReq: "2-3",
      },
      {
        id: "2-5", name: "湛蓝道馆",
        type: "fighting",
        enemies: [
          { dex: 66, name: "腕力", lvl: 25, stars: 0 },
          { dex: 57, name: "火暴猴", lvl: 28, stars: 1 },
          { dex: 62, name: "蚊香泳士", lvl: 30, stars: 1 },
        ],
        rewards: { futurecoin: 150, exp: 1500, evolutionStone: 1 },
        repeatRewards: { futurecoin: 68, exp: 675 },
        unlockReq: "2-4",
      },
      {
        id: "2-6", name: "烟墨道馆",
        type: "steel",
        enemies: [
          { dex: 81, name: "小磁怪", lvl: 30, stars: 0 },
          { dex: 82, name: "三合一磁怪", lvl: 35, stars: 1 },
          { dex: 208, name: "大钢蛇", lvl: 35, stars: 2 },
        ],
        rewards: { futurecoin: 200, exp: 2500, evolutionStone: 2 },
        repeatRewards: { futurecoin: 90, exp: 1125 },
        unlockReq: "2-5",
      },
      {
        id: "2-7", name: "浅葱道馆",
        type: "ice",
        enemies: [
          { dex: 87, name: "白海狮", lvl: 27, stars: 0 },
          { dex: 221, name: "长毛猪", lvl: 31, stars: 1 },
          { dex: 124, name: "迷唇姐", lvl: 34, stars: 2 },
        ],
        rewards: { futurecoin: 180, exp: 2000, evolutionStone: 1 },
        repeatRewards: { futurecoin: 81, exp: 900 },
        unlockReq: "2-6",
      },
      {
        id: "2-8", name: "烟墨道馆·龙",
        type: "dragon",
        enemies: [
          { dex: 148, name: "哈克龙", lvl: 37, stars: 1 },
          { dex: 148, name: "哈克龙", lvl: 37, stars: 1 },
          // stars 3→2：终盘血牛+超时假负；仍需克制与练级
          { dex: 149, name: "快龙", lvl: 50, stars: 2 },
        ],
        rewards: { futurecoin: 300, exp: 8000, evolutionStone: 3, linkRope: 1 },
        repeatRewards: { futurecoin: 135, exp: 3600 },
        unlockReq: "2-7",
      },
    ],
  },
];

// 根据 stage id 快速查找
const __stageMap = new Map();
for (const ch of PVE_CHAPTERS) {
  for (const st of ch.stages) {
    __stageMap.set(st.id, { chapter: ch, stage: st });
  }
}

export function getStageById(stageId) {
  return __stageMap.get(stageId) ?? null;
}

export function isStageUnlocked(stageId, progress) {
  const info = getStageById(stageId);
  if (!info) return false;
  const ch = info.chapter;
  const st = info.stage;
  // 章节解锁检查由外部做（需要 dexCount）
  if (st.unlockReq === null) return true;
  return Boolean(progress && progress[st.unlockReq]);
}
