// 好友系统模块

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

export function createFriendsSystem({ lbBaseUrl, lbFetchJson, ui, addLog, render }) {
  
  // 获取好友列表
  async function getFriendsList() {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return null;
    }

    try {
      const base = lbBaseUrl();
      const data = await lbFetchJson(`${base}/api/friends/list?uid=${encodeURIComponent(ui.lbUid)}`, {
        headers: authHeaders(),
      });
      return data;
    } catch (error) {
      console.error("Get friends error:", error);
      addLog("获取好友列表失败", true);
      return null;
    }
  }

  // 发送好友请求
  async function sendFriendRequest(toUsername) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/friends/request`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fromUid: ui.lbUid,
          toUsername,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        addLog(`发送好友请求失败：${data.error}`, true);
        return false;
      }

      addLog(`已向 ${toUsername} 发送好友请求`, true);
      return true;
    } catch (error) {
      console.error("Send friend request error:", error);
      addLog("发送好友请求失败", true);
      return false;
    }
  }

  // 接受好友请求
  async function acceptFriendRequest(requestId) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/friends/accept`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          requestId,
          uid: ui.lbUid,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        addLog(`接受好友请求失败：${data.error}`, true);
        return false;
      }

      addLog("已接受好友请求", true);
      return true;
    } catch (error) {
      console.error("Accept friend request error:", error);
      addLog("接受好友请求失败", true);
      return false;
    }
  }

  // 赠送道具
  async function giftItem(toUid, itemType, quantity) {
    if (!ui.lbUid) {
      addLog("请先登录", true);
      return false;
    }

    try {
      const base = lbBaseUrl();
      const response = await fetch(`${base}/api/friends/gift`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fromUid: ui.lbUid,
          toUid,
          itemType,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        addLog(data.message || "今日赠送次数已达上限，明天再来吧", true);
        return false;
      }

      if (data.error) {
        addLog(`赠送道具失败：${data.error}`, true);
        return false;
      }

      addLog(`已赠送 ${quantity} 个 ${itemType}`, true);
      return true;
    } catch (error) {
      console.error("Gift item error:", error);
      addLog("赠送道具失败", true);
      return false;
    }
  }

  return {
    getFriendsList,
    sendFriendRequest,
    acceptFriendRequest,
    giftItem,
  };
}

// 渲染好友列表
export function createRenderFriends({ ui, escapeHtml, friendsSystem }) {
  return async function renderFriends() {
    const elFriends = document.getElementById("friends");
    if (!elFriends) return;

    if (!ui.lbUid) {
      elFriends.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友系统</div>
            <div class="row__desc">请先在排行榜标签页登录</div>
          </div>
        </div>
      `;
      return;
    }

    const data = await friendsSystem.getFriendsList();
    if (!data) {
      elFriends.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">加载失败</div>
            <div class="row__desc">无法获取好友列表</div>
          </div>
        </div>
      `;
      return;
    }

    const { friends, pendingRequests } = data;

    let html = `
      <div class="row">
        <div class="row__left">
          <div class="row__title">添加好友</div>
        </div>
        <div class="row__right">
          <input class="input" id="friendUsername" placeholder="输入用户名" />
          <button class="btn btn--primary btn--small" data-friend-action="send-request">发送请求</button>
        </div>
      </div>
    `;

    if (pendingRequests && pendingRequests.length > 0) {
      html += `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友请求 (${pendingRequests.length})</div>
          </div>
        </div>
      `;
      
      for (const req of pendingRequests) {
        html += `
          <div class="row">
            <div class="row__left">
              <div class="row__title">${escapeHtml(req.username)}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary btn--small" data-friend-action="accept" data-request-id="${req.id}">接受</button>
            </div>
          </div>
        `;
      }
    }

    if (friends && friends.length > 0) {
      html += `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友列表 (${friends.length})</div>
          </div>
        </div>
      `;
      
      for (const friend of friends) {
        html += `
          <div class="row">
            <div class="row__left">
              <div class="row__title">${escapeHtml(friend.username)}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--small" data-friend-action="gift" data-friend-uid="${friend.uid}">赠送道具</button>
            </div>
          </div>
        `;
      }
    } else {
      html += `
        <div class="row">
          <div class="row__left">
            <div class="row__title">暂无好友</div>
            <div class="row__desc">添加好友后可以互相赠送道具</div>
          </div>
        </div>
      `;
    }

    elFriends.innerHTML = html;
  };
}
