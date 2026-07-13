// defs_buildings.js — 数值已预乘平衡系数（×0.25），app.js中BUILDING_BALANCE设为1.0
// 即此处的数值就是游戏实际运行值，无需额外缩放
export const BUILDING_DEFS = {
  field: {
    name: "树果田",
    category: "树果",
    desc: "提供树果自动产出。",
    baseCost: { catnip: 3 },      // 原10 × 0.25 = 2.5 → 3
    costMul: 1.12,
    effects: (state) => {
      const n = state.buildings.field.owned;
      return {
        // 0.15 raw → ×0.5 finalize ≈ 0.075/s/田（原约 0.031）
        catnipPerSec: 0.15 * n,
      };
    },
    visible: () => true,
  },
  hut: {
    name: "球果营地",
    category: "球果",
    desc: "解锁球果。增加球果产出。",
    baseCost: { catnip: 5 },      // 原20 × 0.25
    costMul: 1.18,
    effects: (state) => {
      const n = state.buildings.hut.owned;
      return {
        unlockWood: n > 0,
        woodPerSec: 0.025 * n,    // 原0.1 × 0.25
        capWoodAdd: 10 * n,       // 原40 × 0.25
      };
    },
    visible: (state) => state.res.catnip.value >= 5 || state.buildings.hut.owned > 0,
  },
  workshop: {
    name: "碎片工坊",
    category: "碎片",
    desc: "解锁进化石碎片，并提供少量碎片产出。",
    baseCost: { catnip: 30, wood: 8 }, // 原120×0.25, 30×0.25
    costMul: 1.1831,
    effects: (state) => {
      const n = state.buildings.workshop.owned;
      return {
        unlockMinerals: n > 0,
        mineralsPerSec: 0.015 * n, // 新增：少量碎片产出
      };
    },
    visible: (state) => state.unlocks.wood || state.buildings.workshop.owned > 0,
  },
  researchLab: {
    name: "研究所",
    category: "研究",
    desc: "提升研究效率，减少研究耗时。每级减少 2% 研究时间。",
    baseCost: { minerals: 6 },    // 原25 × 0.25 = 6.25 → 6
    costMul: 1.22,
    effects: () => ({}),          // 效果在computeResearchTimeSec中通过owned数量计算
    visible: (state) => state.buildings.workshop.owned > 0 || state.buildings.researchLab.owned > 0,
  },
  granary: {
    name: "树果仓",
    category: "树果",
    desc: "大幅提升树果上限。",
    baseCost: { catnip: 9, wood: 2 }, // 原35×0.25, 8×0.25
    costMul: 1.15,
    effects: (state) => {
      const n = state.buildings.granary.owned;
      return {
        capCatnipAdd: 20 * n,     // 原80 × 0.25
      };
    },
    visible: (state) => state.unlocks.wood || state.tech.berryCultivation || state.buildings.granary.owned > 0,
  },
  berryPress: {
    name: "树果压榨坊",
    category: "树果",
    desc: "提供大量树果自动产出。",
    baseCost: { catnip: 45, wood: 9 }, // 原180×0.25, 35×0.25
    costMul: 1.1712,
    effects: (state) => {
      const n = state.buildings.berryPress.owned;
      return {
        catnipPerSec: 0.1125 * n, // 原0.45 × 0.25
      };
    },
    visible: (state) => state.tech.composting || state.buildings.berryPress.owned > 0,
  },
  storehouse: {
    name: "球果储藏棚",
    category: "球果",
    desc: "提升球果上限。",
    baseCost: { catnip: 50, wood: 10 }, // 原200×0.25, 40×0.25
    costMul: 1.12,
    effects: (state) => {
      const n = state.buildings.storehouse.owned;
      return {
        capWoodAdd: 28 * n,       // 原110 × 0.25 = 27.5 → 28
      };
    },
    visible: (state) => state.unlocks.wood || state.buildings.storehouse.owned > 0,
  },
  lumberYard: {
    name: "球果堆场",
    category: "球果",
    desc: "增加球果产出与上限。",
    baseCost: { catnip: 65, wood: 30 }, // 原260×0.25, 120×0.25
    costMul: 1.1604,
    effects: (state) => {
      const n = state.buildings.lumberYard.owned;
      return {
        woodPerSec: 0.045 * n,    // 原0.18 × 0.25
        capWoodAdd: 15 * n,       // 原60 × 0.25
      };
    },
    visible: (state) => state.tech.carpentry || state.buildings.lumberYard.owned > 0,
  },
  quarry: {
    name: "采石场",
    category: "碎片",
    desc: "增加进化石碎片产出与上限。",
    baseCost: { wood: 45, minerals: 18 }, // 原180×0.25, 70×0.25
    costMul: 1.1712,
    effects: (state) => {
      const n = state.buildings.quarry.owned;
      return {
        mineralsPerSec: 0.03 * n, // 原0.12 × 0.25
        capMineralsAdd: 13 * n,   // 原50 × 0.25 = 12.5 → 13
      };
    },
    visible: (state) => state.unlocks.minerals || state.buildings.quarry.owned > 0,
  },
  mineralSilo: {
    name: "碎片储藏箱",
    category: "碎片",
    desc: "提升进化石碎片上限。",
    baseCost: { catnip: 4, wood: 3 }, // 原15×0.25, 10×0.25
    costMul: 1.19,
    effects: (state) => {
      const n = state.buildings.mineralSilo.owned;
      return {
        capMineralsAdd: 45 * n,   // 原180 × 0.25
      };
    },
    visible: (state) => state.unlocks.minerals || state.buildings.mineralSilo.owned > 0,
  },
  rangerPost: {
    name: "巡护哨",
    category: "碎片",
    desc: "提升进化石碎片上限。",
    baseCost: { catnip: 81, wood: 28, minerals: 10 }, // 原325×0.25, 110×0.25, 40×0.25
    costMul: 1.11,
    effects: (state) => {
      const n = state.buildings.rangerPost.owned;
      return {
        capMineralsAdd: 18 * n,   // 原70 × 0.25 = 17.5 → 18
      };
    },
    visible: (state) => state.tech.fieldGuide || state.buildings.rangerPost.owned > 0,
  },
  ballBench: {
    name: "制球台",
    category: "精灵球",
    desc: "提升精灵球上限。",
    baseCost: { catnip: 30, wood: 18 }, // 原120×0.25, 70×0.25
    costMul: 1.13,
    effects: (state) => {
      const n = state.buildings.ballBench.owned;
      return {
        capPokeballAdd: 3 * n,    // 原10 × 0.25 = 2.5 → 3（略微提升）
      };
    },
    visible: (state) => state.tech.pokeballBasics || state.buildings.ballBench.owned > 0,
  },
  ballFactory: {
    name: "球厂",
    category: "精灵球",
    desc: "大幅提升精灵球上限。",
    baseCost: { catnip: 88, wood: 40, minerals: 15 }, // 原350×0.25, 160×0.25, 60×0.25
    costMul: 1.11,
    effects: (state) => {
      const n = state.buildings.ballFactory.owned;
      return {
        capPokeballAdd: 6 * n,    // 原20 × 0.25 = 5 → 6（略微提升）
      };
    },
    visible: (state) => state.tech.reinforcedBalls || state.buildings.ballFactory.owned > 0,
  },
  trainingGround: {
    name: "训练场",
    category: "功能建筑",
    desc: "建造后解锁训练场功能；每级增加 1 个训练槽位（最高 10）。",
    baseCost: { catnip: 25, wood: 25, minerals: 25 }, // 原100×0.25
    costMul: 1.668,
    maxLevel: 10,
    effects: () => ({}),
    visible: (state) => state.unlocks.minerals || state.buildings.trainingGround.owned > 0,
  },
  breedingHouse: {
    name: "饲养屋",
    category: "功能建筑",
    desc: "解锁饲养屋功能，并提升生蛋效率。",
    baseCost: { catnip: 25, wood: 25, minerals: 25 }, // 原100×0.25
    costMul: 1.668,
    maxLevel: 10,
    effects: () => ({}),
    visible: (state) => state.buildings.trainingGround.owned > 0 || state.buildings.breedingHouse.owned > 0,
  },
  expeditionPost: {
    name: "远征所",
    category: "功能建筑",
    desc: "解锁远征功能，并提升可挑战的远征等级。",
    // ponytail: minerals 250 exceeded early cap (30); catnip/wood 250 stalled mid-game after dawn pacing
    baseCost: { catnip: 50, wood: 50, minerals: 25 },
    costMul: 1.395,
    maxLevel: 10,
    effects: () => ({}),
    visible: (state) =>
      (state.buildings.trainingGround.owned > 0 && state.buildings.breedingHouse.owned > 0) || state.buildings.expeditionPost.owned > 0,
  },
  library: {
    name: "图书室",
    category: "树果",
    desc: "提升树果上限。",
    baseCost: { catnip: 200, wood: 85 }, // 原800×0.25, 340×0.25
    costMul: 1.1283,
    effects: (state) => {
      const n = state.buildings.library.owned;
      return {
        capCatnipAdd: 28 * n,     // 原110 × 0.25 = 27.5 → 28
      };
    },
    visible: (state) => state.tech.researchMethod || state.buildings.library.owned > 0,
  },
  commandCenter: {
    name: "指挥中心",
    category: "存储",
    desc: "显著提升球果上限。",
    baseCost: { catnip: 550, wood: 225, minerals: 175 }, // 原2200×0.25, 900×0.25, 700×0.25
    costMul: 1.1001,
    effects: (state) => {
      const n = state.buildings.commandCenter.owned;
      return {
        capWoodAdd: 80 * n,       // 原320 × 0.25
      };
    },
    visible: (state) => state.buildings.storehouse.owned > 0 || state.buildings.commandCenter.owned > 0,
  },
};
