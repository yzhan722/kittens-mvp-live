import { getEraDefById } from "../defs_eras.js";
import {
  canAdvanceEra,
  canPrestige,
  ensureEra,
  questLabel,
  syncEraQuests,
} from "../systems/era.js";
import { ensureLuckyDay, ensureLuckyWeek, luckyCatchMul, typeZh } from "../systems/gameplay_fun.js";
import { NATURE_PASSIVE } from "../mons.js";

const MUTATOR_LABELS = {
  berryYield_12: "树果 +12%",
  catchRate_6: "捕获 +6%",
  catchRate_3: "捕获 +3%",
  catchRate_4: "捕获 +4%",
  researchTime_m8: "研究加速 8%",
  researchTime_m10: "研究加速 10%",
  pokeballGain_10: "制球 +10%",
  encounterRefresh_fast: "遭遇恢复 +10%",
  pokeballCap_8: "精灵球上限 +8%",
  buildingYield_10: "建筑产出 +10%",
  researchCost_m8: "研究成本 -8%",
  fieldYield_10: "田地 +10%",
  shiny_micro: "闪光微升",
  rareWeight_micro: "稀有微升",
  allYield_5: "全产出 +5%",
};

const AREA_HINTS = {
  mythic: "传说/幻之宝可梦专属。每次遭遇或高级遭遇各消耗 100 未来币。",
  galar: "伽勒尔旷野：高编号精灵与少见个体。",
  alola: "阿罗拉海岛：地区特色精灵。",
};

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

    ensureEra(state);
    const era = syncEraQuests(state, getCaptureAreas);
    const eraDef = getEraDefById(era.id);
    const eraMainQuests = (era.quests || []).filter((q) => q.kind === "main");
    const eraAllDone = eraMainQuests.every((q) => q.done);
    const eraCanAdvance = canAdvanceEra(state, getCaptureAreas);
    const eraCanPrestige = canPrestige(state, getCaptureAreas);
    const eraQuestHtml = eraMainQuests
      .map((q) => `<div class="era-panel__quest ${q.done ? "is-done" : ""}">${escapeHtml(questLabel(q))}</div>`)
      .join("");
    const eraMutatorHtml = (era.mutatorsActive || [])
      .map((id) => MUTATOR_LABELS[id])
      .filter(Boolean)
      .map((label) => `<span class="badge">${escapeHtml(label)}</span>`)
      .join("");
    const eraActionHtml =
      era.index >= 8
        ? eraAllDone
          ? eraCanPrestige
            ? `<button type="button" class="btn btn--ghost btn--small" data-era-prestige>时空歪曲挑战</button>
               <div class="era-panel__done">已抵达悖论时空</div>`
            : `<div class="era-panel__done">已抵达悖论时空</div>`
          : ""
        : `<button type="button" class="btn btn--primary btn--small" data-era-advance ${eraCanAdvance ? "" : "disabled"}>迈入下一时代</button>`;
    const lucky = ensureLuckyDay(state);
    const week = ensureLuckyWeek(state);
    const streak = Math.max(0, Math.floor(state.fun?.catchStreak || 0));
    const streakBest = Math.max(0, Math.floor(state.fun?.catchStreakBest || 0));
    const luckyHtml =
      lucky?.type || week?.type
        ? `<div class="row" style="margin-bottom:8px">
          <div class="row__left">
            <div class="row__title">${
              lucky?.type ? `今日幸运 · ${escapeHtml(typeZh(lucky.type))}` : "幸运日程"
            }${week?.type ? ` · 本周主题 · ${escapeHtml(typeZh(week.type))}` : ""}</div>
            <div class="row__desc">${
              lucky?.type ? "今日属性捕获 ×1.1。" : ""
            }${week?.type ? " 本周主题属性遭遇更常见（×1.35）。" : ""} 野外约 0.2% 神兽乱入。${
              streak > 0
                ? ` 连捕 ×${streak}${streakBest > streak ? `（纪录 ${streakBest}）` : ""}`
                : streakBest > 0
                  ? ` 连捕纪录 ${streakBest}`
                  : ""
            }</div>
          </div>
        </div>`
        : "";

    const eraPanelHtml = `
      <div class="era-panel">
        <div class="era-panel__title">时代 · ${escapeHtml(eraDef.name)}</div>
        ${eraDef.blurb ? `<div class="row__desc">${escapeHtml(eraDef.blurb)}</div>` : ""}
        ${eraMutatorHtml ? `<div class="era-panel__mutators">${eraMutatorHtml}</div>` : ""}
        <div class="era-panel__quests">${eraQuestHtml}</div>
        <div class="era-panel__action">${eraActionHtml}</div>
      </div>
    `;

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
    const lockedAreas = areas.filter((a) => !a.unlocked);
    const nextArea = lockedAreas.slice().sort((a, b) => a.unlockReq - b.unlockReq)[0] || null;
    const restLocked = lockedAreas.filter((a) => nextArea && a.id !== nextArea.id);
    const fmtLock = (a) => {
      const need = a.unlockReq;
      const left = Math.max(0, need - unique);
      const pct = Math.min(1, unique / need);
      const filled = Math.round(pct * 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);
      const nearUnlock = pct >= 0.9 && pct < 1;
      const suffix = nearUnlock ? " · 即将解锁" : left > 0 ? ` · 还差 ${left} 种` : "";
      return `${a.name}  [${bar}] ${unique}/${need}${suffix}`;
    };
    const showAllLocked = Boolean(ui.captureShowAllLocked);
    let lockHtml = "";
    if (nextArea) {
      const needLeft = Math.max(0, nextArea.unlockReq - unique);
      const nextHint =
        nextArea.id === "mythic"
          ? "登记足够图鉴后解锁神兽领域，可定向遭遇传说/幻之宝可梦（每次 100 未来币）。"
          : needLeft > 0
            ? `再登记 ${needLeft} 种独特图鉴即可解锁「${nextArea.name}」。`
            : "";
      lockHtml = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">下一区域</div>
            <div class="row__desc">${escapeHtml(fmtLock(nextArea))}</div>
            ${nextHint ? `<div class="row__desc muted">${escapeHtml(nextHint)}</div>` : ""}
            ${
              restLocked.length
                ? `<button type="button" class="btn btn--ghost btn--small" data-capture-locked-toggle>${
                    showAllLocked ? "收起其他地区" : `展开其他 ${restLocked.length} 个地区`
                  }</button>`
                : ""
            }
            ${
              showAllLocked && restLocked.length
                ? `<pre class="pre">${escapeHtml(restLocked.map(fmtLock).join("\n"))}</pre>`
                : ""
            }
          </div>
        </div>`;
    } else if (lockedAreas.length === 0) {
      lockHtml = `
        <div class="row">
          <div class="row__left">
            <div class="row__title">区域进度</div>
            <div class="row__desc hint hint--ok">全部捕捉区域已解锁</div>
          </div>
        </div>`;
    }

    const areaHint = AREA_HINTS[area.id] ?? (area.id === "mythic" ? AREA_HINTS.mythic : "");
    const poolEmptyHint = pool.length === 0 ? "本区域暂无可遭遇精灵，请切换其他区域或推进时代。" : "";
    const tierSummary = `常见 ${counts.common} · 少见 ${counts.uncommon} · 稀有 ${counts.rare} · 史诗 ${counts.epic}`;

    elCaptureInfo.innerHTML = `
      ${eraPanelHtml}
      ${luckyHtml}
      <div class="row">
        <div class="row__left">
          <div class="row__title">当前区域</div>
          <div class="row__desc">${escapeHtml(area.name)} · 池子 ${pool.length} 种（${escapeHtml(tierSummary)}）</div>
          ${poolEmptyHint ? `<div class="row__desc hint hint--danger">${escapeHtml(poolEmptyHint)}</div>` : ""}
          ${areaHint ? `<div class="row__desc hint">${escapeHtml(areaHint)}</div>` : ""}
        </div>
        <div class="row__right">
          ${isMobile && preview ? `<button class="btn btn--ghost btn--small" data-capture-preview-toggle>${previewHiddenEffective ? "显示预览" : "隐藏预览"}</button>` : ""}
        </div>
      </div>
      ${preview && !previewHiddenEffective ? `<div class="row"><div class="row__left"><div class="row__title">本区域预览</div></div><div class="row__right" style="justify-content:flex-start;flex:1 1 auto;width:100%;"><div class="iconGrid iconGrid--full">${preview}</div></div></div>` : ""}
      ${lockHtml}
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

      const encPidEarly = typeof ui.encounterPid === "string" ? ui.encounterPid : null;
      const encEarly = encPidEarly ? getSpeciesByPid(encPidEarly) : null;
      const toolRows = [];

      toolRows.push(`
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
        toolRows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">自动搓球</div>
              <div class="row__desc">球果满时自动制作 1 个精灵球，直到精灵球满。</div>
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
        toolRows.push(`
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

      if (!encEarly) {
        const startDesc = pool.length === 0
          ? "当前区域池子为空，请切换区域后再遭遇。"
          : area.id === "mythic"
            ? "神兽领域：遭遇/高级遭遇各消耗 100 未来币，定向传说与幻之宝可梦。"
            : "点遭遇搜寻精灵，遇到后再选球捕捉。制球与自动化可展开。";
        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">开始捕捉</div>
              <div class="row__desc">${escapeHtml(startDesc)}</div>
            </div>
          </div>
        `);
        rows.push(`<details class="capture-tools"><summary class="capture-tools__summary">制球与自动化</summary>${toolRows.join("")}</details>`);
      } else {
        rows.push(...toolRows);
      }

      const encPid = encPidEarly;
      const enc = encEarly;
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
        const NATURE_PASSIVE_MAP = Object.fromEntries(
          Object.entries(NATURE_PASSIVE).map(([id, p]) => [id, p.desc])
        );
        const natName = NATURES_MAP[encNatureId] || encNatureId;
        const passive = NATURE_PASSIVE_MAP[encNatureId];
        encNatureHtml = `<span class="badge badge--nature">性格：${escapeHtml(natName)}${passive ? ` · ${escapeHtml(passive)}` : ""}</span>`;
      }

      const encCharges0 =
        typeof state.encounterCharges === "number" && Number.isFinite(state.encounterCharges) ? state.encounterCharges : 100;
      const encCharges = Math.max(0, Math.min(100, Math.floor(encCharges0)));
      const encCd0 = typeof state.encounterCdSec === "number" && Number.isFinite(state.encounterCdSec) ? state.encounterCdSec : 0;
      const encCd = Math.max(0, Math.ceil(encCd0));
      const encOk = !enc && encCharges > 0 && pool.length > 0;

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
      const advOk = !enc && advCharges > 0 && pool.length > 0;

      const advText =
        advCharges >= advMaxCharges
          ? `高级遭遇 ${advCharges}/${advMaxCharges}`
          : advCd > 0
            ? `高级遭遇 ${advCharges}/${advMaxCharges}（+1 ${fmtRemain(advCd)}）`
            : `高级遭遇 ${advCharges}/${advMaxCharges}`;

      const nearMissActive = Boolean(enc && ui.lastCatchNearMiss?.pid === enc.id);

      rows.push(`
        <div class="row${nearMissActive ? " capture-near-miss" : ""}">
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
      let ballMult2 = 1;
      const selectedBallPreview = ui.selectedBallType || "pokeball";
      if (selectedBallPreview === "ultraball") ballMult2 = 2;
      else if (selectedBallPreview === "quickball" && enc) {
        const caughtN = caughtMap && typeof caughtMap[enc.id] === "number" ? caughtMap[enc.id] : 0;
        ballMult2 = caughtN === 0 ? 5 : 1;
      }
      const localTypes = globalThis.POKEMON_TYPES;
      const encTypes = enc && localTypes && typeof localTypes === "object" ? localTypes[enc.dex] : null;
      const luckyMul2 = enc ? luckyCatchMul(state, encTypes) : 1;
      const effChance = enc
        ? clamp(baseCatchChanceByDex(enc.dex) * mult2 * ballMult2 * luckyMul2 + pity2, 0, 0.95)
        : 0;
      const pityPctFill = Math.min(1, pity2 / 0.2);
      const pityBarFilled = Math.round(pityPctFill * 10);
      const pityBar = "█".repeat(pityBarFilled) + "░".repeat(10 - pityBarFilled);
      const pityText =
        fails2 > 0
          ? `保底 [${pityBar}] 失败 ${Math.max(0, Math.floor(fails2))} 次 · +${Math.round(pity2 * 100)}%（上限 20%）`
          : `保底 [${pityBar}] 连续失败可提升捕获率（上限 +20%）`;
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
            ${enc && ui.lastCatchNearMiss?.pid === enc.id ? `<div class="badge badge--warning">差一点！上次约 ${ui.lastCatchNearMiss.pct}%</div>` : ""}
            <div class="badge">${escapeHtml(pityText)}</div>
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
              <div class="modal__desc">你遇到了神兽：${escapeHtml(enc.name)}（约 0.2% 乱入，快抓！！）</div>
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
