// 排行榜渲染（只写 DOM，不改业务 state）
// 维护者窗口：C（渲染）/ 数据刷新仍在 app.js SECTION:LEADERBOARD_DATA

import { seasonBarVsGhosts, seasonLocalScore, canClaimLbRivalReward, markLbRivalRewardClaimed, localDateStr } from "../systems/gameplay_fun.js";
import { ghostRivalsForDay, padLeaderboard } from "../systems/world_presence.js";

export function createRenderLeaderboard({
  elLeaderboard,
  ui,
  escapeHtml,
  fmtDuration,
  renderPokemonIcon,
  renderOwnerIcon,
  renderSelfAvatarPreview,
  trainerIconSrc,
  dexCaughtUnique,
  calcTeamPower,
  calcTotalPower,
  calcTopMons,
  getState,
  ensureLeaderboardAutoRefresh,
  refreshLeaderboards,
}) {
  let lbAutoBoot = false;

  function boardRows(board, raw) {
    if (!Array.isArray(raw)) return null;
    return padLeaderboard(raw, board, localDateStr());
  }

  function renderScoreBoard(items, scoreLabel) {
    if (!items || items.length === 0) {
      return `<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`;
    }
    return items
      .map((it) => {
        const rank = typeof it?.rank === "number" ? it.rank : 0;
        const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
        const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
        const score = typeof it?.score === "number" ? it.score : 0;
        const fake = Boolean(it?.fake || it?.attrs?.fake);
        const fakeBadge = fake ? `<span class="badge badge--muted" style="margin-left:6px">NPC</span>` : "";
        return `
          <div class="row">
            <div class="row__left">
              <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${fakeBadge}${renderOwnerIcon(avatarDataUrl)}</div>
            </div>
            <div class="row__right">
              <div class="badge badge--ok">${escapeHtml(scoreLabel)}：${score}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  return function renderLeaderboard() {
    if (!elLeaderboard) return;
    if (ui.activeTab !== "leaderboard") return;
    if (!ui.leaderboardDirty) return;

    const isFolded = (k) => {
      if (k === "dex") return Boolean(ui.lbDexFolded);
      if (k === "power") return Boolean(ui.lbPowerFolded);
      if (k === "contrib") return Boolean(ui.lbContribFolded);
      if (k === "hatch") return Boolean(ui.lbHatchFolded);
      if (k === "shiny") return Boolean(ui.lbShinyFolded);
      if (k === "totalPower") return Boolean(ui.lbTotalPowerFolded);
      if (k === "gather") return Boolean(ui.lbGatherFolded);
      if (k === "resource") return Boolean(ui.lbResourceFolded);
      if (k === "catch") return Boolean(ui.lbCatchFolded);
      return false;
    };
    const sectionHeader = (k, title) => {
      const folded = isFolded(k);
      const icon = folded ? "▸" : "▾";
      return `
        <div class="sidebar__sectionTitleRow">
          <div class="sidebar__sectionTitle">${title}</div>
          <button class="btn btn--small btn--ghost" data-lb-fold="${k}">${icon}</button>
        </div>
      `;
    };

    ensureLeaderboardAutoRefresh();
    if (!lbAutoBoot) {
      lbAutoBoot = true;
      if (!ui.lbBusy) refreshLeaderboards();
    }

    const state = typeof getState === "function" ? getState() : null;
    if (!state || typeof state !== "object") return;

    const dexNow = dexCaughtUnique();
    const teamNow = calcTeamPower(calcTopMons(6));
    const totalPowerNow = calcTotalPower();
    const hatchNow = Math.max(0, Math.floor(Number.isFinite(state.hatchCount) ? state.hatchCount : 0));
    const shinyNow = Math.max(0, Math.floor(Number.isFinite(state.shinyCount) ? state.shinyCount : 0));
    const gatherNow = Math.max(0, Math.floor(Number.isFinite(state.gatherClicks) ? state.gatherClicks : 0));
    const resourceNow = Math.max(0, Math.floor(Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0));
    const catchNow = Math.max(0, Math.floor(Number.isFinite(state.catchCount) ? state.catchCount : 0));

    const rows = [];
    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">排行榜</div>
          <div class="row__desc">Real scores first; thin boards padded with NPC trainer IDs (ASCII), drifting daily.</div>
        </div>
      </div>
    `);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">昵称</div>
          <div class="row__desc">用于榜单展示（本地保存）。</div>
        </div>
        <div class="row__right">
          <div style="display:flex;align-items:center;gap:8px">
            <input class="input" data-lb-name value="${escapeHtml(ui.lbName || "")}" placeholder="训练家" />
            ${renderSelfAvatarPreview()}
            <input type="file" accept="image/*" data-lb-avatar style="display:none" />
            <button class="btn btn--small" data-lb-act="pickAvatar" ${ui.lbBusy ? "disabled" : ""}>上传头像</button>
          </div>
        </div>
      </div>
    `);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">当前成绩</div>
          <div class="row__desc">图鉴 ${dexNow} · 队伍战力(前6) ${teamNow} · 总战力 ${totalPowerNow}</div>
          <div class="row__desc">孵蛋 ${hatchNow} · 闪光 ${shinyNow} · 采集 ${gatherNow} · 产出 ${resourceNow} · 捕获 ${catchNow}${ui.lbErr ? ` · <span class=\"badge badge--danger\">${escapeHtml(ui.lbErr)}</span>` : ""}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-lb-act="submit" ${ui.lbBusy ? "disabled" : ""}>刷新</button>
        </div>
      </div>
    `);

    {
      const pveWins = Math.max(0, Math.floor(state.meta?.pveWins || 0));
      const myScore = seasonLocalScore(dexNow, pveWins);
      const bar = seasonBarVsGhosts(myScore);
      const today = localDateStr();
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      const canRival = canClaimLbRivalReward(state.meta, bar.beaten, today);
      const rivalClaimed = state.meta.lbRivalClaimDate === today;
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">赛季进度（本地）</div>
            <div class="row__desc">积分 ${bar.score}（图鉴×10 + PvE胜场）· 对顶端 ${bar.topPct}%</div>
            <div class="dex-progress" aria-label="赛季进度 ${bar.topPct}%"><div class="dex-progress__fill" style="width:${bar.topPct}%"></div></div>
            <div class="row__desc">${escapeHtml(bar.tip)} · 已超 ${bar.beaten}/${bar.total} 幽灵</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-lb-act="claimRival" ${canRival ? "" : "disabled"}>${rivalClaimed ? "对决赏已领" : "幽灵对决赏 +8"}</button>
          </div>
        </div>
      `);
    }

    // 本地幽灵对手（按日漂移，无人也有追赶感）
    {
      const ghosts = ghostRivalsForDay(localDateStr());
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">幽灵对手（今日）</div>
            <div class="row__desc">NPC chase targets; scores drift daily; not uploaded.</div>
          </div>
        </div>
      `);
      for (const g of ghosts) {
        const dexCmp = dexNow >= g.dex ? "领先" : `差 ${g.dex - dexNow}`;
        const powCmp = teamNow >= g.power ? "领先" : `差 ${g.power - teamNow}`;
        const chaseTab = dexNow < g.dex ? "capture" : "pve";
        const chaseLabel = dexNow < g.dex ? "去捕捉追赶" : "去挑战追赶";
        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">${escapeHtml(g.name)}</div>
              <div class="row__desc">图鉴目标 ${g.dex}（你 ${dexNow} · ${dexCmp}）· 战力目标 ${g.power}（你 ${teamNow} · ${powCmp}）</div>
            </div>
            <div class="row__right">
              <button class="btn btn--small" data-lb-act="chase" data-lb-chase="${chaseTab}">${chaseLabel}</button>
            </div>
          </div>
        `);
      }
    }

    const dexItems = boardRows("dex", ui.lbDexItems);
    if (dexItems) {
      rows.push(sectionHeader("dex", "图鉴榜 Top100"));
      if (!isFolded("dex")) rows.push(renderScoreBoard(dexItems, "图鉴"));
    }

    const hatchItems = boardRows("hatch", ui.lbHatchItems);
    if (hatchItems) {
      rows.push(sectionHeader("hatch", "孵蛋数量榜 Top100"));
      if (!isFolded("hatch")) rows.push(renderScoreBoard(hatchItems, "孵蛋"));
    }

    const shinyItems = boardRows("shiny", ui.lbShinyItems);
    if (shinyItems) {
      rows.push(sectionHeader("shiny", "闪光收集榜 Top100"));
      if (!isFolded("shiny")) rows.push(renderScoreBoard(shinyItems, "闪光"));
    }

    const totalPowerItems = boardRows("totalPower", ui.lbTotalPowerItems);
    if (totalPowerItems) {
      rows.push(sectionHeader("totalPower", "总战力榜 Top100"));
      if (!isFolded("totalPower")) rows.push(renderScoreBoard(totalPowerItems, "总战力"));
    }

    const gatherItems = boardRows("gather", ui.lbGatherItems);
    if (gatherItems) {
      rows.push(sectionHeader("gather", "累计采集次数榜 Top100"));
      if (!isFolded("gather")) rows.push(renderScoreBoard(gatherItems, "采集"));
    }

    const resourceItems = boardRows("resource", ui.lbResourceItems);
    if (resourceItems) {
      rows.push(sectionHeader("resource", "累计资源产出榜 Top100"));
      if (!isFolded("resource")) rows.push(renderScoreBoard(resourceItems, "产出"));
    }

    const catchItems = boardRows("catch", ui.lbCatchItems);
    if (catchItems) {
      rows.push(sectionHeader("catch", "捕获大师榜 Top100"));
      if (!isFolded("catch")) rows.push(renderScoreBoard(catchItems, "捕获"));
    }

    const powerItems = boardRows("power", ui.lbPowerItems);
    if (powerItems) {
      rows.push(sectionHeader("power", "队伍战力榜 Top100"));
      if (!isFolded("power")) {
        rows.push(
          powerItems
            .map((it) => {
              const rank = typeof it?.rank === "number" ? it.rank : 0;
              const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
              const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
              const score = typeof it?.score === "number" ? it.score : 0;
              const topMons = Array.isArray(it?.attrs?.topMons) ? it.attrs.topMons : [];
              const teamScore = topMons.length > 0 ? calcTeamPower(topMons) : score;
              const isAvatar = Boolean(avatarDataUrl);
              const avatarSrc = isAvatar ? avatarDataUrl : trainerIconSrc();
              const avatarStyle = isAvatar ? "" : "image-rendering:pixelated;object-fit:contain";
              const fake = Boolean(it?.fake || it?.attrs?.fake);
              const fakeBadge = fake ? `<span class="badge badge--muted" style="margin-left:6px">NPC</span>` : "";
              const monsHtml =
                topMons.length > 0
                  ? `<div class="lbTeamWrap"><img class="lbTeamAvatar" src="${escapeHtml(avatarSrc)}" alt="" loading="lazy" decoding="async" style="${avatarStyle}" /><div class="lbTeamMons">${topMons
                      .slice(0, 6)
                      .map((m) => {
                        const dex = typeof m?.dex === "number" && Number.isFinite(m.dex) ? Math.max(1, Math.floor(m.dex)) : 0;
                        const name = typeof m?.name === "string" ? m.name : dex ? `#${dex}` : "";
                        const pow = typeof m?.power === "number" && Number.isFinite(m.power) ? Math.max(0, Math.floor(m.power)) : 0;
                        const shiny = Boolean(m?.isShiny);
                        return `<div style="display:flex;align-items:center;gap:6px;min-width:0">${dex ? renderPokemonIcon(dex, name, shiny) : ""}<div style="min-width:0"><div style="line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</div><div class="muted" style="line-height:1.1">${pow}</div></div></div>`;
                      })
                      .join("")}</div></div>`
                  : "";
              return `
                <div class="row">
                  <div class="row__left">
                    <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${fakeBadge}</div>
                    ${monsHtml}
                  </div>
                  <div class="row__right">
                    <div class="badge badge--ok">战力：${teamScore}</div>
                  </div>
                </div>
              `;
            })
            .join("")
        );
      }
    }

    const contribItems = boardRows("contrib", ui.lbContribItems);
    if (contribItems) {
      rows.push(sectionHeader("contrib", "贡献榜 Top100"));
      if (!isFolded("contrib")) {
        rows.push(
          contribItems
            .map((it) => {
              const rank = typeof it?.rank === "number" ? it.rank : 0;
              const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
              const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
              const score = typeof it?.score === "number" ? it.score : 0;
              const sec = Math.max(0, Math.floor(score));
              const fake = Boolean(it?.fake || it?.attrs?.fake);
              const fakeBadge = fake ? `<span class="badge badge--muted" style="margin-left:6px">NPC</span>` : "";
              return `
                <div class="row">
                  <div class="row__left">
                    <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${fakeBadge}${renderOwnerIcon(avatarDataUrl)}</div>
                  </div>
                  <div class="row__right">
                    <div class="badge badge--ok">贡献：${escapeHtml(fmtDuration(sec))}</div>
                  </div>
                </div>
              `;
            })
            .join("")
        );
      }
    }

    elLeaderboard.innerHTML = rows.join("");
    ui.leaderboardDirty = false;
  };
}
