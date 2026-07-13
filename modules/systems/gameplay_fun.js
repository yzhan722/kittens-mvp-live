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

/** Catch streak UI badges at 3/5/10 while streak is active. */
export function catchStreakMilestoneBadges(streak) {
  const n = Math.max(0, Math.floor(typeof streak === "number" ? streak : 0));
  const out = [];
  if (n >= 3) out.push("连捕×3");
  if (n >= 5) out.push("连捕×5");
  if (n >= 10) out.push("连捕×10");
  return out;
}

/** Gather click milestones 100/500/1000 — next target for camp strip. */
export function gatherNextMilestone(clicks) {
  const n = Math.max(0, Math.floor(typeof clicks === "number" && Number.isFinite(clicks) ? clicks : 0));
  for (const m of [100, 500, 1000]) {
    if (n < m) return { next: m, left: m - n, done: false };
  }
  return { next: null, left: 0, done: true };
}

export function localDateStr(d = new Date()) {
  const x = d instanceof Date ? d : new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Daily free futurecoin — once per local calendar day. */
export function canClaimDailyFreeFc(meta, today = localDateStr()) {
  const last = meta && typeof meta.dailyFreeFcDate === "string" ? meta.dailyFreeFcDate : "";
  return last !== today;
}

export function markDailyFreeFcClaimed(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return null;
  meta.dailyFreeFcDate = today;
  return today;
}

/** Today's soft goals checklist (local meta). */
export function ensureDailyGoals(state) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const today = localDateStr();
  const g = state.meta.dailyGoals;
  if (!g || typeof g !== "object" || g.date !== today) {
    state.meta.dailyGoals = {
      date: today,
      catchTarget: 3,
      trainDone: false,
      pveDone: false,
    };
  }
  return state.meta.dailyGoals;
}

export function dailyGoalsChecklist(state) {
  const g = ensureDailyGoals(state);
  const catchNow = Math.max(0, Math.floor(state.catchCount || 0));
  const catchBase = typeof g.catchBase === "number" ? g.catchBase : catchNow;
  if (typeof g.catchBase !== "number") g.catchBase = catchNow;
  const catchDelta = Math.max(0, catchNow - catchBase);
  const catchOk = catchDelta >= Math.max(1, Math.floor(g.catchTarget || 3));
  const trainOk = Boolean(g.trainDone) || Math.max(0, Math.floor(state.meta?.trainingExpGained || 0)) > Math.max(0, Math.floor(g.trainBase || 0));
  if (typeof g.trainBase !== "number") g.trainBase = Math.max(0, Math.floor(state.meta?.trainingExpGained || 0));
  const pveOk = Boolean(g.pveDone);
  return [
    { id: "catch", label: `捕捉 ${Math.min(catchDelta, g.catchTarget || 3)}/${g.catchTarget || 3}`, done: catchOk },
    { id: "train", label: "训练一次", done: trainOk },
    { id: "pve", label: "挑战一次", done: pveOk },
  ];
}

/** One-line live next goal for help coach. */
export function liveNextGoalLine(state, { dexPct = 0, eraQuest = "", pveNext = "" } = {}) {
  if (eraQuest) return `下一目标：时代任务 — ${eraQuest}`;
  if (pveNext) return `下一目标：挑战 — ${pveNext}`;
  if (typeof dexPct === "number" && dexPct < 100) return `下一目标：图鉴完成度 ${Math.max(0, Math.floor(dexPct))}%`;
  return "下一目标：继续采集、捕捉与远征循环。";
}

/** Daily free spin table — weighted; once per local day. */
export const DAILY_SPIN_REWARDS = Object.freeze([
  { id: "fc5", w: 40, futurecoin: 5, label: "小额未来币 +5" },
  { id: "fc15", w: 28, futurecoin: 15, label: "中额未来币 +15" },
  { id: "fc30", w: 15, futurecoin: 30, label: "大额未来币 +30" },
  { id: "berry", w: 12, bigBerry: 1, label: "大树果 ×1" },
  { id: "fc80", w: 5, futurecoin: 80, label: "幸运大奖 +80" },
]);

export function canClaimDailySpin(meta, today = localDateStr()) {
  const last = meta && typeof meta.dailySpinDate === "string" ? meta.dailySpinDate : "";
  return last !== today;
}

export function rollDailySpin(randFloat = Math.random) {
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  const total = DAILY_SPIN_REWARDS.reduce((s, r) => s + r.w, 0);
  let x = roll * total;
  for (const r of DAILY_SPIN_REWARDS) {
    x -= r.w;
    if (x <= 0) return { ...r };
  }
  return { ...DAILY_SPIN_REWARDS[0] };
}

export function markDailySpinClaimed(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return null;
  meta.dailySpinDate = today;
  return today;
}

/** Capture session goal — catch N this session for a one-shot FC toast. */
export function ensureCaptureSessionGoal(state) {
  if (!state.fun || typeof state.fun !== "object") state.fun = {};
  if (typeof state.fun.sessionCatchGoal !== "number") state.fun.sessionCatchGoal = 5;
  if (typeof state.fun.sessionCatchBase !== "number") {
    state.fun.sessionCatchBase = Math.max(0, Math.floor(state.catchCount || 0));
  }
  if (typeof state.fun.sessionCatchClaimed !== "boolean") state.fun.sessionCatchClaimed = false;
  return state.fun;
}

export function captureSessionProgress(state) {
  const fun = ensureCaptureSessionGoal(state);
  const now = Math.max(0, Math.floor(state.catchCount || 0));
  const delta = Math.max(0, now - Math.max(0, Math.floor(fun.sessionCatchBase || 0)));
  const goal = Math.max(1, Math.floor(fun.sessionCatchGoal || 5));
  return {
    delta,
    goal,
    done: delta >= goal,
    claimed: Boolean(fun.sessionCatchClaimed),
    canClaim: delta >= goal && !fun.sessionCatchClaimed,
  };
}

/** Help-tab live checklist: reuse daily goals + optional era/pve/dex hints as 3 rows. */
export function liveGoalsChecklist(state, { dexPct = 0, eraQuest = "", pveNext = "" } = {}) {
  const daily = dailyGoalsChecklist(state);
  const extras = [];
  if (eraQuest) extras.push({ id: "era", label: `时代：${eraQuest}`, done: false });
  else if (pveNext) extras.push({ id: "pveNext", label: `挑战：${pveNext}`, done: false });
  else if (typeof dexPct === "number" && dexPct < 100) {
    extras.push({ id: "dex", label: `图鉴 ${Math.max(0, Math.floor(dexPct))}%`, done: false });
  }
  // Prefer daily three; if we have an extra unfinished coach goal, swap the last done daily.
  const out = daily.slice(0, 3);
  if (extras.length && out.every((g) => g.done)) {
    out[2] = extras[0];
  } else if (extras.length && out.length >= 3 && out[2].done) {
    out[2] = extras[0];
  }
  return out.slice(0, 3);
}

/** Gather click combo — within windowMs of last click. */
export function bumpGatherCombo(fun, nowMs, windowMs = 1200) {
  if (!fun || typeof fun !== "object") return { combo: 0, bonus: false };
  const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
  const win = typeof windowMs === "number" && Number.isFinite(windowMs) ? Math.max(0, windowMs) : 1200;
  const last = typeof fun.gatherComboAt === "number" && Number.isFinite(fun.gatherComboAt) ? fun.gatherComboAt : 0;
  let combo = Math.max(0, Math.floor(fun.gatherCombo || 0));
  if (last > 0 && now - last <= win) combo += 1;
  else combo = 1;
  fun.gatherCombo = combo;
  fun.gatherComboAt = now;
  const bonus = combo > 0 && combo % 10 === 0;
  return { combo, bonus };
}

/** Research progress theater — pct done + "即将完成" when >80%. */
export function researchProgressTheater(remainingSec, totalSec) {
  const rem = typeof remainingSec === "number" && Number.isFinite(remainingSec) ? Math.max(0, remainingSec) : 0;
  const tot = typeof totalSec === "number" && Number.isFinite(totalSec) && totalSec > 0 ? totalSec : 0;
  if (tot <= 0) return { pct: 0, label: "研究中", nearDone: false };
  const pct = Math.max(0, Math.min(100, Math.round(((tot - rem) / tot) * 100)));
  const nearDone = pct > 80;
  return { pct, label: nearDone ? `即将完成 ${pct}%` : `研究中 ${pct}%`, nearDone };
}

/** Region clear claim: +10 FC once per areaId. */
export function canClaimDexRegion(meta, areaId) {
  if (!areaId || areaId === "all") return false;
  const claimed = meta && typeof meta === "object" && meta.dexRegionClaimed && typeof meta.dexRegionClaimed === "object"
    ? meta.dexRegionClaimed
    : null;
  return !(claimed && claimed[areaId]);
}

export function markDexRegionClaimed(meta, areaId) {
  if (!meta || typeof meta !== "object" || !areaId || areaId === "all") return false;
  if (!meta.dexRegionClaimed || typeof meta.dexRegionClaimed !== "object") meta.dexRegionClaimed = {};
  if (meta.dexRegionClaimed[areaId]) return false;
  meta.dexRegionClaimed[areaId] = true;
  return true;
}

/** PvE formal first-win of local day → +50% reward mul once. */
export function pveDailyFirstWinMul(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return { mul: 1, isFirst: false };
  const last = typeof meta.pveDailyFirstWinDate === "string" ? meta.pveDailyFirstWinDate : "";
  if (last === today) return { mul: 1, isFirst: false };
  meta.pveDailyFirstWinDate = today;
  return { mul: 1.5, isFirst: true };
}

/** Shop daily deal: pay 3 FC → +10 FC once/day (honest 50%-off teaser pack). */
export function canBuyShopDailyDeal(meta, today = localDateStr()) {
  const last = meta && typeof meta === "object" && typeof meta.shopDailyDealDate === "string" ? meta.shopDailyDealDate : "";
  return last !== today;
}

export function markShopDailyDealBought(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return false;
  if (!canBuyShopDailyDeal(meta, today)) return false;
  meta.shopDailyDealDate = today;
  return true;
}

export const SHOP_DAILY_DEAL = { costFc: 3, gainFc: 10 };

/** Season score = dex*10 + pveWins; progress vs ghost rivals. */
export function seasonLocalScore(dexUnique, pveWins) {
  return Math.max(0, Math.floor(dexUnique || 0)) * 10 + Math.max(0, Math.floor(pveWins || 0));
}

export const SEASON_GHOST_RIVALS = [
  { name: "短裤小子", score: 80 },
  { name: "迷你裙", score: 220 },
  { name: "精英阿哲", score: 900 },
  { name: "道馆影子", score: 1800 },
];

/** Returns progress line vs next/top ghost. */
export function seasonBarVsGhosts(myScore, ghosts = SEASON_GHOST_RIVALS) {
  const score = Math.max(0, Math.floor(myScore || 0));
  const list = Array.isArray(ghosts) ? ghosts.slice().sort((a, b) => a.score - b.score) : [];
  const top = list.length ? list[list.length - 1] : { name: "顶端", score: score };
  const next = list.find((g) => g.score > score) || null;
  const beaten = list.filter((g) => score >= g.score).length;
  let needDex = 0;
  let targetName = top.name;
  if (next) {
    needDex = Math.max(1, Math.ceil((next.score - score) / 10));
    targetName = next.name;
  }
  const topPct = top.score > 0 ? Math.min(100, Math.round((score / top.score) * 100)) : 100;
  const tip = next
    ? `再登记 ${needDex} 种超过 ${targetName}`
    : `已超过全部 ${list.length} 位幽灵训练家`;
  return { score, topScore: top.score, topPct, beaten, total: list.length, needDex, tip, nextName: next?.name || null };
}

/** Session day counters for options highlights. */
export function ensureSessionDay(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const s = state.meta.sessionDay;
  if (!s || typeof s !== "object" || s.date !== today) {
    state.meta.sessionDay = { date: today, catches: 0, pveWins: 0, expeditions: 0 };
  }
  return state.meta.sessionDay;
}

export function bumpSessionCatch(state) {
  const s = ensureSessionDay(state);
  if (!s) return 0;
  s.catches = Math.max(0, Math.floor(s.catches || 0)) + 1;
  return s.catches;
}

export function bumpSessionPveWin(state) {
  const s = ensureSessionDay(state);
  if (!s) return 0;
  s.pveWins = Math.max(0, Math.floor(s.pveWins || 0)) + 1;
  return s.pveWins;
}

export function bumpSessionExpedition(state) {
  const s = ensureSessionDay(state);
  if (!s) return 0;
  s.expeditions = Math.max(0, Math.floor(s.expeditions || 0)) + 1;
  return s.expeditions;
}

export function sessionHighlightsLine(state) {
  const s = ensureSessionDay(state);
  if (!s) return "";
  return `今日：捕捉 ${Math.floor(s.catches || 0)} · 挑战胜 ${Math.floor(s.pveWins || 0)} · 远征 ${Math.floor(s.expeditions || 0)}`;
}

/** Find first hungry mon (satiety < thr); for 一键补饱. */
export function findHungryMon(list, thr = 30) {
  const arr = Array.isArray(list) ? list : [];
  const t = typeof thr === "number" && Number.isFinite(thr) ? thr : 30;
  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const sat = typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100;
    if (sat < t) return m;
  }
  return null;
}

export function feedOneHungryWithBerry(state, thr = 30) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const have = Math.max(0, Math.floor(state.res?.bigBerry?.value ?? 0));
  if (have < 1) return { ok: false, reason: "no_berry" };
  const mon = findHungryMon(state.mons?.list, thr);
  if (!mon) return { ok: false, reason: "none_hungry" };
  state.res.bigBerry.value = have - 1;
  const sat0 = typeof mon.satiety === "number" && Number.isFinite(mon.satiety) ? mon.satiety : 0;
  mon.satiety = Math.max(0, Math.min(100, sat0 + 50));
  bumpItemsCare(state);
  return { ok: true, mon, satiety: mon.satiety };
}

const ITEMS_CARE_GOAL = 3;

/** Items tab daily care — N uses/feeds → claim FC. */
export function bumpItemsCare(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return 0;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const m = state.meta;
  if (m.itemsCareDate !== today) {
    m.itemsCareDate = today;
    m.itemsCareUses = 0;
    m.itemsCareClaimed = false;
  }
  m.itemsCareUses = Math.max(0, Math.floor(m.itemsCareUses || 0)) + 1;
  return m.itemsCareUses;
}

export function itemsCareProgress(state, today = localDateStr()) {
  if (!state?.meta || typeof state.meta !== "object") {
    return { uses: 0, goal: ITEMS_CARE_GOAL, canClaim: false, claimed: false };
  }
  const m = state.meta;
  if (m.itemsCareDate !== today) {
    return { uses: 0, goal: ITEMS_CARE_GOAL, canClaim: false, claimed: false };
  }
  const uses = Math.max(0, Math.floor(m.itemsCareUses || 0));
  const claimed = Boolean(m.itemsCareClaimed);
  return {
    uses,
    goal: ITEMS_CARE_GOAL,
    claimed,
    canClaim: uses >= ITEMS_CARE_GOAL && !claimed,
  };
}

export function markItemsCareClaimed(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return false;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const prog = itemsCareProgress(state, today);
  if (!prog.canClaim) return false;
  state.meta.itemsCareClaimed = true;
  state.meta.itemsCareDate = today;
  return true;
}

/** Claim +FC when all 3 daily goals done (once/day). */
export function canClaimDailyGoalsBundle(state, today = localDateStr()) {
  const list = dailyGoalsChecklist(state);
  if (!list.every((g) => g.done)) return false;
  const last = state?.meta && typeof state.meta.dailyGoalsClaimDate === "string" ? state.meta.dailyGoalsClaimDate : "";
  return last !== today;
}

export function markDailyGoalsBundleClaimed(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return false;
  if (!canClaimDailyGoalsBundle(state, today)) return false;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  state.meta.dailyGoalsClaimDate = today;
  return true;
}

/** Leaderboard: once/day claim if beaten ≥1 season ghost. */
export function canClaimLbRivalReward(meta, beaten, today = localDateStr()) {
  const n = Math.max(0, Math.floor(beaten || 0));
  if (n < 1) return false;
  const last = meta && typeof meta.lbRivalClaimDate === "string" ? meta.lbRivalClaimDate : "";
  return last !== today;
}

export function markLbRivalRewardClaimed(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return false;
  meta.lbRivalClaimDate = today;
  return true;
}

/** Consecutive local-day login streak (call once per render/session open). */
export function bumpLoginStreak(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return 0;
  const last = typeof meta.loginStreakDate === "string" ? meta.loginStreakDate : "";
  if (last === today) return Math.max(1, Math.floor(meta.loginStreak || 1));
  const y = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return localDateStr(d);
  })();
  const prev = Math.max(0, Math.floor(meta.loginStreak || 0));
  meta.loginStreak = last === y ? prev + 1 : 1;
  meta.loginStreakDate = today;
  return meta.loginStreak;
}

export function loginStreakLine(meta) {
  const n = Math.max(0, Math.floor(meta?.loginStreak || 0));
  if (n <= 0) return "";
  return `连续登录 ${n} 天`;
}

const GATHER_DAILY_GOAL = 40;

/** Bonfire daily gather quest. */
export function bumpGatherDaily(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return 0;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const m = state.meta;
  if (m.gatherDailyDate !== today) {
    m.gatherDailyDate = today;
    m.gatherDailyCount = 0;
    m.gatherDailyClaimed = false;
  }
  m.gatherDailyCount = Math.max(0, Math.floor(m.gatherDailyCount || 0)) + 1;
  return m.gatherDailyCount;
}

export function gatherDailyProgress(state, today = localDateStr()) {
  if (!state?.meta || typeof state.meta !== "object") {
    return { count: 0, goal: GATHER_DAILY_GOAL, canClaim: false, claimed: false };
  }
  const m = state.meta;
  if (m.gatherDailyDate !== today) {
    return { count: 0, goal: GATHER_DAILY_GOAL, canClaim: false, claimed: false };
  }
  const count = Math.max(0, Math.floor(m.gatherDailyCount || 0));
  const claimed = Boolean(m.gatherDailyClaimed);
  return {
    count,
    goal: GATHER_DAILY_GOAL,
    claimed,
    canClaim: count >= GATHER_DAILY_GOAL && !claimed,
  };
}

export function markGatherDailyClaimed(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return false;
  if (!gatherDailyProgress(state, today).canClaim) return false;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  state.meta.gatherDailyClaimed = true;
  state.meta.gatherDailyDate = today;
  return true;
}

/** Shop: free + deal + spin all done → bonus claim. */
export function shopDailyTripleProgress(meta, today = localDateStr()) {
  const m = meta && typeof meta === "object" ? meta : {};
  const free = m.dailyFreeFcDate === today;
  const deal = m.shopDailyDealDate === today;
  const spin = m.dailySpinDate === today;
  const n = (free ? 1 : 0) + (deal ? 1 : 0) + (spin ? 1 : 0);
  const claimed = m.shopTripleClaimDate === today;
  return { n, goal: 3, free, deal, spin, claimed, canClaim: n >= 3 && !claimed };
}

export function markShopDailyTripleClaimed(meta, today = localDateStr()) {
  if (!meta || typeof meta !== "object") return false;
  if (!shopDailyTripleProgress(meta, today).canClaim) return false;
  meta.shopTripleClaimDate = today;
  return true;
}

/** Functions: complete ≥1 expedition today → claim. */
export function noteExpeditionDailyDone(state, today = localDateStr()) {
  if (!state || typeof state !== "object") return;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (state.meta.expeditionDailyDate !== today) {
    state.meta.expeditionDailyDate = today;
    state.meta.expeditionDailyDone = false;
    state.meta.expeditionDailyClaimed = false;
  }
  state.meta.expeditionDailyDone = true;
}

export function expeditionDailyProgress(state, today = localDateStr()) {
  if (!state?.meta || typeof state.meta !== "object") {
    return { done: false, claimed: false, canClaim: false };
  }
  const m = state.meta;
  if (m.expeditionDailyDate !== today) {
    return { done: false, claimed: false, canClaim: false };
  }
  const done = Boolean(m.expeditionDailyDone);
  const claimed = Boolean(m.expeditionDailyClaimed);
  return { done, claimed, canClaim: done && !claimed };
}

export function markExpeditionDailyClaimed(state, today = localDateStr()) {
  if (!expeditionDailyProgress(state, today).canClaim) return false;
  state.meta.expeditionDailyClaimed = true;
  return true;
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
