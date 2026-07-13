// 社交功能模块

const TOKEN_KEY = "kittens_mvp_cloud_token_v1";
const SOCIAL_DEGRADE_LOG_INTERVAL_MS = 60_000;

function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function authHeaders() {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function socialFailMsg(err, fallback) {
  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.message === "string"
        ? Number(err.message.match(/\bHTTP\s+(\d{3})\b/)?.[1] ?? NaN)
        : NaN;
  if (status === 401 || status === 403) return "请重新登录";
  if (status >= 500 && status <= 599) return "社交服务暂时不可用，请稍后再试";
  if (err instanceof TypeError || err?.name === "AbortError") return "网络异常，社交功能暂时不可用";
  return fallback;
}

export function createSocialSystem({ lbBaseUrl, lbFetchJson, ui, addLog }) {
  function httpStatus(err) {
    if (typeof err?.status === "number") return err.status;
    if (typeof err?.message !== "string") return null;
    const m = err.message.match(/\bHTTP\s+(\d{3})\b/);
    return m ? Number(m[1]) : null;
  }

  function markSocialDegraded(err, fallback) {
    const msg = socialFailMsg(err, fallback);
    const status = httpStatus(err);
    const now = Date.now();
    const wasDegraded = Boolean(ui.socialDegraded);
    const last = typeof ui.socialDegradedAt === "number" ? ui.socialDegradedAt : 0;
    ui.socialDegraded = true;
    ui.socialDegradedMsg = msg;
    if (!wasDegraded || now - last >= SOCIAL_DEGRADE_LOG_INTERVAL_MS) {
      ui.socialDegradedAt = now;
      addLog(status ? `社交接口失败（HTTP ${status}）：${msg}` : msg, true);
    }
  }

  function socialLogMsg(err, fallback) {
    const msg = socialFailMsg(err, fallback);
    const status = httpStatus(err);
    return status ? `社交接口失败（HTTP ${status}）：${msg}` : msg;
  }

  function clearSocialDegraded() {
    ui.socialDegraded = false;
    ui.socialDegradedMsg = "";
  }

  async function readSocialJson(response) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      const error = new Error(data?.error ? `HTTP ${response.status}: ${data.error}` : `HTTP ${response.status}`);
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data || {};
  }
  
  // ========== 消息系统 ==========
  
  async function getMessages() {
    if (!getAuthToken()) return null;
    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/messages?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      clearSocialDegraded();
      return data.messages || [];
    } catch (error) {
      console.error("Get messages error:", error);
      markSocialDegraded(error, "获取消息失败，社交功能暂时不可用");
      return null;
    }
  }

  async function sendMessage(toUid, message) {
    if (!getAuthToken()) {
      addLog("请先在设置页登录云账号", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ toUid, message }),
      });

      const data = await readSocialJson(response);
      if (data.error) {
        addLog(`发送消息失败：${data.error}`, true);
        return false;
      }

      addLog("消息已发送", true);
      return true;
    } catch (error) {
      console.error("Send message error:", error);
      addLog(socialLogMsg(error, "发送消息失败"), true);
      return false;
    }
  }

  async function markMessageRead(messageId) {
    if (!getAuthToken()) return false;

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/messages`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ messageId }),
      });

      const data = await readSocialJson(response);
      return data.ok;
    } catch (error) {
      console.error("Mark message read error:", error);
      markSocialDegraded(error, "标记消息失败，社交功能暂时不可用");
      return false;
    }
  }

  // ========== PVP 对战系统 ==========
  
  async function getPvpInvites() {
    if (!getAuthToken()) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/pvp-invites`, {
        headers: authHeaders(),
      });
      clearSocialDegraded();
      return data.invites || [];
    } catch (error) {
      console.error("Get PVP invites error:", error);
      markSocialDegraded(error, "获取对战邀请失败，社交功能暂时不可用");
      return null;
    }
  }

  /** Inviter: recent battle results against friends (async). */
  async function getPvpResults() {
    if (!getAuthToken()) return null;
    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/pvp-invites?box=results`, {
        headers: authHeaders(),
      });
      clearSocialDegraded();
      return Array.isArray(data?.results) ? data.results : [];
    } catch (error) {
      console.error("Get PVP results error:", error);
      markSocialDegraded(error, "获取对战结果失败，社交功能暂时不可用");
      return null;
    }
  }
  
  async function sendPvpInvite(toUid, teamData) {
    if (!getAuthToken()) {
      addLog("请先在设置页登录云账号", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/pvp-invite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ toUid, teamData }),
      });

      const data = await readSocialJson(response);
      if (data.error) {
        addLog(`发送对战邀请失败：${data.error}`, true);
        return false;
      }

      addLog("对战邀请已发送", true);
      return true;
    } catch (error) {
      console.error("Send PVP invite error:", error);
      addLog(socialLogMsg(error, "发送对战邀请失败"), true);
      return false;
    }
  }

  async function acceptPvpInvite(inviteId, teamData) {
    if (!getAuthToken()) {
      addLog("请先在设置页登录云账号", true);
      return null;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/pvp-accept`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ inviteId, teamData }),
      });

      const data = await readSocialJson(response);
      if (data.error) {
        addLog(`接受对战邀请失败：${data.error}`, true);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Accept PVP invite error:", error);
      addLog(socialLogMsg(error, "接受对战邀请失败"), true);
      return null;
    }
  }

  async function savePvpResult(inviteId, player1Uid, player2Uid, winnerUid, battleLog) {
    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/pvp-result`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ inviteId, player1Uid, player2Uid, winnerUid, battleLog }),
      });

      const data = await readSocialJson(response);
      return data.ok;
    } catch (error) {
      console.error("Save PVP result error:", error);
      markSocialDegraded(error, "保存对战结果失败，社交功能暂时不可用");
      return false;
    }
  }

  // ========== 成就分享系统 ==========
  
  async function getAchievements() {
    if (!getAuthToken()) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      clearSocialDegraded();
      return data.achievements || [];
    } catch (error) {
      console.error("Get achievements error:", error);
      markSocialDegraded(error, "获取好友动态失败，社交功能暂时不可用");
      return null;
    }
  }

  async function shareAchievement(achievementType, achievementData) {
    if (!getAuthToken()) {
      addLog("请先在设置页登录云账号", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ achievementType, achievementData }),
      });

      const data = await readSocialJson(response);
      if (data.error) {
        addLog(`分享成就失败：${data.error}`, true);
        return false;
      }

      addLog("成就已分享", true);
      return true;
    } catch (error) {
      console.error("Share achievement error:", error);
      addLog(socialLogMsg(error, "分享成就失败"), true);
      return false;
    }
  }

  async function likeAchievement(achievementId) {
    if (!getAuthToken()) {
      addLog("请先在设置页登录云账号", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ achievementId }),
      });

      const data = await readSocialJson(response);
      if (data.error) {
        if (data.error === "already liked") {
          addLog("已经点过赞了", true);
        } else {
          addLog(`点赞失败：${data.error}`, true);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("Like achievement error:", error);
      addLog(socialLogMsg(error, "点赞失败"), true);
      return false;
    }
  }

  // ========== 好友资料系统 ==========
  
  async function getFriendProfile(friendUid) {
    if (!getAuthToken()) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(
        `${base}/api/social/friend-profile?uid=${encodeURIComponent(ui.lbUid)}&friendUid=${encodeURIComponent(friendUid)}`,
        { headers: authHeaders() }
      );
      clearSocialDegraded();
      return data;
    } catch (error) {
      console.error("Get friend profile error:", error);
      markSocialDegraded(error, "获取好友资料失败，社交功能暂时不可用");
      return null;
    }
  }

  return {
    // 消息
    getMessages,
    sendMessage,
    markMessageRead,
    // PVP
    getPvpInvites,
    getPvpResults,
    sendPvpInvite,
    acceptPvpInvite,
    savePvpResult,
    // 成就
    getAchievements,
    shareAchievement,
    likeAchievement,
    // 资料
    getFriendProfile,
    hasAuth: () => Boolean(getAuthToken()),
  };
}
