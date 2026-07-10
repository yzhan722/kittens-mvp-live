export function createRenderMons({
  elMonList,
  elMonDetail,
  elMonBack,
  elMonRegion,
  elMonType,
  elMonPrev,
  elMonNext,
  elMonPageInfo,
  ui,
  clamp,
  escapeHtml,
  pad3,
  renderPokemonIcon,
  TYPE_ZH,
  TYPE_SKILLS,
  monPower,
  clampStar,
  renderStars,
  getStarUpgradeNeed,
  isSameEvoFamily,
  getMonCurrentStats,
  expNeedForLevel,
  getPokeApiDataByDex,
  getEvoMap,
  stageIndex,
  getSpeciesByPid,
  getEvoReqLevel,
  defaultReqLvlByStage,
  isTradeEvo,
  isAffectionEvo,
  getState,
}) {
  return function renderMons() {
    const state = getState();
    if (!elMonList || !elMonDetail || !elMonBack) return;
    if (ui.activeTab !== "mons") return;
    if (!ui.monsDirty) return;

    const list = state.mons?.list ?? [];
    const selectedId = ui.monSelectedId;
    const selected = typeof selectedId === "number" ? list.find((m) => m.id === selectedId) : null;

    const showDetail = Boolean(selected);
    elMonBack.hidden = !showDetail;
    elMonDetail.hidden = !showDetail;
    elMonList.hidden = showDetail;

    if (elMonRegion) elMonRegion.disabled = showDetail;
    if (elMonType) elMonType.disabled = showDetail;
    if (elMonPrev) elMonPrev.disabled = showDetail;
    if (elMonNext) elMonNext.disabled = showDetail;
    if (elMonPageInfo && showDetail) elMonPageInfo.textContent = "";

    if (!showDetail) {
      let prevStarUpBodyScrollTop = 0;
      try {
        const prevBody = elMonList.querySelector('.modalOverlay[data-mon-starup-overlay="1"] .modal__body');
        if (prevBody) prevStarUpBodyScrollTop = prevBody.scrollTop;
      } catch {}

      const rows = [];
      let starUpModalHtml = "";

      const fmtRemain = (sec) => {
        const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        const pad2 = (x) => String(x).padStart(2, "0");
        return `${mm}:${pad2(ss)}`;
      };

      const hasResearch = Boolean(state.research && typeof state.research === "object" && state.research.tid);
      const anyPlanting = Array.isArray(state.mons?.list) && state.mons.list.some((x) => x && x.skillActiveType === "grass" && (x.skillActiveRemainingSec ?? 0) > 0);
      const eggRemain0 =
        typeof state.breeding?.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec) ? state.breeding.eggRemainingSec : 0;
      const eggOn = Boolean(state.breeding?.on) && eggRemain0 > 0;

      const region = ui.monRegion || "all";
      const typeFilter = ui.monType || "all";
      const regionOk = (m) => {
        if (!m || typeof m.dex !== "number") return false;
        if (region === "all") return true;
        if (region === "mythic") return m.tier === "epic";
        if (m.tier === "epic") return false;
        if (region === "kanto") return m.dex >= 1 && m.dex <= 151;
        if (region === "johto") return m.dex >= 152 && m.dex <= 251;
        if (region === "hoenn") return m.dex >= 252 && m.dex <= 386;
        if (region === "sinnoh") return m.dex >= 387 && m.dex <= 493;
        if (region === "unova") return m.dex >= 494 && m.dex <= 649;
        if (region === "kalos") return m.dex >= 650 && m.dex <= 721;
        return true;
      };

      const typeOk = (m) => {
        if (!m || typeof m.dex !== "number") return false;
        if (typeFilter === "all") return true;
        const api = getPokeApiDataByDex(m.dex);
        const types = Array.isArray(api?.types) ? api.types : null;
        if (!types) return true;
        return types.includes(typeFilter);
      };

      const filtered = list.filter((m) => regionOk(m) && typeOk(m)).sort((a, b) => {
        const sort = ui.monSort || "created";
        if (sort === "dex") {
          return a.dex - b.dex;
        }
        if (sort === "lvl") {
          return b.lvl - a.lvl;
        }
        if (sort === "power") {
          return monPower(b) - monPower(a);
        }
        if (sort === "satiety") {
          const sa = clamp(typeof a.satiety === "number" ? a.satiety : 100, 0, 100);
          const sb = clamp(typeof b.satiety === "number" ? b.satiety : 100, 0, 100);
          return sa - sb; // 饱腹度升序，最饿的排最前
        }
        return (b.created ?? 0) - (a.created ?? 0);
      });
      const total = filtered.length;
      const pageSize = Math.max(1, Math.floor(ui.monPageSize || 20));
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      ui.monPage = clamp(Math.floor(ui.monPage || 0), 0, totalPages - 1);

      const pageStart = ui.monPage * pageSize;
      const pageItems = filtered.slice(pageStart, pageStart + pageSize);

      ui.monPageIds = pageItems.map((m) => m.id);

      const canFeedAll =
        (state.res?.catnip?.value ?? 0) >= 100 &&
        filtered.some((m) => clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100) < 100);
      const feedAllCount = filtered.filter((m) => clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100) < 100).length;

      // 批量技能：统计各属性可用精灵数
      const BATCH_SKILL_TYPES = ["fighting","bug","ground","electric","fire","grass","water","normal","ghost","steel","ice","fairy","dragon"];
      const batchSkillCounts = {};
      const batchSkillCooldownCounts = {}; // 冷却中的数量
      for (const t of BATCH_SKILL_TYPES) {
        const cnt = filtered.filter((m) => {
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          if (sat0 < 50) return false;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          if (cd > 0) return false;
          const api = getPokeApiDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types : [];
          return types.includes(t);
        }).length;
        if (cnt > 0) batchSkillCounts[t] = cnt;
        // 统计冷却中但有资格的精灵数量
        const cdCnt = filtered.filter((m) => {
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          if (sat0 < 50) return false;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          if (cd <= 0) return false; // 已就绪的不算这里
          const api = getPokeApiDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types : [];
          return types.includes(t);
        }).length;
        if (cdCnt > 0) batchSkillCooldownCounts[t] = cdCnt;
      }
      const hasBatchSkill = Object.keys(batchSkillCounts).length > 0 || Object.keys(batchSkillCooldownCounts).length > 0;

      if (elMonPageInfo) {
        elMonPageInfo.textContent = `第 ${ui.monPage + 1}/${totalPages} 页（共 ${total} 只）`;
      }
      if (elMonPrev) elMonPrev.disabled = ui.monPage <= 0;
      if (elMonNext) elMonNext.disabled = ui.monPage >= totalPages - 1;

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">快捷操作</div>
            <div class="row__desc">饱腹不足精灵：${feedAllCount} 只 · 树果：${Math.floor(state.res.catnip?.value ?? 0)}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--small${feedAllCount > 0 ? ' btn--warning' : ''}" data-mon-feed-all="1" ${canFeedAll ? "" : "disabled"}>一键喂食${feedAllCount > 0 ? `（${feedAllCount}只）` : '（已满）'}</button>
          </div>
        </div>
      `);

      if (hasBatchSkill) {
        const TYPE_ZH_MAP = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
        // 合并就绪和冷却中的属性
        const allBatchTypes = new Set([...Object.keys(batchSkillCounts), ...Object.keys(batchSkillCooldownCounts)]);
        const batchBtns = [...allBatchTypes].map((t) => {
          const zh = TYPE_ZH_MAP[t] ?? t;
          const readyCnt = batchSkillCounts[t] ?? 0;
          const cdCnt = batchSkillCooldownCounts[t] ?? 0;
          const isReady = readyCnt > 0;
          const label = isReady
            ? `${escapeHtml(zh)}技能 <span class="badge--count">${readyCnt}</span>`
            : `${escapeHtml(zh)}技能 <span style="opacity:0.5;font-size:11px">冷却中(${cdCnt})</span>`;
          return `<button class="btn btn--small type type-${escapeHtml(t)}${isReady ? ' btn--ready' : ''}" data-mon-batch-skill="${escapeHtml(t)}" ${isReady ? '' : 'disabled'}>${label}</button>`;
        }).join("");
        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">批量技能</div>
              <div class="row__desc">可触发：冷却完毕且饱腹≥50</div>
            </div>
            <div class="row__right quickActions">${batchBtns}</div>
          </div>
        `);
      }

      if (total === 0) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">暂无精灵</div>
              <div class="row__desc">去“捕捉”页抓一只吧。</div>
            </div>
          </div>
        `);
      } else {
        for (const m of pageItems) {
          const power = monPower(m);
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          const sat = Math.ceil(sat0);
          const aff = Math.floor(clamp(typeof m.affection === "number" ? m.affection : 0, 0, 100));
          const stars = clampStar(m.stars);
          const starsHtml = renderStars(stars);
          const shinyBadge = Boolean(m.isShiny) ? `<span class="badge badge--ok" style="margin-left:6px">闪光</span>` : "";

          const api = getPokeApiDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : null;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          const satOk = sat0 >= 50;
          const activeType = typeof m.skillActiveType === "string" && m.skillActiveType ? m.skillActiveType : null;
          const activeRem =
            typeof m.skillActiveRemainingSec === "number" && Number.isFinite(m.skillActiveRemainingSec) ? Math.max(0, m.skillActiveRemainingSec) : 0;
          const inExpedition =
            Boolean(state.expedition?.on) &&
            (typeof state.expedition?.remainingSec === "number" ? state.expedition.remainingSec : 0) > 0 &&
            Array.isArray(state.expedition?.activeIds) &&
            state.expedition.activeIds.includes(m.id);

          const skillHtml = types
            ? `<div class="monSkills">${types
                .map((t) => {
                  const tSafe = escapeHtml(t);
                  const rawName = TYPE_SKILLS?.[t] ?? "技能";
                  let label = escapeHtml(rawName);
                  let disabled = false;
                  const implemented =
                    t === "fighting" ||
                    t === "bug" ||
                    t === "ground" ||
                    t === "electric" ||
                    t === "fire" ||
                    t === "grass" ||
                    t === "water" ||
                    t === "normal" ||
                    t === "ghost" ||
                    t === "steel" ||
                    t === "ice" ||
                    t === "fairy" ||
                    t === "dragon";
                  if (!implemented) {
                    disabled = true;
                    label = `${label}（未实装）`;
                  }
                  if (!satOk) disabled = true;
                  if (cd > 0) {
                    disabled = true;
                    label = `${label} ${fmtRemain(cd)}`;
                  }
                  if (activeType && activeType === t && activeRem > 0) {
                    disabled = true;
                    label = `${label} ${fmtRemain(activeRem)}`;
                  }
                  if (inExpedition) {
                    disabled = true;
                    label = `${label}（远征中）`;
                  }
                  if (t === "electric" && !hasResearch) disabled = true;
                  if (t === "fire" && !eggOn) disabled = true;
                  if (t === "water" && !anyPlanting) disabled = true;
                  if (t === "grass" && (state.res.catnip?.value ?? 0) < 10000) disabled = true;
                  const isReady = !disabled;
                  return `<button class="btn btn--small type type-${tSafe}${isReady ? ' btn--ready' : ''}" data-mon-skill="${tSafe}" data-mon-skill-mon="${m.id}" ${disabled ? "disabled" : ""}>${label}</button>`;
                })
                .join("")}</div>`
            : `<div class="badge badge--muted">技能加载中</div>`;

          const starUpOpen = ui.starUpTargetId === m.id;
          const need = getStarUpgradeNeed(stars);
          const candidates = (state.mons?.list ?? []).filter((x) => x && x.id !== m.id && isSameEvoFamily(x.pid, m.pid));
          const selIds = Array.isArray(ui.starUpSelectedIds) ? ui.starUpSelectedIds : [];
          const validSel = selIds.filter((id) => candidates.some((x) => x.id === id));
          const canStarUp = stars < 5 && Number.isFinite(need) && need > 0 && validSel.length === need;

          rows.push(`
            <div class="row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderPokemonIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span>${shinyBadge}<span style="margin-left:8px">${starsHtml}</span></div>
                <div class="row__desc">Lv.${m.lvl} · 战力 ${power} · 饱腹度 ${sat}/100 · 亲密度 ${aff}/100${"caughtWith" in m && m.caughtWith && m.caughtWith !== "pokeball" ? " · " + ({"pokeball":"精灵球","ultraball":"高级球","quickball":"先机球","luxuryball":"豪华球","masterball":"大师球"}[m.caughtWith] ?? m.caughtWith) : ""}</div>
              </div>
              <div class="row__mid">${skillHtml}</div>
              <div class="row__right">
                <div class="badge">No.${pad3(m.dex)}</div>
                <button class="btn btn--small${sat0 < 30 ? ' btn--warning' : sat0 < 60 ? ' btn--warning' : ''}" data-mon-feed="${m.id}" ${sat0 >= 100 ? "disabled" : ""}>${sat0 < 60 ? `喂食(${sat}/100)` : '喂食'}</button>
                <button class="btn btn--small" data-mon-open="${m.id}">查看</button>
                <button class="btn btn--small" data-mon-starup="${m.id}" ${stars >= 5 ? "disabled" : ""}>升星</button>
                <button class="btn btn--small btn--danger" data-mon-release="${m.id}">放生</button>
              </div>
            </div>
          `);

          if (starUpOpen) {
            const candidateRows = candidates
              .map((x) => {
                const checked = validSel.includes(x.id);
                const label = `${x.name} Lv.${x.lvl}`;
                return `
                  <div class="row">
                    <div class="row__left">
                      <div class="row__title">${escapeHtml(label)}</div>
                      <div class="row__desc">同进化系材料</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-mon-starup-check="${x.id}" data-mon-starup-target="${m.id}" ${checked ? "checked" : ""} />
                    </div>
                  </div>
                `;
              })
              .join("");

            const title = `升星：${m.name}`;
            const sub = `选择材料精灵（下一星需要 ${need} 只同进化系材料）`;
            const empty = candidates.length === 0 ? `<div class="badge badge--muted">暂无可用材料</div>` : "";
            const disabledReason =
              stars >= 5
                ? `<div class="badge badge--muted">已满星</div>`
                : candidates.length === 0
                  ? ""
                  : validSel.length !== need
                    ? `<div class="badge badge--muted">材料不足（下一星需要 ${need} 只）</div>`
                    : "";

            starUpModalHtml = `
              <div class="modalOverlay" data-mon-starup-overlay="1">
                <div class="modal">
                  <div class="modal__header">
                    <div class="modal__title">${escapeHtml(title)}</div>
                    <div class="modal__right">
                      <button class="btn btn--small" data-mon-starup-auto="${m.id}">自动选择</button>
                      <button class="btn btn--small" data-mon-starup-clear="${m.id}">清空</button>
                      <button class="btn btn--small" data-mon-starup-close="1">关闭</button>
                    </div>
                  </div>
                  <div class="modal__desc">${escapeHtml(sub)}</div>
                  <div class="modal__body">
                    ${disabledReason}
                    ${empty}
                    ${candidateRows}
                  </div>
                  <div class="actions">
                    <button class="btn btn--primary" data-mon-starup-confirm="${m.id}" ${canStarUp ? "" : "disabled"}>确认升星</button>
                  </div>
                </div>
              </div>
            `;
          }
        }
      }

      if (starUpModalHtml) rows.push(starUpModalHtml);
      elMonList.innerHTML = rows.join("");
      try {
        const nextBody = elMonList.querySelector('.modalOverlay[data-mon-starup-overlay="1"] .modal__body');
        if (nextBody) nextBody.scrollTop = prevStarUpBodyScrollTop;
      } catch {}
      ui.monsDirty = false;
      return;
    }

    const s = getMonCurrentStats(selected);
    const need = expNeedForLevel(selected.lvl);
    const api = getPokeApiDataByDex(selected.dex);
    const types = Array.isArray(api?.types) ? api.types : null;
    const base = api?.baseStats && typeof api.baseStats === "object" ? api.baseStats : null;

    const typeBadges = types
      ? types
          .slice(0, 2)
          .map((t) => {
            const zh = TYPE_ZH[t] ?? t;
            return `<div class="badge type type-${escapeHtml(t)}">${escapeHtml(zh)}</div>`;
          })
          .join("")
      : `<div class="badge badge--muted">属性加载中</div>`;

    const baseBadges = base
      ? `
        <div class="badge">HP ${base.hp}</div>
        <div class="badge">Atk ${base.atk}</div>
        <div class="badge">Def ${base.def}</div>
        <div class="badge">SpA ${base.spa}</div>
        <div class="badge">SpD ${base.spd}</div>
        <div class="badge">Spe ${base.spe}</div>
      `
      : `<div class="badge badge--muted">种族值加载中</div>`;
    const evo = getEvoMap();
    const next = Array.isArray(evo[selected.pid]) ? evo[selected.pid] : [];
    const st = stageIndex(selected.pid);
    const candyHave = Math.max(0, Math.floor(state.res.rareCandy?.value ?? 0));
    const canFeedCandy = candyHave >= 1;

    const evoRows = [];
    if (!next || next.length === 0) {
      evoRows.push(`<div class="badge badge--muted">暂无可用进化</div>`);
    } else {
      for (const toPid of next) {
        const sp = getSpeciesByPid(toPid);
        const label = sp ? sp.name : toPid;

        const needRope = typeof isTradeEvo === "function" ? isTradeEvo(selected.pid, toPid) : false;
        const needAff = !needRope && (typeof isAffectionEvo === "function" ? isAffectionEvo(selected.pid, toPid) : false);
        const reqLvl = getEvoReqLevel(selected.pid, toPid);
        const isStoneEvo = reqLvl === 0 && !needRope && !needAff;
        const reqRid = needRope ? "linkRope" : isStoneEvo ? "evolutionStone" : "evolutionEnergy";
        const reqText = needRope
          ? "通信绳 x1"
          : needAff
            ? "亲密度20+ · 进化能量 x1"
            : isStoneEvo
              ? "进化石 x1"
              : "进化能量 x1";
        const evoOkRes = (state.res?.[reqRid]?.value ?? 0) >= 1;
        const evoOkAff = !needAff || (typeof selected.affection === "number" && selected.affection >= 20);

        const fallbackReqLvl = defaultReqLvlByStage(selected.pid);
        const effReqLvl = typeof reqLvl === "number" ? reqLvl : fallbackReqLvl;
        const evoOkLvl = reqLvl === null ? selected.lvl >= fallbackReqLvl : selected.lvl >= effReqLvl;
        const lvlText = reqLvl === null ? `Lv.${fallbackReqLvl}+` : reqLvl === 0 ? "无等级" : `Lv.${effReqLvl}+`;
        const disabled = evoOkLvl && evoOkRes && evoOkAff ? "" : "disabled";
        evoRows.push(
          `<button class="btn btn--small" data-mon-evo="${selected.id}" data-evo-to="${toPid}" ${disabled}>进化为 ${escapeHtml(label)}（${lvlText} · ${reqText}）</button>`
        );
      }
    }

    elMonDetail.innerHTML = `
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderPokemonIcon(selected.dex, selected.name, Boolean(selected.isShiny))}<span>${escapeHtml(selected.name)}</span>${Boolean(selected.isShiny) ? `<span class="badge badge--ok" style="margin-left:6px">闪光</span>` : ""}<span style="margin-left:8px">${renderStars(selected.stars)}</span></div>
          <div class="row__desc">No.${pad3(selected.dex)} · ${selected.tier === "common" ? "常见" : selected.tier === "uncommon" ? "少见" : selected.tier === "rare" ? "稀有" : "史诗"}</div>
        </div>
        <div class="row__right">
          <div class="badge">Lv.${selected.lvl}</div>
          <div class="badge">EXP ${selected.exp}/${need}</div>
          <div class="badge">饱腹度 ${Math.ceil(clamp(typeof selected.satiety === "number" ? selected.satiety : 100, 0, 100))}/100</div>
          <div class="badge">亲密度 ${Math.floor(clamp(typeof selected.affection === "number" ? selected.affection : 0, 0, 100))}/100</div>
          <div class="badge">战力 ${monPower(selected)}</div>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">能力值</div>
          <div class="row__desc">HP/攻击/防御/特攻/特防/速度</div>
        </div>
        <div class="row__right">
          <div class="badge">HP ${s.hp}</div>
          <div class="badge">Atk ${s.atk}</div>
          <div class="badge">Def ${s.def}</div>
          <div class="badge">SpA ${s.spa}</div>
          <div class="badge">SpD ${s.spd}</div>
          <div class="badge">Spe ${s.spe}</div>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">药剂强化</div>
          <div class="row__desc">消耗药剂：对应属性永久 +5（无上限）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-mon-potion="hpPotion" data-mon-potion-mon="${selected.id}" ${(state.res.hpPotion?.value ?? 0) >= 1 ? "" : "disabled"}>HP药剂</button>
          <button class="btn btn--small" data-mon-potion="atkPotion" data-mon-potion-mon="${selected.id}" ${(state.res.atkPotion?.value ?? 0) >= 1 ? "" : "disabled"}>攻击药剂</button>
          <button class="btn btn--small" data-mon-potion="defPotion" data-mon-potion-mon="${selected.id}" ${(state.res.defPotion?.value ?? 0) >= 1 ? "" : "disabled"}>防御药剂</button>
          <button class="btn btn--small" data-mon-potion="spaPotion" data-mon-potion-mon="${selected.id}" ${(state.res.spaPotion?.value ?? 0) >= 1 ? "" : "disabled"}>特攻药剂</button>
          <button class="btn btn--small" data-mon-potion="spdPotion" data-mon-potion-mon="${selected.id}" ${(state.res.spdPotion?.value ?? 0) >= 1 ? "" : "disabled"}>特防药剂</button>
          <button class="btn btn--small" data-mon-potion="spePotion" data-mon-potion-mon="${selected.id}" ${(state.res.spePotion?.value ?? 0) >= 1 ? "" : "disabled"}>速度药剂</button>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">属性</div>
          <div class="row__desc"></div>
        </div>
        <div class="row__right">
          ${typeBadges}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">种族值</div>
          <div class="row__desc">来自官方数据</div>
        </div>
        <div class="row__right">
          ${baseBadges}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">升级</div>
          <div class="row__desc">神奇糖果可提升等级，经验糖果可增加经验值。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-mon-feed="${selected.id}" data-feed="rareCandy" ${canFeedCandy ? "" : "disabled"}>神奇糖果(1)+1Lv</button>
          <div class="badge badge--muted">x${candyHave}</div>
          <button class="btn btn--small" data-mon-exp="${selected.id}" data-exp="expCandy" ${(state.res.expCandy?.value ?? 0) >= 1 ? "" : "disabled"}>经验糖果+1000</button>
          <div class="badge badge--muted">x${state.res.expCandy?.value ?? 0}</div>
          <button class="btn btn--small" data-mon-exp="${selected.id}" data-exp="expCandyL" ${(state.res.expCandyL?.value ?? 0) >= 1 ? "" : "disabled"}>L+5000</button>
          <div class="badge badge--muted">x${state.res.expCandyL?.value ?? 0}</div>
          <button class="btn btn--small" data-mon-exp="${selected.id}" data-exp="expCandyXL" ${(state.res.expCandyXL?.value ?? 0) >= 1 ? "" : "disabled"}>XL+20000</button>
          <div class="badge badge--muted">x${state.res.expCandyXL?.value ?? 0}</div>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title">进化</div>
          <div class="row__desc">需求：达到对应分支等级（见按钮）且 消耗进化石 x1</div>
        </div>
        <div class="row__right">
          ${evoRows.join("")}
        </div>
      </div>
    `;

    ui.monsDirty = false;
  };
}
