// 每日签到系统
export function createDailySignin({ state, addRes, addLog }) {
  const SIGNIN_KEY = "kittens_mvp_daily_signin_v1";

  function ensureSigninState() {
    if (!state.dailySignin || typeof state.dailySignin !== "object") {
      state.dailySignin = {
        lastSigninDate: "",
        consecutiveDays: 0,
        totalDays: 0,
        claimed: false,
      };
    }
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function checkNewDay() {
    ensureSigninState();
    const today = getTodayStr();
    if (state.dailySignin.lastSigninDate !== today) {
      state.dailySignin.claimed = false;
    }
  }

  function canSignin() {
    ensureSigninState();
    checkNewDay();
    return !state.dailySignin.claimed;
  }

  function getSigninRewards(day) {
    // 签到奖励配置（7天一个周期）
    const rewards = [
      { day: 1, futurecoin: 5, catnip: 500 },
      { day: 2, futurecoin: 5, wood: 200 },
      { day: 3, futurecoin: 10, minerals: 100 },
      { day: 4, futurecoin: 10, pokeball: 50 },
      { day: 5, futurecoin: 15, rareCandy: 1 },
      { day: 6, futurecoin: 20, evolutionEnergy: 2 },
      { day: 7, futurecoin: 50, evolutionStone: 1, rareCandy: 3 },
    ];
    const idx = ((day - 1) % 7);
    return rewards[idx] || rewards[0];
  }

  function signin() {
    ensureSigninState();
    if (!canSignin()) {
      return { success: false, message: "今日已签到" };
    }

    const today = getTodayStr();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    // 检查是否连续
    if (state.dailySignin.lastSigninDate === yesterdayStr) {
      state.dailySignin.consecutiveDays += 1;
    } else if (state.dailySignin.lastSigninDate !== today) {
      state.dailySignin.consecutiveDays = 1;
    }

    state.dailySignin.lastSigninDate = today;
    state.dailySignin.totalDays += 1;
    state.dailySignin.claimed = true;

    const rewards = getSigninRewards(state.dailySignin.consecutiveDays);
    const rewardTexts = [];

    for (const [rid, amount] of Object.entries(rewards)) {
      if (rid === "day") continue;
      if (typeof addRes === "function") {
        addRes(rid, amount);
      }
      rewardTexts.push(`${rid} +${amount}`);
    }

    if (typeof addLog === "function") {
      addLog(`连续登录奖励（第${state.dailySignin.consecutiveDays}天）：${rewardTexts.join("、")}`, true);
    }

    return {
      success: true,
      consecutiveDays: state.dailySignin.consecutiveDays,
      rewards,
      rewardTexts,
    };
  }

  function getSigninInfo() {
    ensureSigninState();
    checkNewDay();
    return {
      canSignin: canSignin(),
      consecutiveDays: state.dailySignin.consecutiveDays,
      totalDays: state.dailySignin.totalDays,
      nextRewards: getSigninRewards(state.dailySignin.consecutiveDays + 1),
    };
  }

  return {
    signin,
    canSignin,
    getSigninInfo,
    getSigninRewards,
  };
}
