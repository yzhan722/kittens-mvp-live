// Boss 林佬：snooze / 轮询 / 领奖（有网络与 DOM 副作用）
// 维护者窗口：D

export function createBossBullySystem({
  ui,
  defs,
  BOSS_BULLY_SNOOZE_KEY,
  readLocalStorage,
  lbBaseUrl,
  lbFetchJson,
  addRes,
  addLog,
  save,
  markOverlaysDirty,
  render,
}) {
  function bossBullySnoozeKey() {
    const uid = typeof ui.lbUid === "string" && ui.lbUid ? ui.lbUid : "";
    return uid ? `${BOSS_BULLY_SNOOZE_KEY}_${uid}` : BOSS_BULLY_SNOOZE_KEY;
  }

  function readBossBullySnoozeUntil() {
    try {
      const raw = readLocalStorage(bossBullySnoozeKey());
      const v = Number(raw);
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  }

  function writeBossBullySnoozeUntil(ms) {
    try {
      localStorage.setItem(bossBullySnoozeKey(), String(Math.max(0, Math.floor(ms || 0))));
    } catch {
    }
  }

  let BOSS_BULLY_TIMER_ID = 0;
  async function refreshBossBullyOnce({ forceOpen = false } = {}) {
    try {
      const base = lbBaseUrl();
      const uid = typeof ui.lbUid === "string" ? ui.lbUid : "";
      const res = await lbFetchJson(`${base}/api/server/boss/bully?uid=${encodeURIComponent(uid)}`);
      ui.bossBully = res && typeof res === "object" ? res : null;

      const killSeq = typeof res?.killSeq === "number" && Number.isFinite(res.killSeq) ? Math.floor(res.killSeq) : 0;
      const claimed = Boolean(res?.claimed);
      const rewardType = String(res?.rewardType || "");
      const rewardQty = typeof res?.rewardQty === "number" && Number.isFinite(res.rewardQty) ? Math.max(0, Math.floor(res.rewardQty)) : 0;
      const rewards = res && typeof res === "object" && res.rewards && typeof res.rewards === "object" ? res.rewards : null;
      const hasReward = killSeq > 0 && !claimed && (Boolean(rewards && Object.keys(rewards).length > 0) || (rewardType && rewardQty > 0));

      const snoozeUntil = readBossBullySnoozeUntil();
      const now = Date.now();
      if (hasReward && (forceOpen || now >= snoozeUntil)) {
        ui.bossBullyRewardModalOpen = true;
      }

      markOverlaysDirty();
      render();
    } catch {
    }
  }

  function ensureBossBullyPolling() {
    if (BOSS_BULLY_TIMER_ID) return;
    refreshBossBullyOnce();
    BOSS_BULLY_TIMER_ID = window.setInterval(() => {
      refreshBossBullyOnce();
    }, 6000);
  }

  function onBossBullyMaybeReward() {
    refreshBossBullyOnce({ forceOpen: true });
  }

  async function claimBossBullyReward() {
    const b = ui.bossBully;
    if (!b) return;
    const killSeq = typeof b?.killSeq === "number" && Number.isFinite(b.killSeq) ? Math.floor(b.killSeq) : 0;
    if (killSeq <= 0) return;

    try {
      const base = lbBaseUrl();
      const name = typeof ui.lbName === "string" && ui.lbName.trim() ? ui.lbName.trim() : "训练家";
      const res = await lbFetchJson(`${base}/api/server/boss/bully/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: ui.lbUid, name }),
      });

      const rid = String(res?.rewardType || "");
      const qty = typeof res?.rewardQty === "number" && Number.isFinite(res.rewardQty) ? Math.max(0, Math.floor(res.rewardQty)) : 0;
      const already = Boolean(res?.alreadyClaimed);
      const rewards = res && typeof res === "object" && res.rewards && typeof res.rewards === "object" ? res.rewards : null;

      const picked = {};
      if (rewards && typeof rewards === "object") {
        for (const [k, v] of Object.entries(rewards)) {
          const q = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
          if (k && q > 0) picked[String(k)] = q;
        }
      } else if (rid && qty > 0) {
        picked[rid] = qty;
      }

      if (!already && Object.keys(picked).length > 0) {
        for (const [k, v] of Object.entries(picked)) {
          addRes(k, v);
        }
        const text = Object.entries(picked)
          .map(([k, v]) => `${defs.resources?.[k]?.name ?? k} +${v}`)
          .join("，");
        addLog(`领取林佬奖励：${text}`, true);
        save();
      } else {
        addLog("林佬奖励：已领取或暂无可领。", true);
      }

      ui.bossBullyRewardModalOpen = false;
      markOverlaysDirty();
      render();
      refreshBossBullyOnce();
    } catch {
      addLog("林佬奖励：领取失败（请求失败）", true);
      ui.bossBullyRewardModalOpen = false;
      writeBossBullySnoozeUntil(Date.now() + 3 * 60 * 1000);
      markOverlaysDirty();
      render();
    }
  }

  function closeBossBullyRewardModal({ snoozeMin = 10 } = {}) {
    ui.bossBullyRewardModalOpen = false;
    writeBossBullySnoozeUntil(Date.now() + Math.max(1, Math.floor(snoozeMin)) * 60 * 1000);
    markOverlaysDirty();
    render();
  }

  return {
    refreshBossBullyOnce,
    ensureBossBullyPolling,
    onBossBullyMaybeReward,
    claimBossBullyReward,
    closeBossBullyRewardModal,
  };
}
