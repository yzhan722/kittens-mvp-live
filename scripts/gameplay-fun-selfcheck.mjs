import assert from "node:assert/strict";
import {
  bumpCatchStreak,
  bumpGatherCombo,
  bumpPveWinStreak,
  bumpSessionCatch,
  bumpSessionExpedition,
  bumpSessionPveWin,
  catchStreakMilestoneBadges,
  catchStreakReward,
  canBuyShopDailyDeal,
  canClaimDailyFreeFc,
  canClaimDexRegion,
  dailyGoalsChecklist,
  ensureLuckyDay,
  ensureLuckyWeek,
  ensureSessionDay,
  expeditionNatureTimeMul,
  feedOneHungryWithBerry,
  findHungryMon,
  formatWelcomeBackSummary,
  gatherNextMilestone,
  liveGoalsChecklist,
  liveNextGoalLine,
  localDateStr,
  luckyCatchMul,
  luckyWeekEncounterMul,
  markDailyFreeFcClaimed,
  markDexRegionClaimed,
  markShopDailyDealBought,
  natureAdvMissingPreferChance,
  natureBreedTimeMul,
  natureDexBonusMul,
  natureEncounterRechargeMul,
  natureIncomingDamageMul,
  natureResearchDtMul,
  natureResCapMul,
  natureResProdMul,
  natureTrainExpMul,
  natureWildCatchMul,
  noteCatchNearMiss,
  partyBestPassive,
  partyHasAlwaysEscape,
  pityFailStep,
  pveDailyFirstWinMul,
  researchProgressTheater,
  resetCatchStreak,
  resetPveWinStreak,
  seasonBarVsGhosts,
  seasonLocalScore,
  sessionHighlightsLine,
  SHOP_DAILY_DEAL,
  tryBallSave,
  canClaimDailySpin,
  rollDailySpin,
  markDailySpinClaimed,
  ensureCaptureSessionGoal,
  captureSessionProgress,
  bumpItemsCare,
  itemsCareProgress,
  markItemsCareClaimed,
  canClaimDailyGoalsBundle,
  markDailyGoalsBundleClaimed,
  canClaimLbRivalReward,
  markLbRivalRewardClaimed,
  bumpLoginStreak,
  bumpGatherDaily,
  gatherDailyProgress,
  markGatherDailyClaimed,
  shopDailyTripleProgress,
  markShopDailyTripleClaimed,
  noteExpeditionDailyDone,
  expeditionDailyProgress,
  markExpeditionDailyClaimed,
} from "../modules/systems/gameplay_fun.js";
import {
  applyQuickExpeditionDuration,
  applyQuickExpeditionReward,
  BREED_EVENT_CARDS,
  pickBreedEventCard,
  tickExpeditionMilestones,
} from "../modules/systems/expedition.js";
import {
  claimNpcWeeklyFc,
  ensureNpcRecord,
  noteNpcWeeklyWin,
  npcRecordLine,
  npcWeeklyProgress,
  recordNpcFight,
} from "../modules/systems/npc_pvp.js";
import { ensureTowerState, getTowerFloor, isTowerCleared, PVE_TOWER_FLOORS, isoWeekKey } from "../modules/systems/pve_tower.js";

{
  const state = {};
  const a = ensureLuckyDay(state);
  const b = ensureLuckyDay(state);
  assert.equal(a.type, b.type, "lucky day stable within day");
  assert.ok(a.date && a.type, "lucky day has date+type");
}

{
  const state = { luckyDay: { date: "2099-01-01", type: "fire" } };
  // force refresh by wrong date — ensureLuckyDay replaces with today
  const day = ensureLuckyDay(state);
  assert.notEqual(day.date, "2099-01-01", "stale lucky day refreshes");
}

{
  const state = { luckyDay: ensureLuckyDay({}).date ? ensureLuckyDay({}) : null };
  const fresh = {};
  const day = ensureLuckyDay(fresh);
  assert.equal(luckyCatchMul(fresh, [day.type]), 1.1, "lucky type mul");
  assert.equal(luckyCatchMul(fresh, ["normal"]), day.type === "normal" ? 1.1 : 1, "non-match mul");
}

{
  const state = { mons: { list: [{ nature: "hardy" }, { nature: "adamant" }] } };
  assert.equal(partyBestPassive(state, "pityAccelBonus"), 0.2, "hardy pity");
  let got2 = false;
  for (let i = 0; i < 80; i++) {
    if (pityFailStep(state, () => 0.05) === 2) got2 = true;
  }
  assert.equal(got2, true, "pity accel can double");
  assert.equal(pityFailStep({ mons: { list: [] } }, () => 0), 1, "no party pity = 1");
}

{
  const state = { mons: { list: [{ nature: "timid" }] } };
  assert.equal(tryBallSave(state, () => 0.05), true, "timid ball save hit");
  assert.equal(tryBallSave(state, () => 0.99), false, "timid ball save miss");
}

{
  const state = { mons: { list: [{ nature: "hasty" }] } };
  assert.ok(Math.abs(natureEncounterRechargeMul(state) - 0.9) < 1e-9, "hasty recharge");
  assert.equal(natureEncounterRechargeMul({ mons: { list: [] } }), 1, "no hasty");
}

{
  assert.equal(partyHasAlwaysEscape({ mons: { list: [{ nature: "naughty" }] } }), true, "naughty escape");
  assert.equal(partyHasAlwaysEscape({ mons: { list: [{ nature: "jolly" }] } }), false, "no naughty");
}

{
  assert.ok(Math.abs(natureTrainExpMul({ nature: "adamant" }, 2) - 1.05) < 1e-9, "adamant train");
  assert.ok(Math.abs(natureTrainExpMul({ nature: "lonely" }, 1) - 1.08) < 1e-9, "lonely solo");
  assert.equal(natureTrainExpMul({ nature: "lonely" }, 2), 1, "lonely not solo");
}

{
  const state = { mons: { list: [{ nature: "serious" }] } };
  assert.ok(Math.abs(natureResearchDtMul(state) - 1.03) < 1e-9, "serious research");
}

{
  const mul = expeditionNatureTimeMul([{ nature: "impish" }, { nature: "impish" }]);
  assert.ok(mul < 1 && mul > 0.5, "impish stacks time cut");
}

{
  const state = {};
  let last = null;
  for (let i = 0; i < 5; i++) last = bumpCatchStreak(state);
  assert.equal(last.streak, 5, "streak 5");
  assert.deepEqual(catchStreakReward(5), { berry: 5, label: "连捕 ×5" });
  assert.equal(last.reward.berry, 5, "reward at 5");
  resetCatchStreak(state);
  assert.equal(state.fun.catchStreak, 0, "reset streak");
  assert.ok(state.fun.catchStreakBest >= 5, "best kept");
}

{
  assert.equal(natureAdvMissingPreferChance({ mons: { list: [{ nature: "naive" }] } }, 0.75), 0.85, "naive prefer");
  assert.ok(Math.abs(natureIncomingDamageMul({ mons: { list: [{ nature: "bold" }] } }) - 0.95) < 1e-9, "bold incoming");
  assert.ok(Math.abs(natureResProdMul({ mons: { list: [{ nature: "calm" }] } }) - 1.03) < 1e-9, "calm prod");
  assert.ok(Math.abs(natureResCapMul({ mons: { list: [{ nature: "lax" }] } }) - 1.02) < 1e-9, "lax cap");
  assert.ok(Math.abs(natureDexBonusMul({ mons: { list: [{ nature: "modest" }] } }) - 1.02) < 1e-9, "modest dex");
  assert.ok(Math.abs(natureBreedTimeMul({ mons: { list: [{ nature: "mild" }] } }) - 0.95) < 1e-9, "mild breed");
}

{
  const state = {};
  const w = ensureLuckyWeek(state);
  assert.ok(w?.week && w?.type, "lucky week");
  assert.equal(ensureLuckyWeek(state).type, w.type, "lucky week stable");
  assert.equal(luckyWeekEncounterMul(state, [w.type]), 1.35, "week type weight");
  assert.equal(luckyWeekEncounterMul(state, ["zzz"]), 1, "week miss");
}

{
  assert.equal(pityFailStep({ mons: { list: [] } }, () => 0, "hardy"), 2, "wild hardy pity accel");
  assert.equal(pityFailStep({ mons: { list: [] } }, () => 0.99, "hardy"), 1, "wild hardy pity miss");
}

{
  const state = {};
  const a = bumpPveWinStreak(state);
  assert.equal(a.streak, 1, "pve streak 1");
  bumpPveWinStreak(state);
  const b = bumpPveWinStreak(state);
  assert.equal(b.streak, 3, "pve streak 3");
  assert.equal(b.milestone, "挑战连胜 ×3", "pve milestone");
  resetPveWinStreak(state);
  assert.equal(state.fun.pveWinStreak, 0, "pve reset");
  assert.ok(state.fun.pveWinStreakBest >= 3, "pve best kept");
}

{
  const state = {
    luckyDay: { type: "grass", date: "x" },
    luckyWeek: { type: "flying", week: "x" },
    fun: { catchStreakBest: 5, pveWinStreakBest: 3 },
    era: { id: "hamlet" },
    catchCount: 12,
    pve: { progress: { "1-1": true } },
  };
  const summary = formatWelcomeBackSummary(state, { eraId: "dawn", catchCount: 10, pveCleared: 0 }, 7200);
  assert.ok(summary.includes("离线 2h"), "offline hours");
  assert.ok(summary.includes("草"), "lucky day zh");
  assert.ok(summary.includes("连捕纪录 5"), "catch best");
  assert.ok(summary.includes("时代 → hamlet"), "era change");
  assert.ok(summary.includes("捕捉 +2"), "catch delta");
}

{
  const summary = formatWelcomeBackSummary(
    {
      luckyDay: { type: "grass", date: "x" },
      luckyWeek: { type: "flying", week: "x" },
      fun: { catchStreakBest: 5, pveWinStreakBest: 3 },
      era: { id: "hamlet" },
      catchCount: 12,
      pve: { progress: { "1-1": true } },
      meta: { expeditionsCompleted: 3 },
    },
    { eraId: "dawn", catchCount: 10, pveCleared: 0, expeditionsCompleted: 1 },
    7200
  );
  assert.ok(summary.includes("远征完成 +2"), "expedition offline delta");
}

{
  const summary = formatWelcomeBackSummary(
    {
      luckyDay: { type: "grass", date: "x" },
      meta: { pvpStats: { wins: 4, losses: 2, draws: 0 } },
    },
    {},
    3600
  );
  assert.ok(summary.includes("本赛季 4胜2负"), "welcome back pvp stats");
}

{
  const ui = {};
  noteCatchNearMiss(ui, "pika", 0.42);
  assert.equal(ui.lastCatchNearMiss?.pct, 42, "near miss pct");
  noteCatchNearMiss(ui, "pika", 0.2);
  assert.equal(ui.lastCatchNearMiss, null, "near miss clear low");
}

{
  assert.equal(natureWildCatchMul("gentle"), 1.05, "gentle +5% catch");
  assert.equal(natureWildCatchMul("bold"), 0.95, "bold -5% catch");
  assert.equal(natureWildCatchMul("hardy"), 1, "neutral hardy");
}

{
  const summary = formatWelcomeBackSummary(
    { meta: { trainingExpGained: 120, expeditionsCompleted: 3 }, luckyDay: { type: "fire", date: "x" } },
    { trainingExpGained: 40, expeditionsCompleted: 2 },
    7200
  );
  assert.ok(summary.includes("训练经验 +80"), "welcome back training exp");
  assert.ok(summary.includes("远征完成 +1"), "welcome back expedition");
}

{
  assert.deepEqual(catchStreakMilestoneBadges(2), [], "streak badges empty under 3");
  assert.deepEqual(catchStreakMilestoneBadges(5), ["连捕×3", "连捕×5"], "streak badges 5");
  assert.equal(catchStreakMilestoneBadges(10).length, 3, "streak badges 10");
}

{
  assert.equal(applyQuickExpeditionDuration(1000, false), 1000, "quick off duration");
  assert.equal(applyQuickExpeditionDuration(1000, true), 300, "quick on duration 0.3x");
  assert.equal(applyQuickExpeditionReward(100, true), 70, "quick reward 0.7x");
  assert.equal(applyQuickExpeditionReward(100, false), 100, "quick off reward");
}

{
  const exp = { totalSec: 100, milestonesFired: {} };
  assert.deepEqual(tickExpeditionMilestones(exp, 80, 74), ["远征：深入探索，前方路途渐显。"], "cross 75%");
  assert.deepEqual(tickExpeditionMilestones(exp, 74, 70), [], "no double fire");
  assert.ok(tickExpeditionMilestones(exp, 51, 49).length === 1, "cross 50%");
  assert.ok(tickExpeditionMilestones(exp, 26, 20).length === 1, "cross 25%");
}

{
  assert.equal(gatherNextMilestone(0).next, 100, "gather next 100");
  assert.equal(gatherNextMilestone(100).next, 500, "gather next 500");
  assert.equal(gatherNextMilestone(1000).done, true, "gather done");
}

{
  const today = localDateStr();
  const meta = {};
  assert.equal(canClaimDailyFreeFc(meta, today), true, "free fc available");
  markDailyFreeFcClaimed(meta, today);
  assert.equal(canClaimDailyFreeFc(meta, today), false, "free fc claimed");
}

{
  const state = { catchCount: 0, meta: {} };
  const list = dailyGoalsChecklist(state);
  assert.equal(list.length, 3, "daily goals 3");
  assert.ok(list.every((x) => typeof x.label === "string"), "daily goal labels");
}

{
  assert.ok(liveNextGoalLine({}, { eraQuest: "抓一只" }).includes("时代任务"), "live goal era");
  assert.ok(liveNextGoalLine({}, { pveNext: "1-1" }).includes("挑战"), "live goal pve");
}

{
  const state = { meta: {} };
  ensureNpcRecord(state);
  recordNpcFight(state, "npc_ace", true);
  recordNpcFight(state, "npc_ace", false);
  assert.equal(npcRecordLine(state.meta.npcRecord, "npc_ace"), "1胜1负", "npc ladder wl");
}

{
  assert.ok(BREED_EVENT_CARDS.length >= 3, "breed cards");
  const c = pickBreedEventCard(() => 0);
  assert.ok(c && c.title, "pick breed card");
}

{
  const fun = {};
  const a = bumpGatherCombo(fun, 1000, 1200);
  assert.equal(a.combo, 1, "combo start");
  const b = bumpGatherCombo(fun, 1500, 1200);
  assert.equal(b.combo, 2, "combo continue");
  const c = bumpGatherCombo(fun, 4000, 1200);
  assert.equal(c.combo, 1, "combo reset");
  fun.gatherCombo = 9;
  fun.gatherComboAt = 5000;
  const d = bumpGatherCombo(fun, 5500, 1200);
  assert.equal(d.combo, 10, "combo 10");
  assert.equal(d.bonus, true, "combo bonus at 10");
}

{
  const t = researchProgressTheater(10, 100);
  assert.equal(t.pct, 90, "research pct");
  assert.ok(t.nearDone && t.label.includes("即将完成"), "research near done");
  assert.equal(researchProgressTheater(50, 100).nearDone, false, "not near");
}

{
  const meta = {};
  assert.equal(canClaimDexRegion(meta, "kanto"), true, "dex region claimable");
  assert.equal(markDexRegionClaimed(meta, "kanto"), true, "dex claim once");
  assert.equal(canClaimDexRegion(meta, "kanto"), false, "dex claimed");
  assert.equal(markDexRegionClaimed(meta, "kanto"), false, "no double claim");
}

{
  const meta = {};
  const a = pveDailyFirstWinMul(meta, "2099-01-01");
  assert.equal(a.mul, 1.5, "first win mul");
  assert.equal(a.isFirst, true, "is first");
  const b = pveDailyFirstWinMul(meta, "2099-01-01");
  assert.equal(b.mul, 1, "second win no mul");
}

{
  const meta = {};
  const today = localDateStr();
  assert.equal(canBuyShopDailyDeal(meta, today), true, "deal available");
  assert.equal(SHOP_DAILY_DEAL.costFc, 3, "deal cost");
  assert.equal(SHOP_DAILY_DEAL.gainFc, 10, "deal gain");
  markShopDailyDealBought(meta, today);
  assert.equal(canBuyShopDailyDeal(meta, today), false, "deal bought");
}

{
  assert.equal(seasonLocalScore(5, 2), 52, "season score");
  const bar = seasonBarVsGhosts(50);
  assert.ok(bar.tip.includes("再登记") || bar.tip.includes("超过"), "season tip");
  assert.ok(bar.topPct >= 0 && bar.topPct <= 100, "season pct");
}

{
  const state = { meta: {} };
  ensureSessionDay(state, "2099-06-01");
  bumpSessionCatch(state);
  bumpSessionPveWin(state);
  bumpSessionExpedition(state);
  // force same day
  state.meta.sessionDay.date = localDateStr();
  const line = sessionHighlightsLine(state);
  assert.ok(line.includes("捕捉"), "session highlights");
}

{
  const state = {
    res: { bigBerry: { value: 1 } },
    mons: { list: [{ name: "A", satiety: 10 }, { name: "B", satiety: 90 }] },
  };
  assert.equal(findHungryMon(state.mons.list, 30)?.name, "A", "find hungry");
  const r = feedOneHungryWithBerry(state, 30);
  assert.equal(r.ok, true, "feed ok");
  assert.equal(state.res.bigBerry.value, 0, "berry consumed");
  assert.ok(state.mons.list[0].satiety >= 60, "satiety up");
}

{
  const state = { catchCount: 0, meta: {} };
  const list = liveGoalsChecklist(state, { dexPct: 10, eraQuest: "造田" });
  assert.equal(list.length, 3, "live goals 3");
}

{
  const state = { meta: {} };
  noteNpcWeeklyWin(state, "npc_youngster");
  noteNpcWeeklyWin(state, "npc_lass");
  let prog = npcWeeklyProgress(state);
  assert.equal(prog.canClaim, false, "weekly not all");
  noteNpcWeeklyWin(state, "npc_ace");
  prog = npcWeeklyProgress(state);
  assert.equal(prog.canClaim, true, "weekly ready");
  const claim = claimNpcWeeklyFc(state, 20);
  assert.equal(claim.ok, true, "weekly claim");
  assert.equal(claim.fc, 20, "weekly fc");
  assert.equal(npcWeeklyProgress(state).canClaim, false, "weekly claimed");
}

{
  const meta = {};
  const today = localDateStr();
  assert.equal(canClaimDailySpin(meta, today), true, "spin available");
  const hit = rollDailySpin(() => 0);
  assert.ok(hit.label, "spin label");
  markDailySpinClaimed(meta, today);
  assert.equal(canClaimDailySpin(meta, today), false, "spin claimed");
}

{
  const state = { catchCount: 2 };
  ensureCaptureSessionGoal(state);
  state.fun.sessionCatchBase = 0;
  state.fun.sessionCatchGoal = 5;
  let p = captureSessionProgress(state);
  assert.equal(p.delta, 2, "session delta");
  assert.equal(p.canClaim, false, "session not yet");
  state.catchCount = 5;
  p = captureSessionProgress(state);
  assert.equal(p.canClaim, true, "session claimable");
}

{
  const state = { meta: {} };
  bumpItemsCare(state, "2099-02-01");
  bumpItemsCare(state, "2099-02-01");
  bumpItemsCare(state, "2099-02-01");
  const prog = itemsCareProgress(state, "2099-02-01");
  assert.equal(prog.canClaim, true, "care claimable");
  assert.equal(markItemsCareClaimed(state, "2099-02-01"), true, "care mark");
  assert.equal(itemsCareProgress(state, "2099-02-01").canClaim, false, "care done");
}

{
  const today = localDateStr();
  const state = {
    catchCount: 10,
    meta: {
      dailyGoals: { date: today, catchBase: 0, catchTarget: 3, trainDone: true, pveDone: true, trainBase: 0 },
    },
  };
  assert.equal(canClaimDailyGoalsBundle(state, today), true, "goals bundle");
  assert.equal(markDailyGoalsBundleClaimed(state, today), true, "goals mark");
  assert.equal(canClaimDailyGoalsBundle(state, today), false, "goals claimed");
}

{
  const meta = {};
  assert.equal(canClaimLbRivalReward(meta, 0), false, "no beat");
  assert.equal(canClaimLbRivalReward(meta, 2), true, "beat ok");
  markLbRivalRewardClaimed(meta, localDateStr());
  assert.equal(canClaimLbRivalReward(meta, 2), false, "rival claimed");
}

{
  const meta = {};
  const n = bumpLoginStreak(meta, localDateStr());
  assert.ok(n >= 1, "login streak");
  assert.equal(bumpLoginStreak(meta, localDateStr()), n, "login stable same day");
}

{
  const state = { meta: {} };
  const t = ensureTowerState(state);
  assert.equal(t.floor, 1, "tower floor1");
  assert.equal(isTowerCleared(t), false, "tower not cleared");
  assert.ok(getTowerFloor(1)?.name, "tower floor def");
  assert.equal(PVE_TOWER_FLOORS.length, 8, "tower 8 floors");
  assert.ok(isoWeekKey().includes("-W"), "iso week");
}

{
  const state = { meta: {} };
  for (let i = 0; i < 40; i++) bumpGatherDaily(state, "2099-04-01");
  const g = gatherDailyProgress(state, "2099-04-01");
  assert.equal(g.canClaim, true, "gather daily claimable");
  assert.equal(markGatherDailyClaimed(state, "2099-04-01"), true, "gather mark");
}

{
  const today = localDateStr();
  const meta = { dailyFreeFcDate: today, shopDailyDealDate: today, dailySpinDate: today };
  const t = shopDailyTripleProgress(meta, today);
  assert.equal(t.canClaim, true, "triple ready");
  markShopDailyTripleClaimed(meta, today);
  assert.equal(shopDailyTripleProgress(meta, today).canClaim, false, "triple claimed");
}

{
  const state = { meta: {} };
  noteExpeditionDailyDone(state, "2099-05-01");
  assert.equal(expeditionDailyProgress(state, "2099-05-01").canClaim, true, "exp daily");
  assert.equal(markExpeditionDailyClaimed(state, "2099-05-01"), true, "exp claim");
}

console.log("gameplay-fun-selfcheck: ok");
