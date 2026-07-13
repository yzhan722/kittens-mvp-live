// 社交标签页
import { escapeHtml } from "../utils.js";
import { summarizePvpBattle, bumpPvpSeasonStats, normalizePvpRecent } from "../systems/pvp_narrative.js";
import { listNpcTrainers, buildNpcTeam, getNpcTrainer } from "../systems/npc_pvp.js";

export function createSocialTab({ ui, addLog, socialSystem, renderSocial, friendsSystem, state, createPvpBattle, getMonCurrentStats, getPokeApiDataByDex }) {
  
  let selectedTeam = []; // 当前选中的队伍（已归一化为 PVP 战报字段）
  ui.pvpRecent = normalizePvpRecent(state?.meta?.pvpRecent);

  function monTypes(mon) {
    const api = typeof getPokeApiDataByDex === "function" ? getPokeApiDataByDex(mon.dex) : null;
    return Array.isArray(api?.types) ? api.types.slice() : [];
  }

  function toPvpFighter(mon) {
    if (!mon) return null;
    const stats = typeof getMonCurrentStats === "function" ? getMonCurrentStats(mon) : null;
    const hp = Math.max(1, Math.floor(stats?.hp ?? mon.baseStats?.hp ?? 100));
    const attack = Math.max(1, Math.floor(stats?.atk ?? mon.baseStats?.atk ?? 50));
    const defense = Math.max(1, Math.floor(stats?.def ?? mon.baseStats?.def ?? 50));
    const speed = Math.max(1, Math.floor(stats?.spe ?? mon.baseStats?.spe ?? 50));
    const level = Math.max(1, Math.floor(typeof mon.lvl === "number" && Number.isFinite(mon.lvl) ? mon.lvl : 1));
    return {
      id: mon.id,
      name: mon.name,
      dex: mon.dex,
      isShiny: Boolean(mon.isShiny),
      level,
      hp,
      attack,
      defense,
      speed,
      types: monTypes(mon),
      stats: { hp, atk: attack, def: defense, spe: speed },
    };
  }
  
  // 渲染 PVP 邀请列表
  async function renderPvpInvites() {
    return renderSocial.renderPvpInvites();
  }

  async function renderPvpRecent() {
    return renderSocial.renderPvpRecent();
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
    const cloudTok = (() => {
      try {
        return localStorage.getItem("kittens_mvp_cloud_token_v1") || "";
      } catch {
        return "";
      }
    })();
    const needCloud = !cloudTok;

    panelSocial.innerHTML = `
      <div class="social-container">
        <div class="social-section">
          <h3>训练家对战（离线）</h3>
          <div class="row">
            <div class="row__left">
              <div class="row__title">无需登录</div>
              <div class="row__desc">用「我的队伍」挑战 NPC，战绩写入本机赛季统计。云好友对战仍需登录。</div>
            </div>
          </div>
          <div id="npcTrainers"></div>
        </div>
        ${
          needCloud
            ? `<div class="row social-cta">
          <div class="row__left">
            <div class="row__title">云好友 / 真实 PvP</div>
            <div class="row__desc">好友、消息与跨设备进度需要云账号。下方离线对战可先玩。</div>
          </div>
          <div class="row__right">
            <button type="button" class="btn btn--primary btn--small" data-social-goto-options>前往设置</button>
          </div>
        </div>`
            : ""
        }
        <div class="social-section">
          <h3>好友</h3>
          <div class="row">
            <div class="row__left">
              <div class="row__desc">在下方查看动态与消息；添加好友后可发起对战。</div>
            </div>
          </div>
        </div>
        <div class="social-section">
          <h3>PVP 对战</h3>
          <div id="pvpRecent"></div>
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

    panelSocial.querySelector("[data-social-goto-options]")?.addEventListener("click", () => {
      try {
        document.querySelector('.tab[data-tab="options"]')?.click();
      } catch {}
    });

    // 加载好友列表到下拉框
    loadFriendsList();

    // 渲染初始内容
    renderNpcTrainers();
    renderPvpRecent();
    renderPvpInvites();
    renderSocial.renderFriendFeed();
    renderSocial.renderMessages();

    // 设置事件监听
    setupSocialEvents();
  }

  function renderNpcTrainers() {
    const el = document.getElementById("npcTrainers");
    if (!el) return;
    const trainers = listNpcTrainers();
    el.innerHTML = trainers
      .map((t) => {
        const full = getNpcTrainer(t.id);
        return `
        <div class="row">
          <div class="row__left">
            <div class="row__title">${escapeHtml(t.name)}</div>
            <div class="row__desc">${escapeHtml(full?.blurb || "")} · ${t.size} 只</div>
          </div>
          <div class="row__right">
            <button type="button" class="btn btn--primary btn--small" data-npc-fight="${escapeHtml(t.id)}">挑战</button>
          </div>
        </div>`;
      })
      .join("");
  }

  function recordLocalPvpResult(result, label) {
    if (!ui.pvpRecent) ui.pvpRecent = [];
    if (!state.meta || typeof state.meta !== "object") state.meta = {};
    const recentWithCurrent = [{ winner: result.winner }, ...ui.pvpRecent];
    bumpPvpSeasonStats(state.meta, result.winner);
    const line = summarizePvpBattle(result, "你", {
      seasonId: ui.remoteConfig?.seasonId,
      recent: recentWithCurrent,
      stats: state.meta?.pvpStats,
    });
    const prefix = label ? `${label} · ` : "";
    addLog(`PvP：${prefix}${line}`, result.winner === 2);
    ui.pvpRecent.unshift({ line: `${prefix}${line}`, winner: result.winner, at: Date.now() });
    ui.pvpRecent = ui.pvpRecent.slice(0, 5);
    state.meta.pvpRecent = ui.pvpRecent.slice();
    renderPvpRecent();
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

    panelSocial.addEventListener("click", async (e) => {
      const npcBtn = e.target.closest("[data-npc-fight]");
      if (!npcBtn) return;
      const trainerId = npcBtn.getAttribute("data-npc-fight");
      if (!trainerId) return;
      if (!selectedTeam.length) {
        addLog("请先在「我的队伍」选择精灵，再挑战训练家");
        return;
      }
      const npcTeam = buildNpcTeam(trainerId);
      const trainer = getNpcTrainer(trainerId);
      if (!npcTeam.length || !trainer) return;
      npcBtn.disabled = true;
      const pvpBattle = createPvpBattle();
      // simulateBattle: team1=对手, team2=你 → winner 2 = 你赢（与好友应战一致）
      const result = pvpBattle.simulateBattle(npcTeam, selectedTeam, trainer.name, "你");
      recordLocalPvpResult(result, trainer.name);
      showBattleResult(result);
      npcBtn.disabled = false;
    });

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

      if (!ui.pvpRecent) ui.pvpRecent = [];
      const recentWithCurrent = [{ winner: result.winner }, ...ui.pvpRecent];
      bumpPvpSeasonStats(state.meta, result.winner);
      const line = summarizePvpBattle(result, "你", {
        seasonId: ui.remoteConfig?.seasonId,
        recent: recentWithCurrent,
        stats: state.meta?.pvpStats,
      });
      addLog(`PvP：${line}`, result.winner === 2);
      ui.pvpRecent.unshift({ line, winner: result.winner, at: Date.now() });
      ui.pvpRecent = ui.pvpRecent.slice(0, 5);
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      state.meta.pvpRecent = ui.pvpRecent.slice();

      // 显示战斗结果
      showBattleResult(result);

      // 刷新邀请列表
      renderPvpRecent();
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
    const list = state?.mons?.list;
    if (!Array.isArray(list) || list.length === 0) {
      addLog("没有可用的精灵", true);
      return;
    }

    // 游戏内精灵没有 mon.hp 字段；用当前能力值筛可用单位
    const mons = list
      .map((m) => toPvpFighter(m))
      .filter((m) => m && m.hp > 0);
    if (mons.length === 0) {
      addLog("没有可用的精灵", true);
      return;
    }

    // 创建模态框
    const modal = document.createElement("div");
    modal.className = "modalOverlay";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <div class="modal__title">选择队伍（最多6只）</div>
          <button type="button" class="btn btn--small" data-action="cancel">关闭</button>
        </div>
        <div class="modal__body">
          <div id="monSelector" class="mon-selector"></div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn--ghost" data-action="cancel">取消</button>
          <button type="button" class="btn btn--primary" data-action="confirm">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 渲染精灵列表
    const monSelector = modal.querySelector("#monSelector");
    let html = "";
    for (const mon of mons.slice(0, 30)) {
      const shinyIcon = mon.isShiny ? "闪光 " : "";
      const isSelected = selectedTeam.some((m) => m.id === mon.id);
      html += `
        <div class="mon-selector-item ${isSelected ? "selected" : ""}" data-mon-id="${mon.id}">
          <input type="checkbox" ${isSelected ? "checked" : ""} />
          <span>${shinyIcon}${escapeHtml(mon.name)} Lv.${mon.level}</span>
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
      if (!checkbox) return;

      // 切换选中状态
      if (checkbox.checked) {
        checkbox.checked = false;
        item.classList.remove("selected");
      } else {
        const selectedCount = monSelector.querySelectorAll("input[type=checkbox]:checked").length;
        if (selectedCount >= 6) {
          addLog("最多只能选择6只精灵", true);
          return;
        }
        checkbox.checked = true;
        item.classList.add("selected");
      }
    });

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener("click", close);
    });

    modal.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      const selectedIds = Array.from(monSelector.querySelectorAll("input[type=checkbox]:checked")).map((cb) =>
        Number(cb.closest(".mon-selector-item").dataset.monId)
      );

      if (selectedIds.length === 0) {
        addLog("请至少选择一只精灵", true);
        return;
      }

      selectedTeam = mons.filter((m) => selectedIds.includes(m.id));
      renderMyTeam();
      addLog(`已选择 ${selectedTeam.length} 只精灵`, true);
      close();
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
