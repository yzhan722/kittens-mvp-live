// 月卡系统
export function createMonthlyCard({ state, addRes, addLog }) {
  const MONTHLY_CARD_PRICE = 300; // 未来币价格
  const MONTHLY_CARD_DAYS = 30;
  const DAILY_REWARD = {
    futurecoin: 15,
    rareCandy: 1,
    evolutionEnergy: 2,
  };

  function ensureMonthlyCardState() {
    if (!state.monthlyCard || typeof state.monthlyCard !== "object") {
      state.monthlyCard = {
        active: false,
        expiresAt: 0,
        lastClaimDate: "",
        totalClaimed: 0,
      };
    }
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isActive() {
    ensureMonthlyCardState();
    return state.monthlyCard.active && Date.now() < state.monthlyCard.expiresAt;
  }

  function canClaim() {
    if (!isActive()) return false;
    ensureMonthlyCardState();
    const today = getTodayStr();
    return state.monthlyCard.lastClaimDate !== today;
  }

  function getRemainingDays() {
    if (!isActive()) return 0;
    ensureMonthlyCardState();
    const remaining = state.monthlyCard.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }

  function purchase() {
    ensureMonthlyCardState();
    const price = MONTHLY_CARD_PRICE;
    
    if ((state.res?.futurecoin?.value ?? 0) < price) {
      return { success: false, message: "未来币不足" };
    }

    state.res.futurecoin.value = Math.max(0, (state.res.futurecoin?.value ?? 0) - price);

    const now = Date.now();
    const daysToAdd = MONTHLY_CARD_DAYS;
    
    if (isActive()) {
      // 续费：在当前到期时间基础上延长
      state.monthlyCard.expiresAt += daysToAdd * 24 * 60 * 60 * 1000;
    } else {
      // 新购：从现在开始计算
      state.monthlyCard.active = true;
      state.monthlyCard.expiresAt = now + daysToAdd * 24 * 60 * 60 * 1000;
    }

    if (typeof addLog === "function") {
      addLog(`购买月卡成功！有效期延长${daysToAdd}天（花费${price}未来币）`, true);
    }

    return {
      success: true,
      expiresAt: state.monthlyCard.expiresAt,
      remainingDays: getRemainingDays(),
    };
  }

  function claimDaily() {
    if (!canClaim()) {
      return { success: false, message: isActive() ? "今日已领取" : "月卡未激活" };
    }

    ensureMonthlyCardState();
    const today = getTodayStr();
    state.monthlyCard.lastClaimDate = today;
    state.monthlyCard.totalClaimed += 1;

    const rewardTexts = [];
    for (const [rid, amount] of Object.entries(DAILY_REWARD)) {
      if (typeof addRes === "function") {
        addRes(rid, amount);
      }
      rewardTexts.push(`${rid} +${amount}`);
    }

    if (typeof addLog === "function") {
      addLog(`月卡每日奖励：${rewardTexts.join("、")}`, true);
    }

    return {
      success: true,
      rewards: DAILY_REWARD,
      rewardTexts,
    };
  }

  function getInfo() {
    ensureMonthlyCardState();
    return {
      active: isActive(),
      canClaim: canClaim(),
      remainingDays: getRemainingDays(),
      dailyReward: DAILY_REWARD,
      price: MONTHLY_CARD_PRICE,
      totalClaimed: state.monthlyCard.totalClaimed,
    };
  }

  return {
    purchase,
    claimDaily,
    isActive,
    canClaim,
    getRemainingDays,
    getInfo,
  };
}
