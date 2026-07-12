// 社交功能渲染模块

export function createRenderSocial({ ui, escapeHtml, socialSystem, formatTime }) {
  function socialUnavailableRow(title) {
    return `
      <div class="row is-locked">
        <div class="row__left">
          <div class="row__title">${escapeHtml(title)}</div>
          <div class="row__desc">社交服务暂时不可用（可继续离线游玩）</div>
        </div>
      </div>
    `;
  }
  
  // 渲染好友动态（成就分享）
  async function renderFriendFeed() {
    const elFeed = document.getElementById("friendFeed");
    if (!elFeed) return;

    if (!ui.lbUid) {
      elFeed.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友动态</div>
            <div class="row__desc">请先登录查看好友动态</div>
          </div>
        </div>
      `;
      return;
    }

    const achievements = await socialSystem.getAchievements();
    if (achievements === null && ui.lbUid) {
      elFeed.innerHTML = socialUnavailableRow("好友动态加载失败");
      return;
    }

    if (!achievements || achievements.length === 0) {
      elFeed.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">暂无动态</div>
            <div class="row__desc">添加好友后可以看到他们的成就分享</div>
          </div>
        </div>
      `;
      return;
    }

    let html = "";
    for (const achievement of achievements) {
      const data = achievement.achievement_data;
      let content = "";

      switch (achievement.achievement_type) {
        case "rare_catch":
          content = `捕获了稀有精灵 <strong>${escapeHtml(data.name)}</strong>`;
          if (data.isShiny) content += " ✨";
          break;
        case "dex_milestone":
          content = `图鉴达到 <strong>${data.count}</strong> 种`;
          break;
        case "level_milestone":
          content = `${escapeHtml(data.name)} 升到了 <strong>Lv.${data.level}</strong>`;
          break;
        case "shiny_milestone":
          content = `闪光精灵达到 <strong>${data.count}</strong> 只`;
          break;
        default:
          content = escapeHtml(JSON.stringify(data));
      }

      html += `
        <div class="row achievement-card" data-achievement-id="${achievement.id}">
          <div class="row__left">
            <div class="row__title">${escapeHtml(achievement.username)}</div>
            <div class="row__desc">${content}</div>
            <div class="row__meta">
              ${formatTime(achievement.created_at)} · 
              <span class="achievement-likes">${achievement.likes}</span> +1
            </div>
          </div>
          <div class="row__right">
            <button class="btn btn--small btn--ghost" data-social-action="like" data-achievement-id="${achievement.id}">
              点赞
            </button>
          </div>
        </div>
      `;
    }

    elFeed.innerHTML = html;
  }

  // 渲染消息列表
  async function renderMessages() {
    const elMessages = document.getElementById("friendMessages");
    if (!elMessages) return;

    if (!ui.lbUid) {
      elMessages.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友消息</div>
            <div class="row__desc">请先登录查看消息</div>
          </div>
        </div>
      `;
      return;
    }

    const messages = await socialSystem.getMessages();
    if (messages === null && ui.lbUid) {
      elMessages.innerHTML = socialUnavailableRow("好友消息加载失败");
      return;
    }

    if (!messages || messages.length === 0) {
      elMessages.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">暂无消息</div>
            <div class="row__desc">好友发送的消息会显示在这里</div>
          </div>
        </div>
      `;
      return;
    }

    let html = "";
    for (const msg of messages) {
      const unreadClass = msg.read ? "" : "message-unread";
      html += `
        <div class="row ${unreadClass}" data-message-id="${msg.id}">
          <div class="row__left">
            <div class="row__title">${escapeHtml(msg.from_name || msg.from_uid)}</div>
            <div class="row__desc">${escapeHtml(msg.message)}</div>
            <div class="row__meta">${formatTime(msg.created_at)}</div>
          </div>
          ${!msg.read ? `
          <div class="row__right">
            <button class="btn btn--small btn--ghost" data-social-action="mark-read" data-message-id="${msg.id}">
              标记已读
            </button>
          </div>
          ` : ""}
        </div>
      `;
    }

    elMessages.innerHTML = html;
  }

  // 渲染好友资料
  async function renderFriendProfile(friendUid) {
    const elProfile = document.getElementById("friendProfile");
    if (!elProfile) return;

    const profile = await socialSystem.getFriendProfile(friendUid);
    if (!profile) {
      elProfile.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">加载失败</div>
            <div class="row__desc">无法获取好友资料</div>
          </div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="row">
        <div class="row__left">
          <div class="row__title">${escapeHtml(profile.user.name)}</div>
          <div class="row__desc">
            图鉴: ${profile.stats.dexCount} | 
            闪光: ${profile.stats.shinyCount} | 
            捕获: ${profile.stats.totalCaught}
          </div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-social-action="send-message" data-friend-uid="${friendUid}">
            发消息
          </button>
          <button class="btn btn--small btn--primary" data-social-action="pvp-invite" data-friend-uid="${friendUid}">
            对战邀请
          </button>
        </div>
      </div>
    `;

    if (profile.mons && profile.mons.length > 0) {
      html += `
        <div class="row">
          <div class="row__left">
            <div class="row__title">精灵展示 (最近${profile.mons.length}只)</div>
          </div>
        </div>
      `;

      for (const mon of profile.mons) {
        const shinyIcon = mon.isShiny ? "✨" : "";
        html += `
          <div class="row">
            <div class="row__left">
              <div class="row__title">${shinyIcon} ${escapeHtml(mon.name)} Lv.${mon.level}</div>
              <div class="row__desc">
                HP: ${mon.hp} | 攻击: ${mon.attack} | 防御: ${mon.defense}
              </div>
            </div>
          </div>
        `;
      }
    }

    elProfile.innerHTML = html;
  }

  return {
    renderFriendFeed,
    renderMessages,
    renderFriendProfile,
  };
}

// 格式化时间
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
