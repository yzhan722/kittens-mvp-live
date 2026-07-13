import { clamp, nowMs, randFloat } from "./utils.js";
import { getStarBonusMul } from "./stars.js";
import { getAbilityInfo, monPassive, rollAbility } from "./abilities.js";

// ========== 性格系统 ==========
export const NATURES = [
  { id: "hardy",   name: "勤奋",  up: null,   down: null },
  { id: "lonely",  name: "孤僻",  up: "atk",  down: "def" },
  { id: "brave",   name: "勇敢",  up: "atk",  down: "spe" },
  { id: "adamant", name: "固执",  up: "atk",  down: "spa" },
  { id: "naughty", name: "顽皮",  up: "atk",  down: "spd" },
  { id: "bold",    name: "大胆",  up: "def",  down: "atk" },
  { id: "docile",  name: "坦率",  up: null,   down: null },
  { id: "relaxed", name: "悠闲",  up: "def",  down: "spe" },
  { id: "impish",  name: "淘气",  up: "def",  down: "spa" },
  { id: "lax",     name: "随和",  up: "def",  down: "spd" },
  { id: "timid",   name: "胆小",  up: "spe",  down: "atk" },
  { id: "hasty",   name: "急躁",  up: "spe",  down: "def" },
  { id: "serious", name: "认真",  up: null,   down: null },
  { id: "jolly",   name: "爽朗",  up: "spe",  down: "spa" },
  { id: "naive",   name: "天真",  up: "spe",  down: "spd" },
  { id: "modest",  name: "内敛",  up: "spa",  down: "atk" },
  { id: "mild",    name: "温和",  up: "spa",  down: "def" },
  { id: "quiet",   name: "冷静",  up: "spa",  down: "spe" },
  { id: "bashful", name: "害羞",  up: null,   down: null },
  { id: "rash",    name: "鲁莽",  up: "spa",  down: "spd" },
  { id: "calm",    name: "温顺",  up: "spd",  down: "atk" },
  { id: "gentle",  name: "温柔",  up: "spd",  down: "def" },
  { id: "sassy",   name: "自大",  up: "spd",  down: "spe" },
  { id: "careful", name: "慎重",  up: "spd",  down: "spa" },
  { id: "quirky",  name: "浮躁",  up: null,   down: null },
];

// 特殊性格的被动技能加成
// @deprecated 效果已迁至 abilities.js；保留映射仅供旧代码/测试对照，运行时请用 monPassive()
export const NATURE_PASSIVE = {
  adamant: { desc: "训练经验 +5%", key: "trainExpBonus", val: 0.05 },
  timid: { desc: "捕获省球（10%概率）", key: "ballSaveChance", val: 0.1 },
  serious: { desc: "研究速度 +3%", key: "researchSpeedBonus", val: 0.03 },
  relaxed: { desc: "饱腹恢复 +10%", key: "satietyRegenBonus", val: 0.1 },
  impish: { desc: "远征时间 -5%", key: "expeditionTimeBonus", val: 0.05 },
  jolly: { desc: "亲密度获取 +5%", key: "affectionBonus", val: 0.05 },
  modest: { desc: "图鉴加成 +2%", key: "dexBonusExtra", val: 0.02 },
  calm: { desc: "资源产量 +3%", key: "resProdBonus", val: 0.03 },
  lonely: { desc: "单独上阵训练经验 +8%", key: "soloTrainExpBonus", val: 0.08 },
  bold: { desc: "被攻击时减伤 +5%", key: "defDamageReduce", val: 0.05 },
  hasty: { desc: "遭遇充能恢复 +10%", key: "encounterRechargeBonus", val: 0.1 },
  naive: { desc: "高级遭遇未捕获偏好 +10%", key: "advEncMissingBonus", val: 0.1 },
  mild: { desc: "繁殖速度 +5%", key: "breedSpeedBonus", val: 0.05 },
  lax: { desc: "资源上限 +2%", key: "resCapBonus", val: 0.02 },
  naughty: { desc: "逃跑必定成功", key: "alwaysEscape", val: 1.0 },
  gentle: { desc: "饱腹消耗 -5%", key: "satietyDecayReduce", val: 0.05 },
  hardy: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  docile: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  bashful: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  quirky: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
};

export function rollNature() {
  return NATURES[Math.floor(randFloat() * NATURES.length)].id;
}

export function getNatureInfo(natureId) {
  return NATURES.find((n) => n.id === natureId) ?? NATURES[0];
}

export function getNatureMul(natureId, stat) {
  const n = getNatureInfo(natureId);
  if (n.up === stat) return 1.1;
  if (n.down === stat) return 0.9;
  return 1;
}
// ============================

export function expNeedForLevel(lvl) {
  // 优化经验曲线：低等级平缓，高等级有成长感但不过于陡峭
  // Lv1-20: 快速，Lv21-60: 二次加速，Lv61-100: 三次曲线
  if (lvl <= 20) return Math.floor(15 + lvl * 4);
  if (lvl <= 60) return Math.floor(80 + (lvl - 20) * (lvl - 20) * 1.8);
  return Math.floor(2960 + (lvl - 60) * (lvl - 60) * 4.5);
}

function makeStatObj(v) {
  return { hp: v, atk: v, def: v, spa: v, spd: v, spe: v };
}

function rollIv() {
  return {
    hp: Math.floor(randFloat() * 32),
    atk: Math.floor(randFloat() * 32),
    def: Math.floor(randFloat() * 32),
    spa: Math.floor(randFloat() * 32),
    spd: Math.floor(randFloat() * 32),
    spe: Math.floor(randFloat() * 32),
  };
}

function createBaseStats(species) {
  const tierBonus = species.tier === "epic" ? 42 : species.tier === "rare" ? 26 : species.tier === "uncommon" ? 12 : 0;
  const base = 18 + (species.dex % 28) + tierBonus;
  const s = makeStatObj(base);
  s.hp = base + 12;
  s.spe = base + ((species.dex % 7) - 3);
  return s;
}

export function getMonCurrentStats(mon, getPokeApiDataByDex) {
  const lvl = clamp(mon.lvl, 1, 100);
  const aff = clamp(typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0, 0, 100);
  const affMul = 1 + Math.floor(aff) * 0.01;
  const starMul = getStarBonusMul(mon.stars);
  // 性格对能力值的影响
  const natureId = typeof mon.nature === "string" ? mon.nature : "hardy";
  const totalMul = affMul * starMul;

  const bonus = mon.statBonus && typeof mon.statBonus === "object" ? mon.statBonus : {};
  const bHp = typeof bonus.hp === "number" && Number.isFinite(bonus.hp) ? bonus.hp : 0;
  const bAtk = typeof bonus.atk === "number" && Number.isFinite(bonus.atk) ? bonus.atk : 0;
  const bDef = typeof bonus.def === "number" && Number.isFinite(bonus.def) ? bonus.def : 0;
  const bSpa = typeof bonus.spa === "number" && Number.isFinite(bonus.spa) ? bonus.spa : 0;
  const bSpd = typeof bonus.spd === "number" && Number.isFinite(bonus.spd) ? bonus.spd : 0;
  const bSpe = typeof bonus.spe === "number" && Number.isFinite(bonus.spe) ? bonus.spe : 0;

  const api = typeof getPokeApiDataByDex === "function" ? getPokeApiDataByDex(mon.dex) : null;
  const base = api?.baseStats;
  if (base && typeof base === "object") {
    const iv = mon.iv && typeof mon.iv === "object" ? mon.iv : {};
    const ev4 = 0;
    const hp = Math.floor(((2 * base.hp + (iv.hp ?? 0) + ev4) * lvl) / 100) + lvl + 10;
    const atk = Math.floor(((2 * base.atk + (iv.atk ?? 0) + ev4) * lvl) / 100) + 5;
    const def = Math.floor(((2 * base.def + (iv.def ?? 0) + ev4) * lvl) / 100) + 5;
    const spa = Math.floor(((2 * base.spa + (iv.spa ?? 0) + ev4) * lvl) / 100) + 5;
    const spd = Math.floor(((2 * base.spd + (iv.spd ?? 0) + ev4) * lvl) / 100) + 5;
    const spe = Math.floor(((2 * base.spe + (iv.spe ?? 0) + ev4) * lvl) / 100) + 5;
    return {
      hp:  Math.max(1, Math.floor(hp  * totalMul) + bHp),
      atk: Math.max(1, Math.floor(atk * totalMul * getNatureMul(natureId, "atk")) + bAtk),
      def: Math.max(1, Math.floor(def * totalMul * getNatureMul(natureId, "def")) + bDef),
      spa: Math.max(1, Math.floor(spa * totalMul * getNatureMul(natureId, "spa")) + bSpa),
      spd: Math.max(1, Math.floor(spd * totalMul * getNatureMul(natureId, "spd")) + bSpd),
      spe: Math.max(1, Math.floor(spe * totalMul * getNatureMul(natureId, "spe")) + bSpe),
    };
  }

  const mul = 1 + (lvl - 1) * 0.03;
  return {
    hp:  Math.max(1, Math.floor((mon.baseStats.hp  + mon.iv.hp)  * mul * totalMul) + bHp),
    atk: Math.max(1, Math.floor((mon.baseStats.atk + mon.iv.atk) * mul * totalMul * getNatureMul(natureId, "atk")) + bAtk),
    def: Math.max(1, Math.floor((mon.baseStats.def + mon.iv.def) * mul * totalMul * getNatureMul(natureId, "def")) + bDef),
    spa: Math.max(1, Math.floor((mon.baseStats.spa + mon.iv.spa) * mul * totalMul * getNatureMul(natureId, "spa")) + bSpa),
    spd: Math.max(1, Math.floor((mon.baseStats.spd + mon.iv.spd) * mul * totalMul * getNatureMul(natureId, "spd")) + bSpd),
    spe: Math.max(1, Math.floor((mon.baseStats.spe + mon.iv.spe) * mul * totalMul * getNatureMul(natureId, "spe")) + bSpe),
  };
}

export function monPower(mon, getPokeApiDataByDex) {
  const s = getMonCurrentStats(mon, getPokeApiDataByDex);
  let p = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  const pass = monPassive(mon);
  if (pass?.key === "pvePowerBonus" && typeof pass.val === "number") {
    p = Math.floor(p * (1 + pass.val));
  }
  return p;
}

export function createMonInstance(species, opts = {}) {
  const idOverride = opts?.idOverride;
  const idFallback = opts?.idFallback;
  const createdAt = opts?.createdAt;

  const id = Number.isFinite(idOverride)
    ? Math.max(1, Math.floor(idOverride))
    : Number.isFinite(idFallback)
      ? Math.max(1, Math.floor(idFallback))
      : 1;

  const iv = rollIv();
  const baseStats = createBaseStats(species);
  const nature =
    typeof opts?.nature === "string" && NATURES.some((n) => n.id === opts.nature) ? opts.nature : rollNature();
  const ability =
    typeof opts?.ability === "string" && getAbilityInfo(opts.ability) ? opts.ability : rollAbility();

  return {
    id,
    pid: species.id,
    dex: species.dex,
    name: species.name,
    tier: species.tier,
    lvl: 1,
    exp: 0,
    satiety: 50,
    affection: 0,
    stars: 0,
    nature,
    ability,
    autoExpCarry: 0,
    affectionCarry: 0,
    baseStats,
    iv,
    statBonus: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    created: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : nowMs(),
  };
}

export function addExpToMon(mon, expAdd) {
  let exp = Math.max(0, Math.floor(mon.exp + expAdd));
  let lvl = mon.lvl;
  while (lvl < 100) {
    const need = expNeedForLevel(lvl);
    if (exp < need) break;
    exp -= need;
    lvl += 1;
  }
  mon.exp = exp;
  mon.lvl = lvl;
}

export function evolveMon(mon, toPid, getSpeciesByPid) {
  const to = typeof getSpeciesByPid === "function" ? getSpeciesByPid(toPid) : null;
  if (!to) return false;

  mon.pid = to.id;
  mon.dex = to.dex;
  mon.name = to.name;
  mon.tier = to.tier;

  const bump = 1.12;
  mon.baseStats = {
    hp:  Math.floor(mon.baseStats.hp  * bump + 6),
    atk: Math.floor(mon.baseStats.atk * bump + 5),
    def: Math.floor(mon.baseStats.def * bump + 5),
    spa: Math.floor(mon.baseStats.spa * bump + 5),
    spd: Math.floor(mon.baseStats.spd * bump + 5),
    spe: Math.floor(mon.baseStats.spe * bump + 5),
  };
  return true;
}
