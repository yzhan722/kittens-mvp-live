// PvE 关卡挑战 Tab — UI 渲染与交互
import { PVE_CHAPTERS, PVE_DAILY_MAX, getStageById, isStageUnlocked } from "../pve_defs.js";
import { simulateBattle, recommendedTypes, typeMatchScore, estimateStageEnemyPower, pveFightModifiers } from "../pve_battle.js";
import { getEraDefById } from "../defs_eras.js";
import { natureIncomingDamageMul, bumpPveWinStreak, resetPveWinStreak, pveDailyFirstWinMul, bumpSessionPveWin, localDateStr } from "../systems/gameplay_fun.js";
import { ensureEra } from "../systems/era.js";
import { ensureTowerState, getTowerFloor, isTowerCleared, PVE_TOWER_FLOORS } from "../systems/pve_tower.js";

// ponytail: blurbs live here — pve_defs is data-only, no chapter copy field yet
const PVE_CHAPTER_BLURBS = {
  "1": "关都八大道馆试炼：从森林虫系到地面系，循序渐进熟悉属性克制。",
  "2": "城都进阶挑战：幽灵、格斗、钢系轮番上阵，终盘龙系需要克制与练度。",
  "3": "丰缘试炼：草火水起步，中段格斗/水系加压，终盘幽灵需特防与克制。",
  "4": "神奥试炼：岩石→草→冰加压，终盘陆地鲨龙系需冰/龙克制与高练度。",
};

const PVE_STAR_NARRATIVE = {
  3: "三星征服：对手再无还手之力，可冲击下一章。",
  2: "两星通关：胜利有余，仍可打磨克制拿满星。",
  1: "一星险胜：下次带上推荐属性与更高练度更稳。",
  loss: "失利也是情报：先看推荐属性、关卡建议等级与物特分路。",
};

const PVE_STAGE_HINTS = {
  "1-1": "首关教学：火/飞行/岩石系克制虫系；先训练到 Lv.3+ 更稳。",
  "1-2": "岩石馆：草/水/格斗/地面系有优势，注意大岩蛇耐久。",
  "1-3": "水系馆：草/电系优先；宝石海星特攻偏高。",
  "2-1": "飞行馆：电/冰/岩石系；波波等级低，适合练手。",
  "2-4": "幽灵馆：恶/幽灵系；耿鬼高星需克制与练度。",
  "2-8": "龙系终盘：冰/妖精/龙系；快龙高星，建议满编再挑战。",
};

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
  onPveAttempt,
  onPveWin,
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

  function selectedStageType() {
    const stageId = typeof ui.pveStage === "string" ? ui.pveStage : "";
    return getStageById(stageId)?.stage?.type ?? null;
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
    const era = ensureEra(state);
    const eraDef = getEraDefById(era.id);

    const rows = [];

    // 每日次数
    const practiceOn = Boolean(ui.pvePracticeMode);
    const practiceHalf = Boolean(ui.pvePracticeHalf);
    const practiceDesc = practiceOn
      ? practiceHalf
        ? " · 练习+半奖（不扣次数、半奖励、不改通关进度）"
        : " · 练习模式（不扣次数、无奖励）"
      : "";
    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">PvE 关卡挑战</div>
          <div class="row__desc">今日剩余次数：${Math.max(0, PVE_DAILY_MAX - state.pve.dailyAttempts)} / ${PVE_DAILY_MAX}${practiceDesc}</div>
        </div>
        <div class="row__right">
          <label class="check">
            <input type="checkbox" data-pve-practice ${practiceOn ? "checked" : ""} />
            <span>练习模式</span>
          </label>
          <label class="check" style="margin-left:8px">
            <input type="checkbox" data-pve-practice-half ${practiceHalf ? "checked" : ""} ${practiceOn ? "" : "disabled"} />
            <span>半奖励</span>
          </label>
        </div>
      </div>
    `);

    // 每周试炼塔
    const tower = ensureTowerState(state);
    const towerDone = isTowerCleared(tower);
    const towerFloor = towerDone ? null : getTowerFloor(tower.floor);
    const towerLocked = dexCount < 10;
    const towerDesc = towerLocked
      ? "图鉴≥10 解锁。"
      : towerDone
        ? `本周已通关全部 ${PVE_TOWER_FLOORS.length} 层 · 最佳 ${tower.best}F`
        : `本周进度 ${tower.floor}/${PVE_TOWER_FLOORS.length}F · 最佳 ${tower.best}F · ${escapeHtml(towerFloor?.name || "")}`;
    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">每周试炼塔</div>
          <div class="row__desc">${towerDesc}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary btn--small" data-pve-tower-fight ${towerLocked || towerDone || !towerFloor || !(state.pve.selectedIds && state.pve.selectedIds.length) ? "disabled" : ""}>${towerDone ? "本周通关" : "挑战本层"}</button>
        </div>
      </div>
    `);

    if (eraDef?.pveHint) {
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">时代提示</div>
            <div class="row__desc">${escapeHtml(eraDef.pveHint)}</div>
          </div>
        </div>
      `);
    }

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

    const chapterBlurb = PVE_CHAPTER_BLURBS[chapter.id];
    if (chapterBlurb) {
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${escapeHtml(chapter.name)}</div>
            <div class="row__desc">${escapeHtml(chapterBlurb)}</div>
          </div>
        </div>
      `);
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
      const recTypes = recommendedTypes(st.type);
      const recText = recTypes.map((t) => typeMap[t] ?? t).join("、") || "无";
      const enemyAvgLvl = Math.round(
        st.enemies.reduce((s, e) => s + (e.lvl || 1), 0) / Math.max(1, st.enemies.length)
      );
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
      const enemyPower = estimateStageEnemyPower(st);
      const stageHint = PVE_STAGE_HINTS[st.id];
      const tutNote = st.id === "1-1" && !cleared ? " · 首关试炼加成" : "";
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${cleared ? "重复挑战" : "首次通关"}奖励</div>
            <div class="row__desc">${escapeHtml(rewardText)}</div>
            <div class="row__desc">推荐属性：${escapeHtml(recText)}（优先能打又抗）</div>
            <div class="row__desc muted">敌人战力约 ${enemyPower} · 建议队伍 ${Math.floor(enemyPower * 0.65)}+ · 等级 ${enemyAvgLvl}+${tutNote}</div>
            ${stageHint ? `<div class="row__desc">${escapeHtml(stageHint)}</div>` : ""}
          </div>
        </div>
      `);

      // 队伍选择
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
      const teamPower = selectedMons.reduce((s, m) => s + monPower(m), 0);
      let matchSe = 0;
      let matchWeak = 0;
      let matchResist = 0;
      for (const m of selectedMons) {
        const ms = typeMatchScore(getMonTypes(m), st.type);
        if (ms.se) matchSe += 1;
        if (ms.weak) matchWeak += 1;
        if (ms.resist) matchResist += 1;
      }
      const matchDesc = selectedMons.length
        ? `克制 ${matchSe}/${selectedMons.length} · 抗性 ${matchResist} · 被克 ${matchWeak}`
        : "未选择队员";
      const matchWarn =
        matchWeak > matchSe && selectedMons.length > 0
          ? `<div class="row__desc" style="color:#f59e0b">编队偏被克，建议换推荐属性</div>`
          : "";

      const powerGap = teamPower < enemyPower * 0.5;
      const powerHint = powerGap
        ? `<div class="row__desc" style="color:#f59e0b">队伍战力偏低，建议训练或换克制属性</div>`
        : "";

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">挑战队伍</div>
            <div class="row__desc">已选：${selectedMons.length} / 6 · 总战力：${Math.floor(teamPower)} / 建议 ${Math.floor(enemyPower * 0.65)}+</div>
            <div class="row__desc">${escapeHtml(matchDesc)}</div>
            ${matchWarn}
            ${powerHint}
          </div>
          <div class="row__right">
            <button class="btn btn--small" data-pve-team-open>选择队员</button>
            <button class="btn btn--small" data-pve-team-clear>清空</button>
          </div>
        </div>
      `);

      // 开战按钮
      const dailyLeft = state.pve.dailyAttempts < PVE_DAILY_MAX;
      const canFight = selectedMons.length > 0 && (practiceOn || dailyLeft);
      const fightLabel = !selectedMons.length
        ? "请选择队员"
        : practiceOn
          ? practiceHalf
            ? "练习开战（半奖励）"
            : "练习开战（无奖励）"
          : dailyLeft
            ? "开战！"
            : "今日次数已用完 · 可开练习";
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">开始挑战</div>
            <div class="row__desc">${
              practiceOn
                ? practiceHalf
                  ? "练习不扣次数；胜利给半奖励，且不改通关/星级进度。"
                  : "练习不扣每日次数，胜利无奖励，用来测阵容。"
                : "正式挑战消耗 1 次每日额度。"
            }</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-pve-fight="${st.id}" ${canFight ? "" : "disabled"}>${fightLabel}</button>
          </div>
        </div>
      `);
    }

    // 队伍选择弹窗
    let teamModalHtml = "";
    if (ui.pveTeamModalOpen) {
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selSet = new Set(selectedIds);
      const stageType = selectedStageType();
      const candidates = list
        .filter((m) => m)
        .map((m) => {
          const types = getMonTypes(m);
          const match = typeMatchScore(types, stageType);
          return { m, power: monPower(m), types, match };
        })
        .sort((a, b) => b.match.score - a.match.score || b.power - a.power);

      const candidateRows = candidates.map(({ m, power, match }) => {
        const checked = selSet.has(m.id);
        const disabled = !checked && selectedIds.length >= 6;
        const types = getMonTypes(m).map((t) => typeMap[t] ?? t).join("/");
        const stats = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : null;
        const lean = stats && (stats.spa ?? 0) >= (stats.atk ?? 0) ? "特" : "物";
        const tag = match.se && match.resist ? "克+抗" : match.se ? "克制" : match.resist ? "抗性" : match.weak ? "被克" : "普通";
        return `
          <div class="row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderPokemonIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)} Lv.${m.lvl}</span></div>
              <div class="row__desc">${escapeHtml(types || "-")} · ${lean} · ${tag} · 战力 ${Math.floor(power)}</div>
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
                <button class="btn btn--small" data-pve-team-auto>一键克制优先</button>
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
      const stageTypeZh = r.stageType ? (typeMap[r.stageType] ?? r.stageType) : "";
      const recText = Array.isArray(r.recTypes)
        ? r.recTypes.map((t) => typeMap[t] ?? t).join("、") || "无"
        : "";
      const typeTipHtml = stageTypeZh
        ? `<div class="row"><div class="row__left"><div class="row__title">属性提示</div><div class="row__desc">关卡属性：${escapeHtml(stageTypeZh)} · 推荐：${escapeHtml(recText)}</div></div></div>`
        : "";

      let summaryHtml = "";
      let tipHtml = "";
      if (r.win) {
        const hpPct = Math.round((r.teamHpPct ?? 0) * 100);
        const winLine =
          r.endReason === "decision"
            ? `险胜（超时判定，剩余生命 ${hpPct}%）`
            : r.stars >= 3
              ? `完胜（${r.stars}星，剩余生命 ${hpPct}%）`
              : `胜利（${r.stars}星，剩余生命 ${hpPct}%）`;
        summaryHtml = `<div class="row"><div class="row__left"><div class="row__title">结果摘要</div><div class="row__desc hint hint--ok">${escapeHtml(winLine)}${typeof r.winStreak === "number" && r.winStreak > 0 ? ` · 连胜 ×${r.winStreak}` : ""}</div><div class="row__meta">${escapeHtml(PVE_STAR_NARRATIVE[r.stars] || PVE_STAR_NARRATIVE[1])}</div>${r.rewardText ? `<div class="row__desc">奖励：${escapeHtml(r.rewardText)}</div>` : ""}</div></div>`;
        if (r.endReason === "decision") {
          tipHtml = `<div class="row"><div class="row__left"><div class="row__title">提升建议</div><div class="row__desc">超时按剩余生命险胜。想稳定三星请再练级或换推荐属性。</div></div></div>`;
        } else if (r.stars < 3 && r.superEffectiveHits === 0) {
          tipHtml = `<div class="row"><div class="row__left"><div class="row__title">提升建议</div><div class="row__desc">胜利但克制不足，换推荐属性可拿更高星级。</div></div></div>`;
        }
      } else {
        const failReason =
          r.endReason === "timeout"
            ? "回合用尽：敌方剩余生命比例更高"
            : r.endReason === "wipe"
              ? "队伍全灭：敌人输出压过你的防线"
              : r.endReason === "empty"
                ? "未派出精灵"
                : r.superEffectiveHits === 0
                  ? "全程无克制伤害：属性不对路"
                  : "练度不足：有克制但仍打不过";
        const fixTip =
          r.endReason === "timeout" || r.endReason === "wipe"
            ? "提高等级/星级，或换「能打又抗」的推荐属性。"
            : r.superEffectiveHits === 0
              ? `试试推荐属性：${escapeHtml(recText)}。`
              : "参考关卡建议等级，升星/喂糖果后再战。";
        summaryHtml = `<div class="row"><div class="row__left"><div class="row__title">失败原因</div><div class="row__desc hint hint--danger">${escapeHtml(failReason)}</div><div class="row__meta">${escapeHtml(PVE_STAR_NARRATIVE.loss)}</div><div class="row__desc">${fixTip}</div></div></div>`;
      }

      resultModalHtml = `
        <div class="modalOverlay" data-pve-result-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${r.win ? "挑战成功！" : "挑战失败"} ${r.win ? starIcons : ""}</div>
              <div class="modal__right">
                <button class="btn btn--small" data-pve-result-close>关闭</button>
              </div>
            </div>
              <div class="modal__body battle-log">
              <div class="pve-result-block ${r.win ? "pve-result-block--win" : "pve-result-block--lose"}">
              ${summaryHtml}
              ${typeTipHtml}
              ${tipHtml}
              </div>
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

    const practice = Boolean(ui.pvePracticeMode);
    const practiceHalf = practice && Boolean(ui.pvePracticeHalf);
    // 正式挑战才扣次数；练习不扣
    if (!practice) state.pve.dailyAttempts++;

    // 准备玩家队伍数据
    const team = selectedMons.map((m) => {
      const stats0 = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : { hp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 };
      const hasMegaAura =
        typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) && m.megaAuraRemainingSec > 0;
      const stats = hasMegaAura
        ? Object.fromEntries(Object.entries(stats0).map(([k, v]) => [k, Math.max(1, Math.floor((typeof v === "number" ? v : 0) * 1.2))]))
        : stats0;
      return {
        id: m.id,
        name: m.name,
        types: getMonTypes(m),
        stats,
      };
    });

    const darkBoostOn =
      typeof state.skills?.darkPveDamageBoostRemainingSec === "number" &&
      Number.isFinite(state.skills.darkPveDamageBoostRemainingSec) &&
      state.skills.darkPveDamageBoostRemainingSec > 0;
    const clearedBefore = Boolean(state.pve.progress[st.id]);
    const tut = pveFightModifiers(st.id, clearedBefore);
    const result = simulateBattle(team, st.enemies, st.type, {
      playerDamageMul: (darkBoostOn ? 1.5 : 1) * tut.playerDamageMul,
      incomingDamageMul: natureIncomingDamageMul(state) * tut.incomingDamageMul,
      enemyHpMul: tut.enemyHpMul,
    });
    result.stageType = st.type;
    result.stageName = st.name;
    result.recTypes = recommendedTypes(st.type);
    result.practice = practice;
    result.practiceHalf = practiceHalf;
    if (typeof onPveAttempt === "function" && !practice) onPveAttempt();

    function grantRewards(mulExtra, { ignoreStarBonus = false } = {}) {
      const cleared = Boolean(state.pve.progress[st.id]);
      const rewards = cleared ? (st.repeatRewards ?? st.rewards) : st.rewards;
      const starMul = ignoreStarBonus ? 1 : result.stars >= 3 ? 1.5 : 1;
      const mul = starMul * mulExtra;
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
      return rewardParts.join("、");
    }

    if (practice && !practiceHalf) {
      result.rewardText = "练习模式：无奖励";
      result.winStreak = 0;
      if (typeof addLog === "function") {
        addLog(result.win ? `PvE 练习通关：${st.name}（${result.stars}星）` : `PvE 练习失败：${st.name}`);
      }
    } else if (practice && practiceHalf) {
      // 半奖励练习：不改通关进度，不扣次数
      if (result.win) {
        result.rewardText = grantRewards(0.5, { ignoreStarBonus: true }) || "半奖励：无";
        result.rewardText = `练习半奖：${result.rewardText}`;
        result.winStreak = 0;
        if (typeof addLog === "function") addLog(`PvE 练习半奖通关：${st.name}（${result.stars}星）`, true);
      } else {
        result.rewardText = "";
        result.winStreak = 0;
        if (typeof addLog === "function") addLog(`PvE 练习失败：${st.name}`);
      }
    } else if (result.win) {
      if (typeof onPveWin === "function") onPveWin();
      const bestStars = typeof state.pve.progress[`${st.id}_stars`] === "number" ? state.pve.progress[`${st.id}_stars`] : 0;
      state.pve.progress[st.id] = true;
      if (result.stars > bestStars) state.pve.progress[`${st.id}_stars`] = result.stars;

      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      state.meta.pveWins = Math.max(0, Math.floor(state.meta.pveWins || 0)) + 1;
      bumpSessionPveWin(state);
      const firstWin = pveDailyFirstWinMul(state.meta, localDateStr());
      result.rewardText = grantRewards(firstWin.mul);
      if (firstWin.isFirst && result.rewardText) {
        result.rewardText = `首胜日加成×1.5：${result.rewardText}`;
      }
      const streakInfo = bumpPveWinStreak(state);
      result.winStreak = streakInfo.streak;
      if (streakInfo.milestone && typeof addLog === "function") {
        addLog(`★ ${streakInfo.milestone}`, true);
      }
      if (typeof addLog === "function") {
        addLog(`PvE 通关：${st.name}（${result.stars}星 · 连胜 ×${streakInfo.streak}${firstWin.isFirst ? " · 今日首胜" : ""}）`, true);
      }
      const goals = state.meta.dailyGoals;
      if (goals && typeof goals === "object") goals.pveDone = true;
    } else {
      resetPveWinStreak(state);
      result.rewardText = "";
      result.winStreak = 0;
      if (typeof addLog === "function") addLog(`PvE 失败：${st.name}（连胜中断）`);
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function doTowerFight(state) {
    ensurePveState(state);
    const tower = ensureTowerState(state);
    const floorDef = getTowerFloor(tower.floor);
    if (!floorDef) return;
    const dexCount = typeof dexCaughtUnique === "function" ? dexCaughtUnique() : 0;
    if (dexCount < 10) return;

    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const selectedIds = state.pve.selectedIds.slice(0, 6);
    const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
    if (selectedMons.length === 0) return;

    const team = selectedMons.map((m) => {
      const stats0 = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : { hp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 };
      const hasMegaAura =
        typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) && m.megaAuraRemainingSec > 0;
      const stats = hasMegaAura
        ? Object.fromEntries(Object.entries(stats0).map(([k, v]) => [k, Math.max(1, Math.floor((typeof v === "number" ? v : 0) * 1.2))]))
        : stats0;
      return { id: m.id, name: m.name, types: getMonTypes(m), stats };
    });

    const darkBoostOn =
      typeof state.skills?.darkPveDamageBoostRemainingSec === "number" &&
      Number.isFinite(state.skills.darkPveDamageBoostRemainingSec) &&
      state.skills.darkPveDamageBoostRemainingSec > 0;
    const result = simulateBattle(team, floorDef.enemies, floorDef.type, {
      playerDamageMul: darkBoostOn ? 1.5 : 1,
      incomingDamageMul: natureIncomingDamageMul(state),
      enemyHpMul: 1 + (floorDef.floor - 1) * 0.05,
    });
    result.stageType = floorDef.type;
    result.stageName = floorDef.name;
    result.recTypes = recommendedTypes(floorDef.type);
    result.practice = false;
    result.practiceHalf = false;

    if (result.win) {
      const rw = floorDef.rewards || {};
      const parts = [];
      if (rw.futurecoin && typeof addRes === "function") {
        addRes("futurecoin", rw.futurecoin);
        parts.push(`未来币 +${rw.futurecoin}`);
      }
      if (rw.evolutionStone && typeof addRes === "function") {
        addRes("evolutionStone", rw.evolutionStone);
        parts.push(`进化石 +${rw.evolutionStone}`);
      }
      if (rw.exp) {
        for (const m of selectedMons) {
          if (typeof addExpToMon === "function") addExpToMon(m, rw.exp);
        }
        parts.push(`经验 +${rw.exp}（每只）`);
      }
      result.rewardText = parts.join("、") || "通关";
      tower.best = Math.max(tower.best || 0, floorDef.floor);
      if (tower.floor >= PVE_TOWER_FLOORS.length) tower.cleared = true;
      else tower.floor += 1;
      result.winStreak = 0;
      bumpSessionPveWin(state);
      if (typeof addLog === "function") addLog(`试炼塔通关：${floorDef.name} → ${tower.floor}F`, true);
      if (typeof onPveWin === "function") onPveWin();
    } else {
      result.rewardText = "";
      result.winStreak = 0;
      if (typeof addLog === "function") addLog(`试炼塔失败：${floorDef.name}`);
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function bindEvents(el, state) {
    // 练习模式
    const practiceChk = el.querySelector("[data-pve-practice]");
    if (practiceChk) {
      practiceChk.addEventListener("change", () => {
        ui.pvePracticeMode = Boolean(practiceChk.checked);
        if (!ui.pvePracticeMode) ui.pvePracticeHalf = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    }
    const halfChk = el.querySelector("[data-pve-practice-half]");
    if (halfChk) {
      halfChk.addEventListener("change", () => {
        ui.pvePracticeHalf = Boolean(halfChk.checked);
        if (ui.pvePracticeHalf) ui.pvePracticeMode = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      });
    }

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

    // 一键克制优先（能打又抗 > 纯克制 > 战力）
    el.querySelectorAll("[data-pve-team-auto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ensurePveState(state);
        const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
        const stageType = selectedStageType();
        const sorted = mons
          .filter(Boolean)
          .map((m) => {
            const match = typeMatchScore(getMonTypes(m), stageType);
            return { m, p: monPower(m), match };
          })
          .sort((a, b) => b.match.score - a.match.score || b.p - a.p);
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

    el.querySelectorAll("[data-pve-tower-fight]").forEach((btn) => {
      btn.addEventListener("click", () => doTowerFight(state));
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
