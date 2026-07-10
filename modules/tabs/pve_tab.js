// PvE 关卡挑战 Tab — UI 渲染与交互
import { PVE_CHAPTERS, PVE_DAILY_MAX, getStageById, isStageUnlocked } from "../pve_defs.js";
import { simulateBattle } from "../pve_battle.js";

export function createRenderPve({
  elPveList,
  ui,
  clamp,
  escapeHtml,
  monPower,
  renderPokemonIcon,
  getMonCurrentStats,
  getPokeApiDataByDex,
  markPveDirty,
  addLog,
  addRes,
  addExpToMon,
  render,
  getState,
  TYPE_ZH,
  dexCaughtUnique,
}) {
  function ensurePveState(state) {
    if (!state.pve || typeof state.pve !== "object") {
      state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
    }
    if (!state.pve.progress || typeof state.pve.progress !== "object") state.pve.progress = {};
    if (typeof state.pve.dailyAttempts !== "number") state.pve.dailyAttempts = 0;
    if (typeof state.pve.dailyResetDate !== "string") state.pve.dailyResetDate = "";
    if (!Array.isArray(state.pve.selectedIds)) state.pve.selectedIds = [];

    // 每日重置
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (state.pve.dailyResetDate !== todayStr) {
      state.pve.dailyAttempts = 0;
      state.pve.dailyResetDate = todayStr;
    }
  }

  function getMonTypes(m) {
    // 优先从本地属性表获取（同步、可靠）
    const localTypes = globalThis.POKEMON_TYPES;
    if (localTypes && typeof localTypes === "object") {
      const lt = localTypes[m.dex];
      if (Array.isArray(lt) && lt.length > 0) return lt;
    }
    // fallback: 从 PokeAPI 缓存获取
    const api = typeof getPokeApiDataByDex === "function" ? getPokeApiDataByDex(m.dex) : null;
    const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
    return types.filter((x) => typeof x === "string");
  }

  return function renderPve() {
    if (!elPveList) return;
    if (ui.activeTab !== "pve") return;
    if (!ui.pveDirty) return;
    ui.pveDirty = false;

    const state = typeof getState === "function" ? getState() : null;
    if (!state) return;
    ensurePveState(state);

    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const progress = state.pve.progress;
    const dexCount = typeof dexCaughtUnique === "function" ? dexCaughtUnique() : 0;
    const typeMap = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};

    const rows = [];

    // 每日次数
    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">PvE 关卡挑战</div>
          <div class="row__desc">今日剩余次数：${Math.max(0, PVE_DAILY_MAX - state.pve.dailyAttempts)} / ${PVE_DAILY_MAX}</div>
        </div>
      </div>
    `);

    // 当前选中的章节/关卡
    const selChapter = typeof ui.pveChapter === "string" ? ui.pveChapter : PVE_CHAPTERS[0]?.id ?? "";
    const selStage = typeof ui.pveStage === "string" ? ui.pveStage : "";

    // 章节选择
    const chapterOptions = PVE_CHAPTERS.map((ch) => {
      const locked = dexCount < ch.unlockDex;
      return `<option value="${ch.id}" ${selChapter === ch.id ? "selected" : ""} ${locked ? "disabled" : ""}>${escapeHtml(ch.name)}${locked ? `（需${ch.unlockDex}图鉴）` : ""}</option>`;
    }).join("");

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">选择章节</div>
        </div>
        <div class="row__right">
          <select class="input" data-pve-chapter>${chapterOptions}</select>
        </div>
      </div>
    `);

    const chapter = PVE_CHAPTERS.find((c) => c.id === selChapter) ?? PVE_CHAPTERS[0];
    if (!chapter) {
      elPveList.innerHTML = rows.join("");
      return;
    }

    const chapterLocked = dexCount < chapter.unlockDex;
    if (chapterLocked) {
      rows.push(`<div class="row is-locked"><div class="row__left"><div class="row__title">章节未解锁</div><div class="row__desc">需要图鉴登记 ${chapter.unlockDex} 种。</div></div></div>`);
      elPveList.innerHTML = rows.join("");
      bindEvents(elPveList, state);
      return;
    }

    // 关卡列表
    rows.push(`<div class="sidebar__divider"></div>`);
    for (const st of chapter.stages) {
      const unlocked = isStageUnlocked(st.id, progress);
      const cleared = Boolean(progress[st.id]);
      const starsVal = typeof progress[`${st.id}_stars`] === "number" ? progress[`${st.id}_stars`] : 0;
      const starIcons = [1, 2, 3].map((i) => `<span style="color:${i <= starsVal ? "#f5c542" : "#666"}">★</span>`).join("");
      const typeZh = typeMap[st.type] ?? st.type;
      const selected = selStage === st.id;

      if (!unlocked) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">[锁] ${escapeHtml(st.name)}</div>
              <div class="row__desc">通关 ${escapeHtml(st.unlockReq ?? "")} 后解锁</div>
            </div>
          </div>
        `);
      } else {
        rows.push(`
          <div class="row ${selected ? "is-active" : ""}">
            <div class="row__left">
              <div class="row__title">${escapeHtml(st.name)} <span class="muted">[${escapeHtml(typeZh)}]</span> ${cleared ? starIcons : ""}</div>
              <div class="row__desc">敌人：${st.enemies.map((e) => `${escapeHtml(e.name)} Lv.${e.lvl}`).join("、")}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--small ${selected ? "btn--primary" : ""}" data-pve-select="${st.id}">${selected ? "已选择" : "选择"}</button>
            </div>
          </div>
        `);
      }
    }

    // 选中关卡的详情 + 队伍选择 + 开战
    const stageInfo = selStage ? getStageById(selStage) : null;
    if (stageInfo && isStageUnlocked(selStage, progress)) {
      const st = stageInfo.stage;
      const cleared = Boolean(progress[st.id]);
      const rewards = cleared ? (st.repeatRewards ?? st.rewards) : st.rewards;
      const rewardText = Object.entries(rewards).map(([k, v]) => {
        if (k === "exp") return `经验 +${v}（每只）`;
        if (k === "futurecoin") return `未来币 +${v}`;
        if (k === "evolutionEnergy") return `进化能量 +${v}`;
        if (k === "evolutionStone") return `进化石 +${v}`;
        if (k === "linkRope") return `通信绳 +${v}`;
        return `${k} +${v}`;
      }).join("、");

      rows.push(`<div class="sidebar__divider"></div>`);
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${cleared ? "重复挑战" : "首次通关"}奖励</div>
            <div class="row__desc">${escapeHtml(rewardText)}</div>
          </div>
        </div>
      `);

      // 队伍选择
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
      const teamPower = selectedMons.reduce((s, m) => s + monPower(m), 0);

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">挑战队伍</div>
            <div class="row__desc">已选：${selectedMons.length} / 6 · 总战力：${Math.floor(teamPower)}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--small" data-pve-team-open>选择队员</button>
            <button class="btn btn--small" data-pve-team-clear>清空</button>
          </div>
        </div>
      `);

      // 开战按钮
      const canFight = selectedMons.length > 0 && state.pve.dailyAttempts < PVE_DAILY_MAX;
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">开始挑战</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-pve-fight="${st.id}" ${canFight ? "" : "disabled"}>${canFight ? "开战！" : (state.pve.dailyAttempts >= PVE_DAILY_MAX ? "今日次数已用完" : "请选择队员")}</button>
          </div>
        </div>
      `);
    }

    // 队伍选择弹窗
    let teamModalHtml = "";
    if (ui.pveTeamModalOpen) {
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selSet = new Set(selectedIds);
      const candidates = list
        .filter((m) => m)
        .map((m) => ({ m, power: monPower(m) }))
        .sort((a, b) => b.power - a.power);

      const candidateRows = candidates.map(({ m, power }) => {
        const checked = selSet.has(m.id);
        const disabled = !checked && selectedIds.length >= 6;
        const types = getMonTypes(m).map((t) => typeMap[t] ?? t).join("/");
        return `
          <div class="row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderPokemonIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)} Lv.${m.lvl}</span></div>
              <div class="row__desc">${escapeHtml(types || "-")} · 战力 ${Math.floor(power)}</div>
            </div>
            <div class="row__right">
              <input class="chk" type="checkbox" data-pve-team-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
            </div>
          </div>
        `;
      }).join("");

      teamModalHtml = `
        <div class="modalOverlay" data-pve-team-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">选择挑战队员（最多 6 只）</div>
              <div class="modal__right">
                <button class="btn btn--small" data-pve-team-auto>一键最强</button>
                <button class="btn btn--small" data-pve-team-clear>清空</button>
                <button class="btn btn--small" data-pve-team-close>关闭</button>
              </div>
            </div>
            <div class="modal__body">${candidateRows || '<div class="badge badge--muted">暂无精灵</div>'}</div>
          </div>
        </div>
      `;
    }

    // 战斗结果弹窗
    let resultModalHtml = "";
    if (ui.pveBattleResult) {
      const r = ui.pveBattleResult;
      const starIcons = [1, 2, 3].map((i) => `<span style="color:${i <= r.stars ? "#f5c542" : "#666"};font-size:1.5em">★</span>`).join("");
      const logHtml = r.log.map((l) => `<div class="row__desc">${escapeHtml(l)}</div>`).join("");
      resultModalHtml = `
        <div class="modalOverlay" data-pve-result-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${r.win ? "挑战成功！" : "挑战失败"} ${r.win ? starIcons : ""}</div>
              <div class="modal__right">
                <button class="btn btn--small" data-pve-result-close>关闭</button>
              </div>
            </div>
            <div class="modal__body" style="max-height:400px;overflow-y:auto">
              ${r.rewardText ? `<div class="row"><div class="row__left"><div class="row__title">获得奖励</div><div class="row__desc">${escapeHtml(r.rewardText)}</div></div></div>` : ""}
              <div class="sidebar__divider"></div>
              <div class="row"><div class="row__left"><div class="row__title">战斗日志（${r.rounds}回合）</div></div></div>
              ${logHtml}
            </div>
          </div>
        </div>
      `;
    }

    elPveList.innerHTML = rows.join("") + teamModalHtml + resultModalHtml;
    bindEvents(elPveList, state);
  };

  function doFight(state, stageId) {
    ensurePveState(state);
    const info = getStageById(stageId);
    if (!info) return;
    const st = info.stage;
    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const selectedIds = state.pve.selectedIds.slice(0, 6);
    const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
    if (selectedMons.length === 0) return;

    // 只有在战斗开始时扣次数，失败不额外扣除（在结果处理前预扣，win/lose均消耗1次）
    state.pve.dailyAttempts++;

    // 准备玩家队伍数据
    const team = selectedMons.map((m) => ({
      id: m.id,
      name: m.name,
      types: getMonTypes(m),
      stats: typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : { hp: 50, atk: 20, def: 20, spe: 20 },
    }));

    const result = simulateBattle(team, st.enemies, st.type);

    if (result.win) {
      const cleared = Boolean(state.pve.progress[st.id]);
      const bestStars = typeof state.pve.progress[`${st.id}_stars`] === "number" ? state.pve.progress[`${st.id}_stars`] : 0;
      state.pve.progress[st.id] = true;
      if (result.stars > bestStars) state.pve.progress[`${st.id}_stars`] = result.stars;

      const rewards = cleared ? (st.repeatRewards ?? st.rewards) : st.rewards;
      // 3星额外 50% 奖励
      const mul = result.stars >= 3 ? 1.5 : 1;
      const rewardParts = [];

      if (rewards.futurecoin) {
        const v = Math.floor(rewards.futurecoin * mul);
        if (typeof addRes === "function") addRes("futurecoin", v);
        rewardParts.push(`未来币 +${v}`);
      }
      if (rewards.evolutionEnergy) {
        const v = Math.floor(rewards.evolutionEnergy * mul);
        if (typeof addRes === "function") addRes("evolutionEnergy", v);
        rewardParts.push(`进化能量 +${v}`);
      }
      if (rewards.evolutionStone) {
        const v = Math.floor(rewards.evolutionStone * mul);
        if (typeof addRes === "function") addRes("evolutionStone", v);
        rewardParts.push(`进化石 +${v}`);
      }
      if (rewards.linkRope) {
        const v = Math.floor(rewards.linkRope * mul);
        if (typeof addRes === "function") addRes("linkRope", v);
        rewardParts.push(`通信绳 +${v}`);
      }
      if (rewards.exp) {
        const v = Math.floor(rewards.exp * mul);
        for (const m of selectedMons) {
          if (typeof addExpToMon === "function") addExpToMon(m, v);
        }
        rewardParts.push(`经验 +${v}（每只）`);
      }

      result.rewardText = rewardParts.join("、");
      if (typeof addLog === "function") addLog(`PvE 通关：${st.name}（${result.stars}星）`, true);
    } else {
      result.rewardText = "";
      if (typeof addLog === "function") addLog(`PvE 失败：${st.name}`);
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function bindEvents(el, state) {
    // 章节选择
    const chapterSel = el.querySelector("[data-pve-chapter]");
    if (chapterSel) {
      chapterSel.addEventListener("change", (e) => {
        ui.pveChapter = e.target.value;
        ui.pveStage = "";
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    }

    // 关卡选择
    el.querySelectorAll("[data-pve-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.pveStage = btn.getAttribute("data-pve-select");
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });

    // 队伍弹窗
    const teamOpenBtn = el.querySelector("[data-pve-team-open]");
    if (teamOpenBtn) {
      teamOpenBtn.addEventListener("click", () => {
        ui.pveTeamModalOpen = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    }

    el.querySelectorAll("[data-pve-team-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.pveTeamModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });

    // 弹窗背景点击关闭
    const overlay = el.querySelector("[data-pve-team-overlay]");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          ui.pveTeamModalOpen = false;
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
      });
    }

    // 队员勾选
    el.querySelectorAll("[data-pve-team-check]").forEach((chk) => {
      chk.addEventListener("change", () => {
        ensurePveState(state);
        const id = Number(chk.getAttribute("data-pve-team-check"));
        if (!Number.isFinite(id)) return;
        const sel = state.pve.selectedIds.slice(0, 6);
        if (chk.checked) {
          if (!sel.includes(id) && sel.length < 6) sel.push(id);
        } else {
          const idx = sel.indexOf(id);
          if (idx >= 0) sel.splice(idx, 1);
        }
        state.pve.selectedIds = sel;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });

    // 一键最强
    el.querySelectorAll("[data-pve-team-auto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ensurePveState(state);
        const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
        const sorted = mons.filter(Boolean).map((m) => ({ m, p: monPower(m) })).sort((a, b) => b.p - a.p);
        state.pve.selectedIds = sorted.slice(0, 6).map((x) => x.m.id);
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });

    // 清空队伍
    el.querySelectorAll("[data-pve-team-clear]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ensurePveState(state);
        state.pve.selectedIds = [];
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });

    // 开战
    el.querySelectorAll("[data-pve-fight]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stageId = btn.getAttribute("data-pve-fight");
        doFight(state, stageId);
      });
    });

    // 结果弹窗关闭
    el.querySelectorAll("[data-pve-result-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.pveBattleResult = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    });
    const resultOverlay = el.querySelector("[data-pve-result-overlay]");
    if (resultOverlay) {
      resultOverlay.addEventListener("click", (e) => {
        if (e.target === resultOverlay) {
          ui.pveBattleResult = null;
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
      });
    }
  }
}
