// Gameplay fun helpers — nature passives, lucky type-day, catch streak
import { NATURE_PASSIVE } from "../mons.js";
import { formatPvpSeasonStats } from "./pvp_narrative.js";

const TYPE_POOL = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const TYPE_ZH = {
  normal: "一般", fire: "火", water: "水", grass: "草", electric: "电", ice: "冰",
  fighting: "格斗", poison: "毒", ground: "地面", flying: "飞行", psychic: "超能力",
  bug: "虫", rock: "岩石", ghost: "幽灵", dragon: "龙", dark: "恶", steel: "钢", fairy: "妖精",
};

export function typeZh(id) {
  return TYPE_ZH[id] || id;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Best passive val among party for a NATURE_PASSIVE key (0 if none). */
export function partyBestPassive(state, key) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  let best = 0;
  for (const m of list) {
    const pass = NATURE_PASSIVE[m?.nature];
    if (pass?.key === key && typeof pass.val === "number") {
      best = Math.max(best, pass.val);
    }
  }
  return best;
}

/** Ensure today's lucky type; stable for the calendar day. */
export function ensureLuckyDay(state) {
  if (!state || typeof state !== "object") return null;
  const today = todayStr();
  if (state.luckyDay && state.luckyDay.date === today && TYPE_POOL.includes(state.luckyDay.type)) {
    return state.luckyDay;
  }
  // ponytail: seeded by date string hash — same day same type across reloads without RNG save
  let h = 0;
  for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) >>> 0;
  const type = TYPE_POOL[h % TYPE_POOL.length];
  state.luckyDay = { date: today, type };
  return state.luckyDay;
}

/** +10% catch chance mul when encounter has today's lucky type. */
export function luckyCatchMul(state, monTypes) {
  const day = ensureLuckyDay(state);
  if (!day?.type) return 1;
  const types = Array.isArray(monTypes) ? monTypes : [];
  return types.map((t) => String(t || "").toLowerCase()).includes(day.type) ? 1.1 : 1;
}

/** Best pityAccelBonus among party (0 if none). */
export function partyPityAccel(state) {
  return partyBestPassive(state, "pityAccelBonus");
}

/**
 * How many catchFails to add on a failed catch.
 * Neutral natures (party or wild encounter): 20% chance to count as 2 fails.
 */
export function pityFailStep(state, randFloat, encounterNature = null) {
  const fromParty = partyPityAccel(state);
  const encPass = encounterNature ? NATURE_PASSIVE[encounterNature] : null;
  const fromEnc = encPass?.key === "pityAccelBonus" && typeof encPass.val === "number" ? encPass.val : 0;
  const accel = Math.max(fromParty, fromEnc);
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  if (accel > 0 && roll < accel) return 2;
  return 1;
}

const NEUTRAL_NATURES = new Set(["hardy", "docile", "bashful", "quirky"]);
const WILD_CATCH_EASY = new Set(["gentle", "calm", "careful", "timid", "modest", "relaxed", "mild", "quiet"]);
const WILD_CATCH_HARD = new Set(["adamant", "brave", "bold", "lonely", "naughty", "rash", "hasty", "jolly", "naive"]);

/** Non-neutral wild encounter nature: ±5% capture rate modifier. */
export function natureWildCatchMul(encounterNature) {
  if (!encounterNature || NEUTRAL_NATURES.has(encounterNature)) return 1;
  if (WILD_CATCH_EASY.has(encounterNature)) return 1.05;
  if (WILD_CATCH_HARD.has(encounterNature)) return 0.95;
  return 1;
}

/** Multiply expedition duration by nature passives on selected team. */
export function expeditionNatureTimeMul(selectedMons) {
  const list = Array.isArray(selectedMons) ? selectedMons : [];
  let mul = 1;
  for (const m of list) {
    const pass = NATURE_PASSIVE[m?.nature];
    if (pass?.key === "expeditionTimeBonus" && typeof pass.val === "number") {
      mul *= Math.max(0.5, 1 - pass.val);
    }
  }
  return mul;
}

/** Timid: chance to refund the ball just spent. */
export function tryBallSave(state, randFloat) {
  const chance = partyBestPassive(state, "ballSaveChance");
  if (chance <= 0) return false;
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  return roll < chance;
}

/** Hasty: shorter encounter recharge (best in party). */
export function natureEncounterRechargeMul(state) {
  const bonus = partyBestPassive(state, "encounterRechargeBonus");
  return Math.max(0.5, 1 - Math.max(0, bonus));
}

/** Naughty party: flee always succeeds. */
export function partyHasAlwaysEscape(state) {
  return partyBestPassive(state, "alwaysEscape") >= 1;
}

/** Adamant / Lonely train exp multipliers for one mon. */
export function natureTrainExpMul(mon, trainingCount) {
  let mul = 1;
  const pass = NATURE_PASSIVE[mon?.nature];
  if (!pass || typeof pass.val !== "number") return 1;
  if (pass.key === "trainExpBonus") mul *= 1 + pass.val;
  if (pass.key === "soloTrainExpBonus" && trainingCount === 1) mul *= 1 + pass.val;
  return mul;
}

/** Serious: research ticks faster. */
export function natureResearchDtMul(state) {
  return 1 + Math.max(0, partyBestPassive(state, "researchSpeedBonus"));
}

/** Jolly: affection gain mul for this mon. */
export function natureAffectionMul(mon) {
  const pass = NATURE_PASSIVE[mon?.nature];
  if (pass?.key === "affectionBonus" && typeof pass.val === "number") return 1 + pass.val;
  return 1;
}

/** Relaxed / gentle satiety helpers. */
export function natureSatietyRegenMul(mon) {
  const pass = NATURE_PASSIVE[mon?.nature];
  if (pass?.key === "satietyRegenBonus" && typeof pass.val === "number") return 1 + pass.val;
  return 1;
}

export function natureSatietyDecayMul(mon) {
  const pass = NATURE_PASSIVE[mon?.nature];
  if (pass?.key === "satietyDecayReduce" && typeof pass.val === "number") {
    return Math.max(0.5, 1 - pass.val);
  }
  return 1;
}

function ensureFun(state) {
  if (!state.fun || typeof state.fun !== "object") state.fun = {};
  return state.fun;
}

/** Successful catch → streak++; returns { streak, reward }. */
export function bumpCatchStreak(state) {
  const fun = ensureFun(state);
  const streak = Math.max(0, Math.floor(fun.catchStreak || 0)) + 1;
  fun.catchStreak = streak;
  fun.catchStreakBest = Math.max(streak, Math.floor(fun.catchStreakBest || 0));
  return { streak, reward: catchStreakReward(streak) };
}

export function resetCatchStreak(state) {
  const fun = ensureFun(state);
  fun.catchStreak = 0;
}

/** Ensure this ISO week's lucky type (Mon-based week key). */
export function ensureLuckyWeek(state) {
  if (!state || typeof state !== "object") return null;
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const weekKey = `${monday.getFullYear()}-W${String(monday.getMonth() + 1).padStart(2, "0")}${String(monday.getDate()).padStart(2, "0")}`;
  if (state.luckyWeek && state.luckyWeek.week === weekKey && TYPE_POOL.includes(state.luckyWeek.type)) {
    return state.luckyWeek;
  }
  let h = 1;
  for (let i = 0; i < weekKey.length; i++) h = (h * 33 + weekKey.charCodeAt(i)) >>> 0;
  // offset from daily seed so week ≠ day type usually
  const type = TYPE_POOL[(h + 7) % TYPE_POOL.length];
  state.luckyWeek = { week: weekKey, type };
  return state.luckyWeek;
}

/** Encounter weight mul for weekly theme type (+35%). */
export function luckyWeekEncounterMul(state, monTypes) {
  const week = ensureLuckyWeek(state);
  if (!week?.type) return 1;
  const types = Array.isArray(monTypes) ? monTypes : [];
  return types.map((t) => String(t || "").toLowerCase()).includes(week.type) ? 1.35 : 1;
}

/** Mild: shorter breeding egg time. */
export function natureBreedTimeMul(state) {
  const bonus = partyBestPassive(state, "breedSpeedBonus");
  return Math.max(0.5, 1 - Math.max(0, bonus));
}

/** Calm: global resource production mul. */
export function natureResProdMul(state) {
  return 1 + Math.max(0, partyBestPassive(state, "resProdBonus"));
}

/** Lax: resource cap mul. */
export function natureResCapMul(state) {
  return 1 + Math.max(0, partyBestPassive(state, "resCapBonus"));
}

/** Modest: amplify dex production bonus. */
export function natureDexBonusMul(state) {
  return 1 + Math.max(0, partyBestPassive(state, "dexBonusExtra"));
}

/** Bold: incoming PvE damage mul (&lt;1). */
export function natureIncomingDamageMul(state) {
  const reduce = partyBestPassive(state, "defDamageReduce");
  return Math.max(0.5, 1 - Math.max(0, reduce));
}

/** Naive: advanced-encounter missing-dex preference chance (base 0.75). */
export function natureAdvMissingPreferChance(state, base = 0.75) {
  const bonus = partyBestPassive(state, "advEncMissingBonus");
  return Math.min(0.95, Math.max(0, base) + Math.max(0, bonus));
}

/** Milestone berry gifts — cheap dopamine without new systems. */
export function catchStreakReward(streak) {
  const n = Math.max(0, Math.floor(streak));
  if (n === 5) return { berry: 5, label: "连捕 ×5" };
  if (n === 10) return { berry: 15, label: "连捕 ×10" };
  if (n === 25) return { berry: 50, label: "连捕 ×25" };
  if (n > 0 && n % 50 === 0) return { berry: 100, label: `连捕 ×${n}` };
  return null;
}

/** PvE win streak — returns { streak, best, milestone }. */
export function bumpPveWinStreak(state) {
  const fun = ensureFun(state);
  const streak = Math.max(0, Math.floor(fun.pveWinStreak || 0)) + 1;
  fun.pveWinStreak = streak;
  fun.pveWinStreakBest = Math.max(streak, Math.floor(fun.pveWinStreakBest || 0));
  let milestone = null;
  if (streak === 3) milestone = "挑战连胜 ×3";
  else if (streak === 5) milestone = "挑战连胜 ×5";
  else if (streak === 10) milestone = "挑战连胜 ×10";
  else if (streak > 0 && streak % 20 === 0) milestone = `挑战连胜 ×${streak}`;
  return { streak, best: fun.pveWinStreakBest, milestone };
}

export function resetPveWinStreak(state) {
  const fun = ensureFun(state);
  fun.pveWinStreak = 0;
}

/** One-line offline return summary for the log sidebar. */
export function noteCatchNearMiss(ui, speciesId, chance) {
  if (!ui || typeof ui !== "object") return;
  const c = typeof chance === "number" && Number.isFinite(chance) ? chance : 0;
  if (c >= 0.35 && speciesId) {
    ui.lastCatchNearMiss = { pct: Math.round(c * 100), pid: speciesId };
  } else {
    ui.lastCatchNearMiss = null;
  }
}

export function clearCatchNearMiss(ui) {
  if (ui && typeof ui === "object") ui.lastCatchNearMiss = null;
}

export function formatWelcomeBackSummary(state, before = {}, dtSec = 0) {
  if (!state || typeof state !== "object") return "";
  ensureLuckyDay(state);
  ensureLuckyWeek(state);
  const parts = [];
  const hours = Math.max(0, Math.floor((typeof dtSec === "number" ? dtSec : 0) / 3600));
  if (hours >= 1) parts.push(`离线 ${hours}h`);
  if (state.luckyDay?.type) parts.push(`今日幸运 ${typeZh(state.luckyDay.type)}`);
  if (state.luckyWeek?.type) parts.push(`本周 ${typeZh(state.luckyWeek.type)}`);
  const catchBest = Math.max(0, Math.floor(state.fun?.catchStreakBest || 0));
  if (catchBest >= 3) parts.push(`连捕纪录 ${catchBest}`);
  const pveBest = Math.max(0, Math.floor(state.fun?.pveWinStreakBest || 0));
  if (pveBest >= 2) parts.push(`PvE 连胜纪录 ${pveBest}`);
  const eraId = state.era?.id;
  if (eraId && eraId !== before.eraId) parts.push(`时代 → ${eraId}`);
  else if (eraId) parts.push(`时代 ${eraId}`);
  const catchDelta = Math.max(0, Math.floor((state.catchCount || 0) - (before.catchCount || 0)));
  if (catchDelta > 0) parts.push(`捕捉 +${catchDelta}`);
  const pveCleared = Object.keys(state.pve?.progress || {}).filter((k) => !k.includes("_")).length;
  const pveBefore = typeof before.pveCleared === "number" ? before.pveCleared : pveCleared;
  const pveDelta = pveCleared - pveBefore;
  if (pveDelta > 0) parts.push(`新通关 ${pveDelta} 关`);
  const expNow = Math.max(0, Math.floor(state.meta?.expeditionsCompleted || 0));
  const expBefore = Math.max(0, Math.floor(before.expeditionsCompleted || 0));
  if (expNow > expBefore) parts.push(`远征完成 +${expNow - expBefore}`);
  const trainNow = Math.max(0, Math.floor(state.meta?.trainingExpGained || 0));
  const trainBefore = Math.max(0, Math.floor(before.trainingExpGained || 0));
  const trainDelta = trainNow - trainBefore;
  if (trainDelta > 0) parts.push(`训练经验 +${trainDelta}`);
  const pvpLine = formatPvpSeasonStats(state.meta?.pvpStats);
  if (pvpLine) parts.push(pvpLine);
  return parts.join(" · ");
}
