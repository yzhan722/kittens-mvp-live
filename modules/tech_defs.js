export function buildExtraTechDefs() {
  const tech = {};

  const roman = (n) => {
    const map = [
      [1000, "M"],
      [900, "CM"],
      [500, "D"],
      [400, "CD"],
      [100, "C"],
      [90, "XC"],
      [50, "L"],
      [40, "XL"],
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];
    let x = Math.max(1, Math.floor(n));
    let out = "";
    for (const [v, s] of map) {
      while (x >= v) {
        out += s;
        x -= v;
      }
    }
    return out;
  };

  const chain = (prefix, baseName, prereqBase, reqFn, count, costFn, effectsFn, descFn, timeMul = 1) => {
    for (let i = 1; i <= count; i += 1) {
      const tid = `${prefix}${i}`;
      const prev = i === 1 ? prereqBase : `${prefix}${i - 1}`;
      tech[tid] = {
        name: `${baseName} ${roman(i)}`,
        desc: descFn(i),
        cost: costFn(i),
        prereq: prev ? [prev] : [],
        req: reqFn,
        effects: effectsFn(i),
        timeMul: timeMul,
      };
    }
  };

  const allOtherTechResearched = (state) => {
    const t = state && typeof state === "object" ? state.tech : null;
    if (!t || typeof t !== "object") return false;
    for (const k of Object.keys(t)) {
      if (k.startsWith("hyperGrowth")) continue;
      if (!t[k]) return false;
    }
    return true;
  };

  chain(
    "agroBoost",
    "农业飞跃",
    "greenhouse",
    (state) => state.buildings.field.owned >= 3,
    12,
    (i) => ({ catnip: Math.ceil(1400 * Math.pow(1.8, i - 1)), wood: Math.ceil(180 * Math.pow(1.7, i - 1)) }),
    (i) => ({ catnipPerSecMul: 1 + 0.18 + 0.02 * i }),
    (i) => `树果产量提升，阶段越高提升越明显。`,
    10
  );

  chain(
    "forestryBoost",
    "林业飞跃",
    "carpentry",
    (state) => (state.buildings.lumberYard?.owned ?? 0) >= 2,
    12,
    (i) => ({ catnip: Math.ceil(1000 * Math.pow(1.65, i - 1)), wood: Math.ceil(1800 * Math.pow(1.85, i - 1)) }),
    (i) => ({ woodRateMul: 1 + 0.20 + 0.02 * i }),
    (i) => `球果产量提升，逐步进入指数增长。`,
    10
  );

  chain(
    "miningBoost",
    "矿业飞跃",
    "excavationTools",
    (state) => (state.buildings.quarry?.owned ?? 0) >= 2,
    12,
    (i) => ({ wood: Math.ceil(1300 * Math.pow(1.75, i - 1)), minerals: Math.ceil(1500 * Math.pow(1.9, i - 1)) }),
    (i) => ({ mineralsRateMul: 1 + 0.22 + 0.02 * i }),
    (i) => `碎片产量提升，后期增长更陡峭。`,
    10
  );

  for (let i = 1; i <= 5; i += 1) {
    const tid = `catnipStorageBoost${i}`;
    const r = i <= 4 ? 0.75 : 2 / 3;
    tech[tid] = {
      name: `仓储飞跃·树果 ${roman(i)}`,
      desc: i <= 4 ? "树果上限 ×1.5。" : "树果上限 ×2。",
      cost: {
        catnip: Math.ceil(2200 * r * Math.pow(2.2, i - 1)),
        wood: Math.ceil(600 * r * Math.pow(2.05, i - 1)),
        minerals: Math.ceil(320 * r * Math.pow(2.1, i - 1)),
      },
      prereq: i === 1 ? [] : [`catnipStorageBoost${i - 1}`],
      req: () => true,
      effects: { capCatnipMul: i <= 4 ? 1.5 : 2 },
      timeMul: 12,
    };
  }

  for (let i = 1; i <= 3; i += 1) {
    const tid = `woodStorageBoost${i}`;
    tech[tid] = {
      name: `仓储飞跃·球果 ${roman(i)}`,
      desc: "球果上限 ×1.5。",
      cost: {
        catnip: Math.ceil(1800 * 0.75 * Math.pow(2.2, i - 1)),
        wood: Math.ceil(2200 * 0.75 * Math.pow(2.2, i - 1)),
        minerals: Math.ceil(420 * 0.75 * Math.pow(2.1, i - 1)),
      },
      prereq: i === 1 ? [] : [`woodStorageBoost${i - 1}`],
      req: () => true,
      effects: { capWoodMul: 1.5 },
      timeMul: 12,
    };
  }

  for (let i = 1; i <= 3; i += 1) {
    const tid = `mineralsStorageBoost${i}`;
    tech[tid] = {
      name: `仓储飞跃·碎片 ${roman(i)}`,
      desc: "碎片上限 ×1.5。",
      cost: {
        catnip: Math.ceil(1600 * 0.75 * Math.pow(2.25, i - 1)),
        wood: Math.ceil(1600 * 0.75 * Math.pow(2.2, i - 1)),
        minerals: Math.ceil(2200 * 0.75 * Math.pow(2.25, i - 1)),
      },
      prereq: i === 1 ? [] : [`mineralsStorageBoost${i - 1}`],
      req: () => true,
      effects: { capMineralsMul: 1.5 },
      timeMul: 12,
    };
  }

  chain(
    "hyperGrowth",
    "指数引擎",
    "ultraStorage",
    allOtherTechResearched,
    8,
    (i) => ({
      catnip: Math.ceil(4000 * Math.pow(2.1, i - 1)),
      wood: Math.ceil(2500 * Math.pow(2.1, i - 1)),
      minerals: Math.ceil(2000 * Math.pow(2.15, i - 1)),
    }),
    (i) => {
      const m = i <= 2 ? 1.6 : i === 3 ? 2.0 : i === 4 ? 2.6 : i === 5 ? 3.4 : i === 6 ? 4.6 : i === 7 ? 6.2 : 8.5;
      return {
        catnipPerSecMul: m,
        woodRateMul: m,
        mineralsRateMul: m,
        capCatnipAdd: 800 * i,
        capWoodAdd: 900 * i,
        capMineralsAdd: 840 * i,
        catchChanceAdd: 0.01 * i,
      };
    },
    (i) => `大幅提升资源增长，让后期体验更有坡度。`
  );

  if (tech.hyperGrowth1) {
    tech.hyperGrowth1.cost = {
      catnip: Math.ceil(4000 * 10),
      wood: Math.ceil(2500 * 10),
      minerals: Math.ceil(2000 * 10),
    };
    tech.hyperGrowth1.timeMul = 10;
    // 修复：从突兀的×10降为×2.5，与chain中hyperGrowth2(×1.6→×2.5)形成平滑过渡
    tech.hyperGrowth1.effects = {
      ...tech.hyperGrowth1.effects,
      catnipPerSecMul: 2.5,
      woodRateMul: 2.5,
      mineralsRateMul: 2.5,
    };
  }

  return tech;
}

export const EXTRA_TECH_DEFS = buildExtraTechDefs();

export const EXTRA_TECH_FLAGS = Object.fromEntries(Object.keys(EXTRA_TECH_DEFS).map((k) => [k, false]));

/** ponytail: static map + prefix rules; new tech without label falls back to mid */
export const TECH_STAGE_ORDER = ["early", "mid", "late"];

export const TECH_STAGE_LABELS = {
  early: "早期 · 营地起步",
  mid: "中期 · 扩产与工具",
  late: "后期 · 飞跃与指数",
};

const TECH_STAGE_BY_ID = {
  pokeballBasics: "early",
  berryCultivation: "early",
  composting: "early",
  backpackWeaving: "early",
  ballMolds: "early",
  campLogistics: "early",
  trainerDrills: "early",
  irrigation: "mid",
  greenhouse: "mid",
  carpentry: "mid",
  fieldResearch: "mid",
  fieldGuide: "mid",
  apricornCrafting: "mid",
  reinforcedBalls: "mid",
  captureTraining: "mid",
  mineralSurvey: "mid",
  excavationTools: "mid",
  refining: "mid",
  sawmillPlans: "mid",
  oreStorage: "mid",
  supplyLines: "mid",
  efficientConstruction: "mid",
  advancedGear: "mid",
  researchMethod: "mid",
  ultraStorage: "late",
};

const TECH_STAGE_PREFIX = [
  ["agroBoost", "late"],
  ["forestryBoost", "late"],
  ["miningBoost", "late"],
  ["catnipStorageBoost", "late"],
  ["woodStorageBoost", "late"],
  ["mineralsStorageBoost", "late"],
  ["hyperGrowth", "late"],
];

export function getTechStage(tid) {
  if (typeof tid !== "string" || !tid) return "mid";
  if (TECH_STAGE_BY_ID[tid]) return TECH_STAGE_BY_ID[tid];
  for (const [prefix, stage] of TECH_STAGE_PREFIX) {
    if (tid.startsWith(prefix)) return stage;
  }
  return "mid";
}
