// 排行榜渲染（只写 DOM，不改业务 state）
// 维护者窗口：C（渲染）/ 数据刷新仍在 app.js SECTION:LEADERBOARD_DATA

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

    if (Array.isArray(ui.lbDexItems)) {
      rows.push(sectionHeader("dex", "图鉴榜 Top100"));
      if (!isFolded("dex")) {
        const items = ui.lbDexItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">图鉴：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbHatchItems)) {
      rows.push(sectionHeader("hatch", "孵蛋数量榜 Top100"));
      if (!isFolded("hatch")) {
        const items = ui.lbHatchItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">孵蛋：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbShinyItems)) {
      rows.push(sectionHeader("shiny", "闪光收集榜 Top100"));
      if (!isFolded("shiny")) {
        const items = ui.lbShinyItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">闪光：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbTotalPowerItems)) {
      rows.push(sectionHeader("totalPower", "总战力榜 Top100"));
      if (!isFolded("totalPower")) {
        const items = ui.lbTotalPowerItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">总战力：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbGatherItems)) {
      rows.push(sectionHeader("gather", "累计采集次数榜 Top100"));
      if (!isFolded("gather")) {
        const items = ui.lbGatherItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">采集：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbResourceItems)) {
      rows.push(sectionHeader("resource", "累计资源产出榜 Top100"));
      if (!isFolded("resource")) {
        const items = ui.lbResourceItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">产出：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbCatchItems)) {
      rows.push(sectionHeader("catch", "捕获大师榜 Top100"));
      if (!isFolded("catch")) {
        const items = ui.lbCatchItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
                    </div>
                    <div class="row__right">
                      <div class="badge badge--ok">捕获：${score}</div>
                    </div>
                  </div>
                `;
              })
              .join("")
          );
        }
      }
    }

    if (Array.isArray(ui.lbPowerItems)) {
      rows.push(sectionHeader("power", "队伍战力榜 Top100"));
      if (!isFolded("power")) {
        const items = ui.lbPowerItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
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
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span></div>
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
    }

    if (Array.isArray(ui.lbContribItems)) {
      rows.push(sectionHeader("contrib", "贡献榜 Top100"));
      if (!isFolded("contrib")) {
        const items = ui.lbContribItems.slice(0, 100);
        if (items.length === 0) {
          rows.push(`<div class="row"><div class="row__left"><div class="row__desc muted">暂无数据</div></div></div>`);
        } else {
          rows.push(
            items
              .map((it) => {
                const rank = typeof it?.rank === "number" ? it.rank : 0;
                const owner = typeof it?.attrs?.ownerName === "string" ? it.attrs.ownerName : typeof it?.name === "string" ? it.name : "";
                const avatarDataUrl = typeof it?.attrs?.avatarDataUrl === "string" ? it.attrs.avatarDataUrl : "";
                const score = typeof it?.score === "number" ? it.score : 0;
                const sec = Math.max(0, Math.floor(score));
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title row__titleLine"><span>#${rank} ${escapeHtml(owner || "-")}</span>${renderOwnerIcon(avatarDataUrl)}</div>
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
    }

    elLeaderboard.innerHTML = rows.join("");
    ui.leaderboardDirty = false;
  };
}
