// 社交功能模块

const TOKEN_KEY = "kittens_mvp_cloud_token_v1";

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

export function createSocialSystem({ lbBaseUrl, lbFetchJson, ui, addLog }) {
  
  // ========== 消息系统 ==========
  
  async function getMessages() {
    if (!ui.lbUid) return null;
    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/messages?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      return data.messages || [];
    } catch (error) {
      console.error("Get messages error:", error);
      return null;
    }
  }

  async function sendMessage(toUid, message) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/messages?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ toUid, message }),
      });

      const data = await response.json();
      if (data.error) {
        addLog(`发送消息失败：${data.error}`, true);
        return false;
      }

      addLog("消息已发送", true);
      return true;
    } catch (error) {
      console.error("Send message error:", error);
      addLog("发送消息失败", true);
      return false;
    }
  }

  async function markMessageRead(messageId) {
    if (!ui.lbUid) return false;

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/messages?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ messageId }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error("Mark message read error:", error);
      return false;
    }
  }

  // ========== PVP 对战系统 ==========
  
  async function getPvpInvites() {
    if (!ui.lbUid) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/pvp-invites?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      return data.invites || [];
    } catch (error) {
      console.error("Get PVP invites error:", error);
      return null;
    }
  }
  
  async function sendPvpInvite(toUid, teamData) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/pvp-invite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ fromUid: ui.lbUid, toUid, teamData }),
      });

      const data = await response.json();
      if (data.error) {
        addLog(`发送对战邀请失败：${data.error}`, true);
        return false;
      }

      addLog("对战邀请已发送", true);
      return true;
    } catch (error) {
      console.error("Send PVP invite error:", error);
      addLog("发送对战邀请失败", true);
      return false;
    }
  }

  async function acceptPvpInvite(inviteId, teamData) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return null;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/pvp-accept`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ inviteId, uid: ui.lbUid, teamData }),
      });

      const data = await response.json();
      if (data.error) {
        addLog(`接受对战邀请失败：${data.error}`, true);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Accept PVP invite error:", error);
      addLog("接受对战邀请失败", true);
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

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error("Save PVP result error:", error);
      return false;
    }
  }

  // ========== 成就分享系统 ==========
  
  async function getAchievements() {
    if (!ui.lbUid) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      return data.achievements || [];
    } catch (error) {
      console.error("Get achievements error:", error);
      return null;
    }
  }

  async function shareAchievement(achievementType, achievementData) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ achievementType, achievementData }),
      });

      const data = await response.json();
      if (data.error) {
        addLog(`分享成就失败：${data.error}`, true);
        return false;
      }

      addLog("成就已分享", true);
      return true;
    } catch (error) {
      console.error("Share achievement error:", error);
      addLog("分享成就失败", true);
      return false;
    }
  }

  async function likeAchievement(achievementId) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/social/achievements?uid=${encodeURIComponent(ui.lbUid)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ achievementId }),
      });

      const data = await response.json();
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
      addLog("点赞失败", true);
      return false;
    }
  }

  // ========== 好友资料系统 ==========
  
  async function getFriendProfile(friendUid) {
    if (!ui.lbUid) return null;

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(
        `${base}/api/social/friend-profile?uid=${encodeURIComponent(ui.lbUid)}&friendUid=${encodeURIComponent(friendUid)}`,
        { headers: authHeaders() }
      );
      return data;
    } catch (error) {
      console.error("Get friend profile error:", error);
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
    sendPvpInvite,
    acceptPvpInvite,
    savePvpResult,
    // 成就
    getAchievements,
    shareAchievement,
    likeAchievement,
    // 资料
    getFriendProfile,
  };
}
