export function createRenderCapture({
  elCaptureInfo,
  elCaptureActions,
  elCaptureArea,
  elCaptureChance,
  ui,
  defs,
  getState,
  clamp,
  escapeHtml,
  renderPokemonIcon,
  ensureCaptureAreaValid,
  getCaptureAreas,
  getUnlockedCaptureAreas,
  getActiveCaptureArea,
  dexCaughtUnique,
  getPokeballMakeCost,
  canAfford,
  computeTechEffects,
  baseCatchChanceByDex,
  getSpeciesByPid,
}) {
  return function renderCapture() {
    const state = getState();
    if (!elCaptureInfo || !elCaptureActions || !elCaptureArea) return;
    if (ui.activeTab !== "capture") return;
    if (!ui.captureDirty) return;

    const freezeActions = Boolean(ui.captureQtyFocus);

    const fmtRemain = (sec) => {
      const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      const pad2 = (x) => String(x).padStart(2, "0");
      return `${mm}:${pad2(ss)}`;
    };

    ensureCaptureAreaValid();
    const areas = getCaptureAreas();
    const unlocked = getUnlockedCaptureAreas();

    elCaptureArea.innerHTML = unlocked
      .map((a) => `<option value="${a.id}" ${a.id === ui.captureAreaId ? "selected" : ""}>${a.name}</option>`)
      .join("");

    const area = getActiveCaptureArea();
    const pool = defs.pokemon.filter(area.pool);
    const counts = { common: 0, uncommon: 0, rare: 0, epic: 0 };
    for (const p of pool) counts[p.tier] = (counts[p.tier] ?? 0) + 1;

    const caughtMap = state.dex && typeof state.dex === "object" ? state.dex.caught : null;
    const preview = pool
      .map((p) => {
        const n = caughtMap && typeof caughtMap[p.id] === "number" ? caughtMap[p.id] : 0;
        const html = renderPokemonIcon(p.dex, p.name);
        if (n > 0) return html;
        return html.replace('class="pk-icon"', 'class="pk-icon pk-icon--silhouette"');
      })
      .join("");

    const previewHidden = Boolean(ui.capturePreviewHidden);
    const isMobile = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 980px)").matches : false;
    const previewHiddenEffective = isMobile && previewHidden;

    // 仅用于确保元素存在，不再在顶部展示捕捉成功率参考文本
    if (elCaptureChance) {
      elCaptureChance.textContent = "";
    }

    const unique = dexCaughtUnique();
    const lockTips = areas
      .filter((a) => !a.unlocked)
      .map((a) => {
        const need = a.unlockReq;
        const pct = Math.min(1, unique / need);
        const filled = Math.round(pct * 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        const nearUnlock = pct >= 0.9 && pct < 1;
        const suffix = nearUnlock ? " ★即将解锁！" : "";
        return `- ${a.name}\n  [${bar}] ${unique}/${need}${suffix}`;
      })
      .join("\n");

    elCaptureInfo.innerHTML = `
      <div class="row">
        <div class="row__left">
          <div class="row__title">当前区域</div>
          <div class="row__desc">${area.name}</div>
        </div>
        <div class="row__right">
          <div class="badge">池子：${pool.length} 种</div>
          <div class="badge">常见 ${counts.common}</div>
          <div class="badge">少见 ${counts.uncommon}</div>
          <div class="badge">稀有 ${counts.rare}</div>
          <div class="badge">史诗 ${counts.epic}</div>
          ${isMobile && preview ? `<button class="btn btn--ghost btn--small" data-capture-preview-toggle>${previewHiddenEffective ? "显示预览" : "隐藏预览"}</button>` : ""}
        </div>
      </div>
      ${preview && !previewHiddenEffective ? `<div class="row"><div class="row__left"><div class="row__title">本区域预览</div></div><div class="row__right" style="justify-content:flex-start;flex:1 1 auto;width:100%;"><div class="iconGrid iconGrid--full">${preview}</div></div></div>` : ""}
      ${lockTips ? `<div class="row"><div class="row__left"><div class="row__title">未解锁区域</div><div class="row__desc"><pre class="pre">${escapeHtml(lockTips)}</pre></div></div></div>` : ""}
    `;

    const rows = [];
    const canMakeBall = state.unlocks.pokeball;
    if (canMakeBall) {
      const auto = state.auto && typeof state.auto === "object" ? state.auto : null;
      const autoBallOn = Boolean(auto && auto.autoBallOn);
      const autoBallUnlocked = Boolean(state.unlocks?.autoBall);

      const makeQtyWanted = typeof ui.makeBallQty === "number" ? Math.floor(ui.makeBallQty) : 1;
      const space = Math.max(0, (state.res.pokeball.cap ?? 0) - (state.res.pokeball.value ?? 0));
      const makeQty = clamp(makeQtyWanted, 1, 1000);
      const makeQtyEff = Math.max(0, Math.min(makeQty, space));

      const makeCost = getPokeballMakeCost(makeQtyEff);

      const makeOk = makeQtyEff > 0 && canAfford(makeCost);
      const makeCostText = Object.entries(makeCost)
        .map(([rid, v]) => `${defs.resources[rid].name}${v}`)
        .join(" / ");

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">制作精灵球</div>
            <div class="row__desc">消耗资源制作精灵球（可批量）。</div>
          </div>
          <div class="row__right">
            <select class="input" data-capture-qty>
              <option value="1" ${makeQtyWanted === 1 ? "selected" : ""}>×1</option>
              <option value="10" ${makeQtyWanted === 10 ? "selected" : ""}>×10</option>
              <option value="100" ${makeQtyWanted === 100 ? "selected" : ""}>×100</option>
            </select>
            <div class="badge">花费：${makeCostText}</div>
            <button class="btn btn--primary" data-capture-action="makeBall" ${makeOk ? "" : "disabled"}>制作${makeQtyEff > 1 ? `×${makeQtyEff}` : ""}</button>
          </div>
        </div>
      `);

      if (autoBallUnlocked) {
        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">自动搓球</div>
              <div class="row__desc">开启后：当球果到上限时自动制作 1 个精灵球，直到精灵球到上限停止。</div>
            </div>
            <div class="row__right">
              <label class="check">
                <input type="checkbox" data-auto-ball-toggle ${autoBallOn ? "checked" : ""} />
                <span>开启</span>
              </label>
            </div>
          </div>
        `);
      } else {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">自动搓球</div>
              <div class="row__desc">在“未来币商店”解锁后可用。</div>
            </div>
            <div class="row__right">
              <div class="badge badge--muted">未解锁</div>
            </div>
          </div>
        `);
      }

      const encPid = typeof ui.encounterPid === "string" ? ui.encounterPid : null;
      const enc = encPid ? getSpeciesByPid(encPid) : null;
      const tierText = enc ? (enc.tier === "common" ? "常见" : enc.tier === "uncommon" ? "少见" : enc.tier === "rare" ? "稀有" : "史诗") : "";
      const encCaughtN = enc ? (typeof state.dex?.caught?.[enc.id] === "number" ? state.dex.caught[enc.id] : 0) : 0;
      const encSeen = Boolean(enc && encCaughtN > 0);
      const encIsShiny = Boolean(ui.encounterIsShiny);
      const encIsMythic = Boolean(enc && enc.tier === "epic");
      const autoEncOn = Boolean(ui.captureAutoEncounter);

      // 遭遇精灵的性格信息
      const encNatureId = typeof ui.encounterNature === "string" && ui.encounterNature ? ui.encounterNature : null;
      let encNatureHtml = "";
      if (enc && encNatureId) {
        const NATURES_MAP = {
          hardy:"勤奋",lonely:"孤僻",brave:"勇敢",adamant:"固执",naughty:"顽皮",
          bold:"大胆",docile:"坦率",relaxed:"悠闲",impish:"淘气",lax:"随和",
          timid:"胆小",hasty:"急躁",serious:"认真",jolly:"爽朗",naive:"天真",
          modest:"内敛",mild:"温和",quiet:"冷静",bashful:"害羞",rash:"鲁莽",
          calm:"温顺",gentle:"温柔",sassy:"自大",careful:"慎重",quirky:"浮躁",
        };
        const NATURE_PASSIVE_MAP = {
          adamant:"训练经验+5%",timid:"捕获省球(10%)",serious:"研究速度+3%",
          relaxed:"饱腹恢复+10%",impish:"远征时间-5%",jolly:"亲密度+5%",
          modest:"图鉴加成+2%",calm:"资源产量+3%",
        };
        const natName = NATURES_MAP[encNatureId] || encNatureId;
        const passive = NATURE_PASSIVE_MAP[encNatureId];
        encNatureHtml = `<span class="badge badge--nature">性格：${escapeHtml(natName)}${passive ? ` · ${escapeHtml(passive)}` : ""}</span>`;
      }

      const encCharges0 =
        typeof state.encounterCharges === "number" && Number.isFinite(state.encounterCharges) ? state.encounterCharges : 100;
      const encCharges = Math.max(0, Math.min(100, Math.floor(encCharges0)));
      const encCd0 = typeof state.encounterCdSec === "number" && Number.isFinite(state.encounterCdSec) ? state.encounterCdSec : 0;
      const encCd = Math.max(0, Math.ceil(encCd0));
      const encOk = !enc && encCharges > 0;

      const encText =
        encCharges >= 100 ? `遭遇 ${encCharges}/100` : encCd > 0 ? `遭遇 ${encCharges}/100（+1 ${fmtRemain(encCd)}）` : `遭遇 ${encCharges}/100`;

      const advCharges0 =
        typeof state.encounterPlusCharges === "number" && Number.isFinite(state.encounterPlusCharges) ? state.encounterPlusCharges : 1;
      const encPlusMaxBonus = typeof state.permanentBoosts?.encPlusMax === "number" ? Math.max(0, Math.min(20, Math.floor(state.permanentBoosts.encPlusMax))) : 0;
      const advMaxCharges = 10 + encPlusMaxBonus;
      const advCharges = Math.max(0, Math.min(advMaxCharges, Math.floor(advCharges0)));
      const advCd0 =
        typeof state.encounterPlusCdSec === "number" && Number.isFinite(state.encounterPlusCdSec) ? state.encounterPlusCdSec : 0;
      const advCd = Math.max(0, Math.ceil(advCd0));
      const advOk = !enc && advCharges > 0;

      const advText =
        advCharges >= advMaxCharges
          ? `高级遭遇 ${advCharges}/${advMaxCharges}`
          : advCd > 0
            ? `高级遭遇 ${advCharges}/${advMaxCharges}（+1 ${fmtRemain(advCd)}）`
            : `高级遭遇 ${advCharges}/${advMaxCharges}`;

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">遭遇</div>
            <div class="row__desc">${enc ? `你遇到了：${escapeHtml(enc.name)}（${tierText}）` : "点击遭遇开始搜寻宝可梦。"}</div>
          </div>
          <div class="row__right">
            ${enc ? `<div class="badge ${encSeen ? "badge--muted" : "badge--ok"}">${encSeen ? "已有" : "首次"}</div>` : ""}
            ${enc && encIsShiny ? `<div class="badge badge--ok">！！！闪光！！！</div>` : ""}
            ${enc && encIsMythic ? `<div class="badge badge--ok">！！！神兽！！！</div>` : ""}
            ${enc ? `<div class="badge">${renderPokemonIcon(enc.dex, enc.name, encIsShiny)} ${escapeHtml(enc.name)}</div>` : ""}
            ${encNatureHtml}
            <label class="check" style="margin-right:6px">
              <input type="checkbox" data-auto-encounter-toggle ${autoEncOn ? "checked" : ""} />
              <span>自动遭遇</span>
            </label>
            <button class="btn btn--primary" data-capture-action="encounter" ${encOk ? "" : "disabled"}>${encText}</button>
            <button class="btn btn--small" data-capture-action="encounterPlus" ${advOk ? "" : "disabled"}>${advText}</button>
            <button class="btn btn--small" data-capture-action="run" ${enc ? "" : "disabled"}>逃跑</button>
          </div>
        </div>
      `);

      const techEff2 = computeTechEffects();
      const add2 = typeof techEff2.catchChanceAdd === "number" ? techEff2.catchChanceAdd : 0;
      const fails2 = typeof state.rng?.catchFails === "number" ? state.rng.catchFails : 0;
      const pity2 = Math.min(0.02 * Math.max(0, Math.floor(fails2)), 0.2);
      const dragonRem2 =
        typeof state.skills?.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec)
          ? Math.max(0, state.skills.dragonCatchBoostRemainingSec)
          : 0;
      const dragonAdd2 = dragonRem2 > 0 ? 0.1 : 0;
      const mult2 = Math.max(0, 1 + add2 + dragonAdd2);
      const effChance = enc ? clamp(baseCatchChanceByDex(enc.dex) * mult2 + pity2, 0, 0.95) : 0;
      const pityText =
        fails2 > 0 && pity2 > 0
          ? `保底：失败 ${Math.max(0, Math.floor(fails2))} 次（+${Math.round(pity2 * 100)}%）`
          : "";
      const pbVal = Math.max(0, Math.floor(state.res.pokeball.value ?? 0));
      const pbCap = Math.max(0, Math.floor(state.res.pokeball.cap ?? 0));
      const ubVal = Math.max(0, Math.floor(state.res.ultraball?.value ?? 0));
      const qbVal = Math.max(0, Math.floor(state.res.quickball?.value ?? 0));
      const lbVal = Math.max(0, Math.floor(state.res.luxuryball?.value ?? 0));
      const mbVal = Math.max(0, Math.floor(state.res.masterball?.value ?? 0));
      
      // 当前选择的精灵球类型
      const selectedBall = ui.selectedBallType || "pokeball";
      
      const throwOk = Boolean(enc) && state.res[selectedBall]?.value >= 1;
      const throw10Ok = Boolean(enc) && state.res[selectedBall]?.value >= 10;
      const throw100Ok = Boolean(enc) && state.res[selectedBall]?.value >= 100;
      const autoThrowOn = Boolean(ui.captureAutoThrow);
      const mbOk = Boolean(enc) && mbVal >= 1;
      rows.push(`
        <div class="row ${enc ? "" : "is-locked"}">
          <div class="row__left">
            <div class="row__title">选择精灵球</div>
            <div class="row__desc">不同精灵球有不同效果。</div>
          </div>
          <div class="row__right">
            <select class="input" data-ball-selector ${enc ? "" : "disabled"}>
              <option value="pokeball" ${selectedBall === "pokeball" ? "selected" : ""}>精灵球 (${pbVal})</option>
              ${ubVal > 0 ? `<option value="ultraball" ${selectedBall === "ultraball" ? "selected" : ""}>高级球 (${ubVal}) - 捕获率x2</option>` : ""}
              ${qbVal > 0 ? `<option value="quickball" ${selectedBall === "quickball" ? "selected" : ""}>先机球 (${qbVal}) - 首次遭遇x5</option>` : ""}
              ${lbVal > 0 ? `<option value="luxuryball" ${selectedBall === "luxuryball" ? "selected" : ""}>豪华球 (${lbVal}) - 亲密度+20</option>` : ""}
            </select>
          </div>
        </div>
        <div class="row ${enc ? "" : "is-locked"}">
          <div class="row__left">
            <div class="row__title">投掷精灵球</div>
            <div class="row__desc">${enc ? `对 ${escapeHtml(enc.name)} 进行捕捉判定。` : "先遭遇一只宝可梦。"}</div>
          </div>
          <div class="row__right">
            ${enc ? `<div class="badge">成功率：${Math.round(effChance * 100)}%</div>` : ""}
            ${enc && pityText ? `<div class="badge">${escapeHtml(pityText)}</div>` : ""}
            <div class="badge">精灵球：${pbVal}/${pbCap}</div>
            ${mbVal > 0 ? `<div class="badge">大师球：${mbVal}</div>` : ""}
          </div>
        </div>
        <div class="row ${enc ? "" : "is-locked"}">
          <div class="row__left"></div>
          <div class="row__right">
            <button class="btn btn--primary" data-capture-action="throw" ${throwOk ? "" : "disabled"}>捕捉</button>
            ${mbVal > 0 ? `<button class="btn btn--small" data-capture-action="masterball" ${mbOk ? "" : "disabled"}>大师球捕捉</button>` : ""}
            <label class="check" style="margin-left:8px">
              <input type="checkbox" data-auto-throw-toggle ${autoThrowOn ? "checked" : ""} />
              <span>自动捕捉${autoThrowOn ? "（开）" : "（关）"}</span>
            </label>
          </div>
        </div>
      `);

      if (enc && Boolean(ui.shinyModalOpen) && encIsShiny) {
        rows.push(`
          <div class="modalOverlay" data-shiny-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">！！！闪光遭遇！！！</div>
                <div class="modal__right">
                  <button class="btn btn--small" data-shiny-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">你遇到了闪光宝可梦：${escapeHtml(enc.name)}（快抓！！）</div>
              <div class="modal__body">
                <div class="row">
                  <div class="row__left">
                    <div class="row__title">${escapeHtml(enc.name)}</div>
                    <div class="row__desc">${tierText}</div>
                  </div>
                  <div class="row__right">
                    <div class="badge badge--ok">！！！</div>
                    <div class="badge">${renderPokemonIcon(enc.dex, enc.name, true)} ${escapeHtml(enc.name)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `);
      }

      if (enc && Boolean(ui.mythicModalOpen) && encIsMythic) {
        rows.push(`
          <div class="modalOverlay" data-mythic-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">！！！神兽遭遇！！！</div>
                <div class="modal__right">
                  <button class="btn btn--small" data-mythic-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">你遇到了神兽：${escapeHtml(enc.name)}（0.5% 触发，快抓！！）</div>
              <div class="modal__body">
                <div class="row">
                  <div class="row__left">
                    <div class="row__title">${escapeHtml(enc.name)}</div>
                    <div class="row__desc">${tierText}</div>
                  </div>
                  <div class="row__right">
                    <div class="badge badge--ok">！！！</div>
                    <div class="badge">${renderPokemonIcon(enc.dex, enc.name, encIsShiny)} ${escapeHtml(enc.name)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `);
      }

      if (Boolean(ui.captureFcModalOpen)) {
        const need = Math.max(0, Math.floor(ui.captureFcNeed ?? 0));
        const action = escapeHtml(String(ui.captureFcAction || "") || "操作");
        const cur = Math.max(0, Math.floor(state.res.futurecoin?.value ?? 0));
        rows.push(`
          <div class="modalOverlay" data-capture-fc-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">未来币不足</div>
                <div class="modal__right">
                  <button class="btn btn--small" data-capture-fc-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">神兽领域：${action} 需要未来币 ${need}（当前 ${cur}）</div>
            </div>
          </div>
        `);
      }
    } else {
      rows.push(`
        <div class="row is-locked">
          <div class="row__left">
            <div class="row__title">捕捉</div>
            <div class="row__desc">研究“精灵球基础”后解锁。</div>
          </div>
          <div class="row__right">
            <div class="badge badge--muted">未解锁</div>
          </div>
        </div>
      `);
    }

    if (!freezeActions) {
      elCaptureActions.innerHTML = rows.join("");
    }
    ui.captureDirty = false;
  };
}
