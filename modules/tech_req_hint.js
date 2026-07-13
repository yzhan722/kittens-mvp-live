import { BUILDING_DEFS } from "./defs_buildings.js";

function buildingHint(state, bid, need) {
  const owned = state?.buildings?.[bid]?.owned ?? 0;
  if (owned >= need) return "";
  const name = BUILDING_DEFS[bid]?.name ?? bid;
  return `需要：${name} Lv.${need}`;
}

const TID_RULES = {
  irrigation: { bid: "field", need: 2 },
  greenhouse: { bid: "hut", need: 1 },
  backpackWeaving: { bid: "hut", need: 1 },
  ballMolds: { bid: "hut", need: 1 },
  apricornCrafting: { bid: "hut", need: 2 },
  reinforcedBalls: { bid: "workshop", need: 1 },
  fieldResearch: { bid: "workshop", need: 1 },
  fieldGuide: { bid: "workshop", need: 1 },
  mineralSurvey: { bid: "workshop", need: 1 },
  excavationTools: { bid: "workshop", need: 1 },
  refining: { bid: "workshop", need: 1 },
  carpentry: { bid: "hut", need: 1 },
  sawmillPlans: { bid: "workshop", need: 1 },
  supplyLines: { bid: "workshop", need: 1 },
  efficientConstruction: { bid: "workshop", need: 1 },
  advancedGear: { bid: "workshop", need: 1 },
  researchMethod: { bid: "workshop", need: 1 },
};

const PREFIX_RULES = [
  { prefix: "agroBoost", bid: "field", need: 3 },
  { prefix: "forestryBoost", bid: "lumberYard", need: 2 },
  { prefix: "miningBoost", bid: "quarry", need: 2 },
];

/** Human-readable building gate when tech.req(state) is false. */
export function techReqHint(state, tid, tdef) {
  if (!tdef || typeof tdef.req !== "function") return "";
  if (tdef.req(state)) return "";
  if (typeof tdef.reqHint === "string" && tdef.reqHint) return tdef.reqHint;

  const id = typeof tid === "string" ? tid : "";
  if (id.startsWith("hyperGrowth")) return "需要：完成其余基础科技链";

  const direct = TID_RULES[id];
  if (direct) return buildingHint(state, direct.bid, direct.need);

  for (const { prefix, bid, need } of PREFIX_RULES) {
    if (id.startsWith(prefix)) return buildingHint(state, bid, need);
  }

  if ((state?.buildings?.workshop?.owned ?? 0) < 1) {
    const needsWorkshop = [
      "reinforcedBalls", "fieldResearch", "fieldGuide", "mineralSurvey", "excavationTools",
      "refining", "sawmillPlans", "supplyLines", "efficientConstruction", "advancedGear", "researchMethod",
    ];
    if (needsWorkshop.some((k) => id.includes(k) || (tdef.prereq ?? []).includes(k))) {
      return buildingHint(state, "workshop", 1);
    }
  }

  return "需要：提升相关建筑等级";
}
