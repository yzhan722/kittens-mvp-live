// 社交标签页
import { escapeHtml } from "../utils.js";

export function createSocialTab({ ui, addLog, socialSystem, renderSocial, friendsSystem, state, createPvpBattle }) {
  
  let selectedTeam = []; // 当前选中的队伍
  
  // 渲染 PVP 邀请列表
  async function renderPvpInvites() {
    const elPvpInvites = document.getElementById("pvpInvites");
    if (!elPvpInvites) return;

    if (!ui.lbUid) {
      elPvpInvites.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">PVP 对战</div>
            <div class="row__desc">请先登录查看对战邀请</div>
          </div>
        </div>
      `;
      return;
    }

    const invites = await socialSystem.getPvpInvites();
    if (!invites || invites.length === 0) {
      elPvpInvites.innerHTML = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">暂无对战邀请</div>
            <div class="row__desc">好友可以向你发起对战邀请</div>
          </div>
        </div>
      `;
      return;
    }

    let html = "";
    for (const invite of invites) {
      const expiresIn = Math.floor((invite.expires_at - Date.now()) / 1000 / 60);
      html += `
        <div class="row pvp-invite-card">
          <div class="row__left">
            <div class="row__title">${escapeHtml(invite.from_name || invite.from_uid)} 向你发起挑战</div>
            <div class="row__desc">
              队伍：${invite.team_data.map(m => escapeHtml(m.name)).join(", ")}
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

  // 渲染我的队伍
  function renderMyTeam() {
    const elMyTeam = document.getElementById("myTeamDisplay");
    if (!elMyTeam) return;

    if (selectedTeam.length === 0) {
      elMyTeam.innerHTML = `<div class="row__desc">未选择队伍</div>`;
      return;
    }

    let html = "<div class='team-display'>";
    for (const mon of selectedTeam) {
      const shinyIcon = mon.isShiny ? "✨" : "";
      html += `
        <div class="team-mon">
          ${shinyIcon} ${escapeHtml(mon.name)} Lv.${mon.level}
          <br><small>HP:${mon.hp} ATK:${mon.attack} DEF:${mon.defense}</small>
        </div>
      `;
    }
    html += "</div>";

    elMyTeam.innerHTML = html;
  }
  
  function setupSocialTab() {
    const panelSocial = document.getElementById("panel-social");
    if (!panelSocial) return;

    // 初始化社交面板HTML
    panelSocial.innerHTML = `
      <div class="social-container">
        <div class="social-section">
          <h3>PVP 对战</h3>
          <div id="pvpInvites"></div>
          <div class="pvp-team-selector" style="margin-top: 1rem;">
            <h4>我的队伍</h4>
            <div id="myTeamDisplay"></div>
            <button class="btn btn--primary" id="btnSelectTeam">选择队伍</button>
          </div>
        </div>

        <div class="social-section">
          <h3>好友动态</h3>
          <div id="friendFeed"></div>
        </div>

        <div class="social-section">
          <h3>好友消息</h3>
          <div id="friendMessages"></div>
          <div class="message-input-container">
            <select id="messageRecipient" class="input">
              <option value="">选择好友...</option>
            </select>
            <input type="text" id="messageInput" class="input" placeholder="输入消息..." maxlength="500" />
            <button class="btn btn--primary btn--small" data-social-action="send-message-input">发送</button>
          </div>
        </div>

        <div class="social-section">
          <h3>好友资料</h3>
          <select id="friendProfileSelect" class="input">
            <option value="">选择好友查看资料...</option>
          </select>
          <div id="friendProfile"></div>
        </div>
      </div>
    `;

    // 加载好友列表到下拉框
    loadFriendsList();

    // 渲染初始内容
    renderPvpInvites();
    renderSocial.renderFriendFeed();
    renderSocial.renderMessages();

    // 设置事件监听
    setupSocialEvents();
  }

  async function loadFriendsList() {
    if (!ui.lbUid) return;

    const data = await friendsSystem.getFriendsList();
    if (!data || !data.friends) return;

    const messageRecipient = document.getElementById("messageRecipient");
    const friendProfileSelect = document.getElementById("friendProfileSelect");

    if (messageRecipient) {
      messageRecipient.innerHTML = '<option value="">选择好友...</option>';
      for (const friend of data.friends) {
        const option = document.createElement("option");
        option.value = friend.uid;
        option.textContent = friend.username;
        messageRecipient.appendChild(option);
      }
    }

    if (friendProfileSelect) {
      friendProfileSelect.innerHTML = '<option value="">选择好友查看资料...</option>';
      for (const friend of data.friends) {
        const option = document.createElement("option");
        option.value = friend.uid;
        option.textContent = friend.username;
        friendProfileSelect.appendChild(option);
      }
    }
  }

  function setupSocialEvents() {
    const panelSocial = document.getElementById("panel-social");
    if (!panelSocial) return;

    // 选择队伍按钮
    const btnSelectTeam = document.getElementById("btnSelectTeam");
    if (btnSelectTeam) {
      btnSelectTeam.addEventListener("click", () => {
        openTeamSelector();
      });
    }

    // 接受 PVP 邀请
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-pvp-action="accept"]');
      if (!btn) return;

      const inviteId = Number(btn.dataset.inviteId);
      if (!selectedTeam || selectedTeam.length === 0) {
        addLog("请先选择你的队伍", true);
        return;
      }

      btn.disabled = true;
      btn.textContent = "战斗中...";

      // 接受邀请并获取对战数据
      const battleData = await socialSystem.acceptPvpInvite(inviteId, selectedTeam);
      if (!battleData) {
        btn.disabled = false;
        btn.textContent = "应战";
        return;
      }

      // 进行战斗模拟
      const pvpBattle = createPvpBattle();
      const result = pvpBattle.simulateBattle(
        battleData.player1Team,
        battleData.player2Team,
        "对手",
        "你"
      );

      // 保存战斗结果
      const winnerUid = result.winner === 1 ? battleData.player1Uid : 
                        result.winner === 2 ? battleData.player2Uid : null;
      
      await socialSystem.savePvpResult(
        inviteId,
        battleData.player1Uid,
        battleData.player2Uid,
        winnerUid,
        result.battleLog
      );

      // 显示战斗结果
      showBattleResult(result);

      // 刷新邀请列表
      renderPvpInvites();
    });

    // 点赞成就
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-social-action="like"]');
      if (!btn) return;

      const achievementId = Number(btn.dataset.achievementId);
      const success = await socialSystem.likeAchievement(achievementId);
      
      if (success) {
        // 更新点赞数显示
        const card = btn.closest(".achievement-card");
        if (card) {
          const likesSpan = card.querySelector(".achievement-likes");
          if (likesSpan) {
            likesSpan.textContent = Number(likesSpan.textContent) + 1;
          }
        }
        btn.disabled = true;
        btn.textContent = "已赞";
      }
    });

    // 标记消息已读
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-social-action="mark-read"]');
      if (!btn) return;

      const messageId = Number(btn.dataset.messageId);
      const success = await socialSystem.markMessageRead(messageId);
      
      if (success) {
        const row = btn.closest(".row");
        if (row) {
          row.classList.remove("message-unread");
          btn.remove();
        }
      }
    });

    // 发送消息（从输入框）
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-social-action="send-message-input"]');
      if (!btn) return;

      const recipientSelect = document.getElementById("messageRecipient");
      const messageInput = document.getElementById("messageInput");
      
      if (!recipientSelect || !messageInput) return;

      const toUid = recipientSelect.value;
      const message = messageInput.value.trim();

      if (!toUid) {
        addLog("请选择好友", true);
        return;
      }

      if (!message) {
        addLog("请输入消息内容", true);
        return;
      }

      const success = await socialSystem.sendMessage(toUid, message);
      if (success) {
        messageInput.value = "";
        renderSocial.renderMessages();
      }
    });

    // 查看好友资料
    const friendProfileSelect = document.getElementById("friendProfileSelect");
    if (friendProfileSelect) {
      friendProfileSelect.addEventListener("change", async (e) => {
        const friendUid = e.target.value;
        if (friendUid) {
          await renderSocial.renderFriendProfile(friendUid);
        } else {
          const elProfile = document.getElementById("friendProfile");
          if (elProfile) elProfile.innerHTML = "";
        }
      });
    }

    // PVP 对战邀请
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-social-action="pvp-invite"]');
      if (!btn) return;

      const friendUid = btn.dataset.friendUid;
      if (!friendUid) return;

      if (!selectedTeam || selectedTeam.length === 0) {
        addLog("请先选择你的队伍", true);
        return;
      }

      btn.disabled = true;
      const success = await socialSystem.sendPvpInvite(friendUid, selectedTeam);
      btn.disabled = false;

      if (success) {
        addLog("对战邀请已发送", true);
      }
    });

    // 发送消息（从资料页）
    panelSocial.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-social-action="send-message"]');
      if (!btn) return;

      const friendUid = btn.dataset.friendUid;
      if (!friendUid) return;

      // 切换到消息输入区域并选中该好友
      const recipientSelect = document.getElementById("messageRecipient");
      if (recipientSelect) {
        recipientSelect.value = friendUid;
        const messageInput = document.getElementById("messageInput");
        if (messageInput) messageInput.focus();
      }
    });
  }

  // 打开队伍选择器
  function openTeamSelector() {
    if (!state || !state.mons || !state.mons.list) {
      addLog("没有可用的精灵", true);
      return;
    }

    const mons = state.mons.list.filter(m => m && m.hp > 0);
    if (mons.length === 0) {
      addLog("没有可用的精灵", true);
      return;
    }

    // 创建模态框
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal__content">
        <div class="modal__header">
          <h3>选择队伍（最多6只）</h3>
          <button class="modal__close">&times;</button>
        </div>
        <div class="modal__body">
          <div id="monSelector" class="mon-selector"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" data-action="cancel">取消</button>
          <button class="btn btn--primary" data-action="confirm">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 渲染精灵列表
    const monSelector = modal.querySelector("#monSelector");
    let html = "";
    for (const mon of mons.slice(0, 20)) {
      const shinyIcon = mon.isShiny ? "✨" : "";
      const isSelected = selectedTeam.some(m => m.id === mon.id);
      html += `
        <div class="mon-selector-item ${isSelected ? 'selected' : ''}" data-mon-id="${mon.id}">
          <input type="checkbox" ${isSelected ? 'checked' : ''} />
          <span>${shinyIcon} ${escapeHtml(mon.name)} Lv.${mon.level}</span>
          <small>HP:${mon.hp} ATK:${mon.attack} DEF:${mon.defense}</small>
        </div>
      `;
    }
    monSelector.innerHTML = html;

    // 事件处理
    monSelector.addEventListener("click", (e) => {
      const item = e.target.closest(".mon-selector-item");
      if (!item) return;

      const checkbox = item.querySelector("input[type=checkbox]");
      const monId = Number(item.dataset.monId);

      // 切换选中状态
      if (checkbox.checked) {
        checkbox.checked = false;
        item.classList.remove("selected");
      } else {
        // 检查是否已达到上限
        const selectedCount = monSelector.querySelectorAll("input[type=checkbox]:checked").length;
        if (selectedCount >= 6) {
          addLog("最多只能选择6只精灵", true);
          return;
        }
        checkbox.checked = true;
        item.classList.add("selected");
      }
    });

    modal.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector(".modal__close").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      const selectedIds = Array.from(monSelector.querySelectorAll("input[type=checkbox]:checked"))
        .map(cb => Number(cb.closest(".mon-selector-item").dataset.monId));

      if (selectedIds.length === 0) {
        addLog("请至少选择一只精灵", true);
        return;
      }

      selectedTeam = mons.filter(m => selectedIds.includes(m.id));
      renderMyTeam();
      addLog(`已选择 ${selectedTeam.length} 只精灵`, true);
      document.body.removeChild(modal);
    });
  }

  // 显示战斗结果
  function showBattleResult(result) {
    const modal = document.createElement("div");
    modal.className = "modal";
    
    const winnerText = result.winner === 1 ? "对手获胜" : 
                       result.winner === 2 ? "你获胜了！" : "平局";
    
    modal.innerHTML = `
      <div class="modal__content">
        <div class="modal__header">
          <h3>战斗结果</h3>
          <button class="modal__close">&times;</button>
        </div>
        <div class="modal__body">
          <div class="battle-result">
            <h2>${winnerText}</h2>
            <div class="battle-log">
              ${result.battleLog.map(log => `<div>${escapeHtml(log)}</div>`).join("")}
            </div>
            <div class="battle-stats">
              回合数：${result.rounds}
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--primary" data-action="close">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".modal__close").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('[data-action="close"]').addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  // 自动分享成就
  async function autoShareAchievement(type, data) {
    if (!ui.lbUid) return;
    
    // 只分享重要成就
    const shouldShare = 
      (type === "rare_catch" && data.tier <= 2) || // 稀有精灵
      (type === "rare_catch" && data.isShiny) || // 闪光
      (type === "dex_milestone" && data.count % 50 === 0) || // 图鉴里程碑
      (type === "shiny_milestone" && data.count % 10 === 0); // 闪光里程碑

    if (shouldShare) {
      await socialSystem.shareAchievement(type, data);
    }
  }

  return {
    setupSocialTab,
    autoShareAchievement,
  };
}
