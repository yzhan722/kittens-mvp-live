const pad3 = (n) => String(n).padStart(3, "0");

const getPokemonZhName = (dex) => {
  const key = `p${pad3(dex)}`;
  const map = globalThis.POKEMON_ZH;
  if (map && typeof map === "object") {
    const v = map[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
};

const getCaptureRate = (dex) => {
  const key = `p${pad3(dex)}`;
  const map = globalThis.POKEMON_CATCH_RATE;
  if (map && typeof map === "object") {
    const v = map[key];
    if (typeof v === "number" && v >= 0 && v <= 255) return v;
  }
  return 45; // default fallback
};

// 基于官方 capture_rate 计算稀有度
// < 10: epic, 10-50: rare, 50-150: uncommon, >= 150: common
const getPokemonTier = (dex) => {
  const key = `p${pad3(dex)}`;
  const tierMap = globalThis.POKEMON_TIER;
  if (tierMap && typeof tierMap === "object") {
    const v = tierMap[key];
    if (typeof v === "string" && v) return v;
  }
  const rate = getCaptureRate(dex);
  if (rate < 10) return "epic";
  if (rate < 50) return "rare";
  if (rate < 150) return "uncommon";
  return "common";
};

export { getCaptureRate, getPokemonTier };

export const SEED_POKEMON = [
  { dex: 1, name: "妙蛙种子", tier: "common", legacyId: "bulbasaur" },
  { dex: 2, name: "妙蛙草", tier: "uncommon", legacyId: "ivysaur" },
  { dex: 3, name: "妙蛙花", tier: "rare", legacyId: "venusaur" },
  { dex: 4, name: "小火龙", tier: "common", legacyId: "charmander" },
  { dex: 5, name: "火恐龙", tier: "uncommon", legacyId: "charmeleon" },
  { dex: 6, name: "喷火龙", tier: "rare", legacyId: "charizard" },
  { dex: 7, name: "杰尼龟", tier: "common", legacyId: "squirtle" },
  { dex: 8, name: "卡咪龟", tier: "uncommon", legacyId: "wartortle" },
  { dex: 9, name: "水箭龟", tier: "rare", legacyId: "blastoise" },
  { dex: 10, name: "绿毛虫", tier: "common", legacyId: "caterpie" },
  { dex: 11, name: "铁甲蛹", tier: "common", legacyId: "metapod" },
  { dex: 12, name: "巴大蝶", tier: "uncommon", legacyId: "butterfree" },
  { dex: 13, name: "独角虫", tier: "common", legacyId: "weedle" },
  { dex: 14, name: "铁壳蛹", tier: "common", legacyId: "kakuna" },
  { dex: 15, name: "大针蜂", tier: "uncommon", legacyId: "beedrill" },
  { dex: 16, name: "波波", tier: "common", legacyId: "pidgey" },
  { dex: 17, name: "比比鸟", tier: "common", legacyId: "pidgeotto" },
  { dex: 18, name: "大比鸟", tier: "uncommon", legacyId: "pidgeot" },
  { dex: 19, name: "小拉达", tier: "common", legacyId: "rattata" },
  { dex: 20, name: "拉达", tier: "common", legacyId: "raticate" },
  { dex: 21, name: "烈雀", tier: "common", legacyId: "spearow" },
  { dex: 22, name: "大嘴雀", tier: "uncommon", legacyId: "fearow" },
  { dex: 23, name: "阿柏蛇", tier: "common", legacyId: "ekans" },
  { dex: 24, name: "阿柏怪", tier: "uncommon", legacyId: "arbok" },
  { dex: 25, name: "皮卡丘", tier: "uncommon", legacyId: "pikachu" },
  { dex: 26, name: "雷丘", tier: "rare", legacyId: "raichu" },
  { dex: 27, name: "穿山鼠", tier: "common", legacyId: "sandshrew" },
  { dex: 28, name: "穿山王", tier: "uncommon", legacyId: "sandslash" },
  { dex: 29, name: "尼多兰", tier: "common", legacyId: "nidoran_f" },
  { dex: 30, name: "尼多娜", tier: "uncommon", legacyId: "nidorina" },
  { dex: 31, name: "尼多后", tier: "rare", legacyId: "nidoqueen" },
  { dex: 32, name: "尼多朗", tier: "common", legacyId: "nidoran_m" },
  { dex: 33, name: "尼多力诺", tier: "uncommon", legacyId: "nidorino" },
  { dex: 34, name: "尼多王", tier: "rare", legacyId: "nidoking" },
  { dex: 35, name: "皮皮", tier: "uncommon", legacyId: "clefairy" },
  { dex: 36, name: "皮可西", tier: "rare", legacyId: "clefable" },
  { dex: 37, name: "六尾", tier: "common", legacyId: "vulpix" },
  { dex: 38, name: "九尾", tier: "rare", legacyId: "ninetales" },
  { dex: 39, name: "胖丁", tier: "common", legacyId: "jigglypuff" },
  { dex: 40, name: "胖可丁", tier: "uncommon", legacyId: "wigglytuff" },
  { dex: 41, name: "超音蝠", tier: "common", legacyId: "zubat" },
  { dex: 42, name: "大嘴蝠", tier: "uncommon", legacyId: "golbat" },
  { dex: 43, name: "走路草", tier: "common", legacyId: "oddish" },
  { dex: 44, name: "臭臭花", tier: "common", legacyId: "gloom" },
  { dex: 45, name: "霸王花", tier: "rare", legacyId: "vileplume" },
  { dex: 46, name: "派拉斯", tier: "common", legacyId: "paras" },
  { dex: 47, name: "派拉斯特", tier: "uncommon", legacyId: "parasect" },
  { dex: 48, name: "毛球", tier: "common", legacyId: "venonat" },
  { dex: 49, name: "摩鲁蛾", tier: "uncommon", legacyId: "venomoth" },
  { dex: 50, name: "地鼠", tier: "common", legacyId: "diglett" },
  { dex: 51, name: "三地鼠", tier: "uncommon", legacyId: "dugtrio" },
  { dex: 52, name: "喵喵", tier: "common", legacyId: "meowth" },
  { dex: 53, name: "猫老大", tier: "uncommon", legacyId: "persian" },
  { dex: 54, name: "可达鸭", tier: "common", legacyId: "psyduck" },
  { dex: 55, name: "哥达鸭", tier: "uncommon", legacyId: "golduck" },
  { dex: 56, name: "猴怪", tier: "common", legacyId: "mankey" },
  { dex: 57, name: "火爆猴", tier: "uncommon", legacyId: "primeape" },
  { dex: 58, name: "卡蒂狗", tier: "uncommon", legacyId: "growlithe" },
  { dex: 59, name: "风速狗", tier: "rare", legacyId: "arcanine" },
  { dex: 60, name: "蚊香蝌蚪", tier: "common", legacyId: "poliwag" },
  { dex: 61, name: "蚊香君", tier: "uncommon", legacyId: "poliwhirl" },
  { dex: 62, name: "蚊香泳士", tier: "rare", legacyId: "poliwrath" },
  { dex: 63, name: "凯西", tier: "uncommon", legacyId: "abra" },
  { dex: 64, name: "勇基拉", tier: "rare", legacyId: "kadabra" },
  { dex: 65, name: "胡地", tier: "epic", legacyId: "alakazam" },
];

export function buildLegacyIdMap() {
  const map = {};
  for (const p of SEED_POKEMON) {
    if (p.legacyId) map[p.legacyId] = `p${pad3(p.dex)}`;
  }
  return map;
}

export function buildPokemonList721() {
  const seedByDex = {};
  for (const p of SEED_POKEMON) seedByDex[p.dex] = p;

  const list = [];
  // 覆盖 Gen1-8（含阿罗拉 722-809、伽勒尔 810-898）
  for (let dex = 1; dex <= 898; dex += 1) {
    const seed = seedByDex[dex];
    const id = `p${pad3(dex)}`;
    const zhName = getPokemonZhName(dex);
    const tier = getPokemonTier(dex);
    if (seed) {
      list.push({ id, dex, name: zhName || seed.name, tier: tier || seed.tier });
      continue;
    }

    // 占位名称：先保证槽位与搜索/分页可用
    list.push({ id, dex, name: zhName || `宝可梦${pad3(dex)}`, tier: tier || "common" });
  }
  return list;
}

export const legacyIdMap = buildLegacyIdMap();
export const pokemon = buildPokemonList721();
