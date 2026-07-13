import assert from "node:assert/strict";
import {
  bumpCatchStreak,
  bumpPveWinStreak,
  catchStreakReward,
  ensureLuckyDay,
  ensureLuckyWeek,
  expeditionNatureTimeMul,
  formatWelcomeBackSummary,
  luckyCatchMul,
  luckyWeekEncounterMul,
  natureAdvMissingPreferChance,
  natureBreedTimeMul,
  natureDexBonusMul,
  natureEncounterRechargeMul,
  natureIncomingDamageMul,
  natureResearchDtMul,
  natureResCapMul,
  natureResProdMul,
  natureTrainExpMul,
  noteCatchNearMiss,
  partyBestPassive,
  partyHasAlwaysEscape,
  pityFailStep,
  resetCatchStreak,
  resetPveWinStreak,
  tryBallSave,
} from "../modules/systems/gameplay_fun.js";

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

console.log("gameplay-fun-selfcheck: ok");
