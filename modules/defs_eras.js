/** @typedef {{ id: string, kind: "main"|"side", type: string, target: number, scope: "era"|"absolute", buildingId?: string, areaId?: string, or?: object[] }} EraQuestTemplate */

export const ERA_DEFS = [
  {
    id: "dawn",
    name: "宝可梦出现之时",
    blurb: "最初的相遇，草丛里充满未知。",
    pveHint: "初遇纪：先用高等级队伍稳过挑战页。",
    encounterBias: { tierBoost: { common: 1.08, uncommon: 1.05 } },
    logOnEnter: null,
    mutators: [],
    quests: [
      { id: "dawn_gather_400", kind: "main", type: "gather_total", target: 400, scope: "era" },
      { id: "dawn_catch_80", kind: "main", type: "catch_count", target: 80, scope: "era" },
      { id: "dawn_berry_400", kind: "main", type: "berry_earned", target: 400, scope: "era" },
    ],
  },
  {
    id: "hamlet",
    name: "秘传之里",
    blurb: "秘传之里的树果香气招来草系与普通系。",
    pveHint: "秘传之里：带上草系伙伴，挑战前先看推荐属性。",
    encounterBias: { typeBoost: { grass: 1.35, normal: 1.35 } },
    logOnEnter: "迈入了「秘传之里」——树果的香气弥漫开来。",
    mutators: ["berryYield_12"],
    quests: [
      { id: "hamlet_field_4", kind: "main", type: "building_level", target: 4, scope: "absolute", buildingId: "field" },
      { id: "hamlet_berry_800", kind: "main", type: "berry_earned", target: 800, scope: "era" },
      { id: "hamlet_dex_25", kind: "main", type: "dex_unique", target: 25, scope: "absolute" },
      { id: "hamlet_catch_100", kind: "main", type: "catch_count", target: 100, scope: "era" },
    ],
  },
  {
    id: "fossil",
    name: "化石苏醒",
    blurb: "化石馆的尘土飞扬——岩石与地面更常见。",
    pveHint: "化石苏醒：岩石与地面伙伴适合打持久挑战。",
    encounterBias: { typeBoost: { rock: 1.4, ground: 1.4 } },
    logOnEnter: "迈入了「化石苏醒」——化石宝可梦的气息变浓了。",
    mutators: ["catchRate_6", "researchTime_m8"],
    quests: [
      { id: "fossil_research_5", kind: "main", type: "research_done", target: 5, scope: "absolute" },
      { id: "fossil_catch_150", kind: "main", type: "catch_count", target: 150, scope: "era" },
      { id: "fossil_dex_45", kind: "main", type: "dex_unique", target: 45, scope: "absolute" },
      { id: "fossil_ball_200", kind: "main", type: "pokeball_earned", target: 200, scope: "era" },
    ],
  },
  {
    id: "gym",
    name: "道馆挑战纪",
    blurb: "道馆试炼的气息：战斗型更活跃。",
    pveHint: "道馆挑战纪：优先用推荐属性打挑战页。",
    encounterBias: { typeBoost: { fighting: 1.25, electric: 1.15, water: 1.15 }, tierBoost: { rare: 1.15 } },
    logOnEnter: "迈入了「道馆挑战纪」——挑战道馆的时代开始了。",
    mutators: ["pokeballGain_10", "encounterRefresh_fast"],
    quests: [
      {
        id: "gym_johto_or_dex",
        kind: "main",
        type: "or",
        target: 1,
        scope: "absolute",
        or: [
          { type: "area_unlock", areaId: "johto", target: 1 },
          { type: "dex_unique", target: 55 },
        ],
      },
      { id: "gym_catch_200", kind: "main", type: "catch_count", target: 200, scope: "era" },
      { id: "gym_ball_280", kind: "main", type: "pokeball_earned", target: 280, scope: "era" },
      { id: "gym_bld_sum_18", kind: "main", type: "building_levels_sum", target: 18, scope: "absolute" },
    ],
  },
  {
    id: "champion",
    name: "冠军之路",
    blurb: "通往联盟之路，少见个体变多。",
    pveHint: "冠军之路：练高星主力，再冲章节三星。",
    encounterBias: { tierBoost: { uncommon: 1.2, rare: 1.2 } },
    logOnEnter: "迈入了「冠军之路」——联盟的荣光在召唤你。",
    mutators: ["pokeballCap_8"],
    quests: [
      { id: "champ_dex_90", kind: "main", type: "dex_unique", target: 90, scope: "absolute" },
      { id: "champ_research_8", kind: "main", type: "research_done", target: 8, scope: "absolute" },
      { id: "champ_catch_240", kind: "main", type: "catch_count", target: 240, scope: "era" },
      { id: "champ_berry_1200", kind: "main", type: "berry_earned", target: 1200, scope: "era" },
    ],
  },
  {
    id: "mega",
    name: "Mega 进化潮",
    blurb: "关键石共鸣——高成长线精灵权重微升。",
    pveHint: "Mega 进化潮：高成长精灵配推荐属性更稳。",
    encounterBias: { dexRangeBoost: { min: 3, max: 905, mul: 1.12 }, tierBoost: { rare: 1.2 } },
    logOnEnter: "迈入了「Mega 进化潮」——关键石的力量苏醒了。",
    mutators: ["buildingYield_10", "researchCost_m8"],
    quests: [
      { id: "mega_lab_5", kind: "main", type: "building_level", target: 5, scope: "absolute", buildingId: "researchLab" },
      { id: "mega_research_11", kind: "main", type: "research_done", target: 11, scope: "absolute" },
      { id: "mega_dex_130", kind: "main", type: "dex_unique", target: 130, scope: "absolute" },
      { id: "mega_catch_260", kind: "main", type: "catch_count", target: 260, scope: "era" },
    ],
  },
  {
    id: "dynamax",
    name: "极巨化旷野",
    blurb: "旷野气压上升，大型个体更易现身。",
    pveHint: "极巨化旷野：堆血量与抗性，适合硬闯挑战。",
    encounterBias: { tierBoost: { rare: 1.25, epic: 1.25 } },
    logOnEnter: "迈入了「极巨化旷野」——旷野之上云层翻涌。",
    mutators: ["fieldYield_10", "catchRate_3"],
    quests: [
      {
        id: "dyna_hoenn_or_dex",
        kind: "main",
        type: "or",
        target: 1,
        scope: "absolute",
        or: [
          { type: "area_unlock", areaId: "hoenn", target: 1 },
          { type: "dex_unique", target: 110 },
        ],
      },
      { id: "dyna_gather_500", kind: "main", type: "gather_total", target: 500, scope: "era" },
      { id: "dyna_catch_300", kind: "main", type: "catch_count", target: 300, scope: "era" },
      { id: "dyna_berry_1500", kind: "main", type: "berry_earned", target: 1500, scope: "era" },
    ],
  },
  {
    id: "terastal",
    name: "太晶祭典",
    blurb: "太晶辉光下，属性鲜明的精灵更醒目。",
    pveHint: "太晶祭典：围绕关卡属性换队，收益最高。",
    encounterBias: { tierBoost: { rare: 1.12 } },
    logOnEnter: "迈入了「太晶祭典」——宝可梦披上了晶莹的光辉。",
    mutators: ["researchTime_m10", "catchRate_4"],
    quests: [
      { id: "tera_research_14", kind: "main", type: "research_done", target: 14, scope: "absolute" },
      { id: "tera_dex_200", kind: "main", type: "dex_unique", target: 200, scope: "absolute" },
      { id: "tera_bld_sum_55", kind: "main", type: "building_levels_sum", target: 55, scope: "absolute" },
      { id: "tera_catch_320", kind: "main", type: "catch_count", target: 320, scope: "era" },
    ],
  },
  {
    id: "paradox",
    name: "悖论时空",
    blurb: "时空错乱：稀有与闪光的缝隙被撕开。",
    pveHint: "悖论时空：用最强克制队冲刺高星挑战。",
    encounterBias: { tierBoost: { rare: 1.25, epic: 1.35 } },
    logOnEnter: "迈入了「悖论时空」——过去与未来在此交叠。",
    mutators: ["shiny_micro", "rareWeight_micro", "allYield_5"],
    quests: [
      { id: "paradox_dex_300", kind: "main", type: "dex_unique", target: 300, scope: "absolute" },
      { id: "paradox_catch_360", kind: "main", type: "catch_count", target: 360, scope: "era" },
      { id: "paradox_research_16", kind: "main", type: "research_done", target: 16, scope: "absolute" },
      { id: "paradox_ball_400", kind: "main", type: "pokeball_earned", target: 400, scope: "era" },
    ],
  },
];

export const ERA_MUTATORS = {
  berryYield_12: { catnipPerSecMul: 1.12 },
  catchRate_6: { catchChanceAdd: 0.06 },
  catchRate_3: { catchChanceAdd: 0.03 },
  catchRate_4: { catchChanceAdd: 0.04 },
  researchTime_m8: { researchTimeMul: 0.92 },
  researchTime_m10: { researchTimeMul: 0.90 },
  pokeballGain_10: { pokeballCraftBonusMul: 1.1 },
  encounterRefresh_fast: { encounterCooldownMul: 0.9 },
  pokeballCap_8: { capPokeballMul: 1.08 },
  buildingYield_10: { catnipPerSecMul: 1.1, woodRateMul: 1.1, mineralsRateMul: 1.1 },
  researchCost_m8: { researchCostMul: 0.92 },
  fieldYield_10: { catnipPerSecMul: 1.1 },
  shiny_micro: { shinyChanceMul: 1.15 },
  rareWeight_micro: { rareWeightMul: 1.1 },
  allYield_5: { catnipPerSecMul: 1.05, woodRateMul: 1.05, mineralsRateMul: 1.05 },
};

export function getEraDefById(id) {
  return ERA_DEFS.find((e) => e.id === id) || ERA_DEFS[0];
}

export function getEraDefByIndex(index) {
  const i = Math.max(0, Math.min(ERA_DEFS.length - 1, Math.floor(index)));
  return ERA_DEFS[i];
}
