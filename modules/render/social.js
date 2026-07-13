// 社交功能渲染模块

import { getExpeditionSeasonBlurb, pickExpeditionEventCard, resolveSeasonId } from "../systems/expedition.js";
import { formatPvpSeasonStats, formatPvpSeasonHeadline } from "../systems/pvp_narrative.js";
import { fakeSocialFeed, localDateStr } from "../systems/world_presence.js";

export function createRenderSocial({ ui, escapeHtml, socialSystem, formatTime, getState }) {
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

  function pvpSeasonSuffix() {
    if (!ui.remoteConfig) return "";
    const sid = resolveSeasonId(ui.remoteConfig);
    return ` <span class="muted">· 赛季 ${escapeHtml(sid)}</span>`;
  }

  function pvpSeasonStatsHtml() {
    const stats = typeof getState === "function" ? getState()?.meta?.pvpStats : null;
    const line = formatPvpSeasonStats(stats);
    return line ? `<div class="row__meta">${escapeHtml(line)}</div>` : "";
  }

  function pvpSeasonBlurbHtml() {
    const sid = resolveSeasonId(ui.remoteConfig);
    const stats = typeof getState === "function" ? getState()?.meta?.pvpStats : null;
    const headline = formatPvpSeasonHeadline(stats, sid);
    const blurb = getExpeditionSeasonBlurb(sid);
    return [headline, blurb].filter(Boolean).map((t) => `<div class="row__meta">${escapeHtml(t)}</div>`).join("");
  }

  function pvpEmptyStateHtml() {
    return `
      <div class="row">
        <div class="row__left">
          <div class="row__title">暂无对战邀请${pvpSeasonSuffix()}</div>
          <div class="row__desc">
            ${pvpSeasonBlurbHtml()}
            ${pvpSeasonStatsHtml()}
            如何开始 PvP：
            <ol style="margin:0.5rem 0 0 1.2rem;padding:0;">
              <li>在下方「我的队伍」选择最多 6 只精灵</li>
              <li>好友资料页点击「对战邀请」向好友发起挑战</li>
              <li>收到邀请后点「应战」，系统自动模拟战斗并记录结果</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  async function renderPvpInvites() {
    const elPvpInvites = document.getElementById("pvpInvites");
    if (!elPvpInvites) return;

    if (!socialSystem.hasAuth()) {
      elPvpInvites.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友对战邀请${pvpSeasonSuffix()}</div>
            <div class="row__desc">登录云账号后可收发好友挑战。上方「训练家对战」无需登录。</div>
            ${pvpSeasonStatsHtml()}
          </div>
        </div>
      `;
      return;
    }

    const invites = await socialSystem.getPvpInvites();
    if (invites === null) {
      elPvpInvites.innerHTML = socialUnavailableRow("社交服务暂时不可用");
      return;
    }

    if (!invites || invites.length === 0) {
      elPvpInvites.innerHTML = pvpEmptyStateHtml();
      return;
    }

    let html = "";
    for (const invite of invites) {
      const expiresIn = Math.floor((invite.expires_at - Date.now()) / 1000 / 60);
      html += `
        <div class="row pvp-invite-card">
          <div class="row__left">
            <div class="row__title">${escapeHtml(invite.from_name || invite.from_uid)} 向你发起挑战${pvpSeasonSuffix()}</div>
            <div class="row__desc">
              队伍：${(Array.isArray(invite.team_data) ? invite.team_data : []).map(m => escapeHtml(m?.name || "?")).join(", ") || "未知"}
              <br>剩余时间：${expiresIn} 分钟
            </div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-pvp-action="accept" data-invite-id="${invite.id}">
              应战
            </button>
          </div>
        </div>
      `;
    }

    elPvpInvites.innerHTML = html;
  }

  function renderPvpRecent() {
    const el = document.getElementById("pvpRecent");
    if (!el) return;
    const recent = Array.isArray(ui.pvpRecent) ? ui.pvpRecent : [];
    if (!recent.length) {
      el.innerHTML = "";
      return;
    }
    let html = `<div class="row"><div class="row__left"><div class="row__title">最近战果${pvpSeasonSuffix()}</div>${pvpSeasonBlurbHtml()}${pvpSeasonStatsHtml()}</div></div>`;
    for (const item of recent) {
      const tone =
        item.winner === 2 ? "badge--success" : item.winner === 1 ? "badge--warning" : "badge--muted";
      html += `
        <div class="row">
          <div class="row__left">
            <div class="row__desc"><span class="badge ${tone}">${item.winner === 2 ? "胜" : item.winner === 1 ? "负" : "平"}</span> ${escapeHtml(item.line || "")}</div>
            <div class="row__meta">${formatTime(item.at || Date.now())}</div>
          </div>
        </div>
      `;
    }
    el.innerHTML = html;
  }
  
  // 渲染好友动态（成就分享）
  async function renderFriendFeed() {
    const elFeed = document.getElementById("friendFeed");
    if (!elFeed) return;

    if (!socialSystem.hasAuth?.()) {
      elFeed.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">好友动态</div>
            <div class="row__desc">请先在「设置」登录云账号后查看好友动态</div>
          </div>
        </div>
      `;
      return;
    }

    const achievements = await socialSystem.getAchievements();
    if (achievements === null) {
      elFeed.innerHTML = socialUnavailableRow("好友动态加载失败");
      return;
    }

    if (!achievements || achievements.length === 0) {
      const fakes = fakeSocialFeed(localDateStr(), 5);
      let html = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">NPC Feed</div>
            <div class="row__desc">No friend shares yet — padded with NPC trainer IDs.</div>
          </div>
        </div>
      `;
      for (const it of fakes) {
        html += `
          <div class="row achievement-card">
            <div class="row__left">
              <div class="row__title">${escapeHtml(it.username)} <span class="badge badge--muted">NPC</span></div>
              <div class="row__desc">${escapeHtml(it.text)}</div>
              <div class="row__meta">${formatTime(it.created_at)}</div>
            </div>
          </div>
        `;
      }
      elFeed.innerHTML = html;
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
            <div class="row__desc">请先在「设置」登录云账号后查看消息</div>
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
    renderPvpInvites,
    renderPvpRecent,
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
