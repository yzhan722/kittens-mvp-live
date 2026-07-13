import { EXP_LEVELS, getExpLevelDef } from "../expedition_defs.js";
import {
  applyQuickExpeditionDuration,
  applyQuickExpeditionReward,
  ensureExpeditionDungeonTiers,
  expeditionTypeMul,
  getExpeditionSeasonBlurb,
  getMonTypesForExpedition,
  pickExpeditionDungeons,
  resolveExpeditionSeasonLabel,
  resolveSeasonId,
} from "../systems/expedition.js";
import { expeditionNatureTimeMul, natureTrainExpMul, expeditionDailyProgress, markExpeditionDailyClaimed, localDateStr } from "../systems/gameplay_fun.js";
import { seasonRelicLines } from "../systems/collection_fun.js";
import { getAbilityInfo, monPassive } from "../abilities.js";

export function createRenderFunctions({
  elFunctionsTraining,
  ui,
  TYPE_ZH,
  getPokeApiDataByDex,
  clamp,
  escapeHtml,
  fmtDuration,
  expNeedForLevel0,
  monPower,
  renderPokemonIcon,
  markFunctionsDirty,
  markMonListDirty,
  addLog,
  render,
  getState,
}) {
  return function renderFunctions() {
    if (!elFunctionsTraining) return;
    if (ui.activeTab !== "functions") return;
    if (!ui.functionsDirty) return;
    if (ui.functionsFocus) return;

    const state = typeof getState === "function" ? getState() : null;
    if (!state || typeof state !== "object") return;

    let prevPageScrollY = 0;
    let prevTrainModalBodyScrollTop = 0;
    let prevBreedModalBodyScrollTop = 0;
    let prevExpTeamModalBodyScrollTop = 0;
    let prevFocusKind = "";
    let prevFocusStart = null;
    let prevFocusEnd = null;
    try {
      prevPageScrollY = typeof window !== "undefined" ? (window.scrollY || 0) : 0;
      const prevBody = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (prevBody) prevTrainModalBodyScrollTop = prevBody.scrollTop;
      const prevBreedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (prevBreedBody) prevBreedModalBodyScrollTop = prevBreedBody.scrollTop;
      const prevExpTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (prevExpTeamBody) prevExpTeamModalBodyScrollTop = prevExpTeamBody.scrollTop;

      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae instanceof HTMLElement && elFunctionsTraining.contains(ae)) {
        if (ae.matches('input[data-train-modal-q]')) prevFocusKind = "train";
        else if (ae.matches('input[data-breed-modal-q]')) prevFocusKind = "breed";
        if (prevFocusKind) {
          const inp = ae;
          prevFocusStart = typeof inp.selectionStart === "number" ? inp.selectionStart : null;
          prevFocusEnd = typeof inp.selectionEnd === "number" ? inp.selectionEnd : null;
        }
      }
    } catch {
    }

    const list = state.mons?.list ?? [];
    if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
    if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
    const slotSize =
      typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
        ? Math.max(0, Math.floor(state.training.slotSize))
        : 0;

    const active = state.training.activeIds
      .map((id) => list.find((m) => m && m.id === id) ?? null)
      .filter((x) => x);

    const rows = [];

    const hideTraining = Boolean(ui.functionsHideTraining);
    const statusExpOn = Boolean(state.expedition?.on);
    const statusExpRem =
      statusExpOn && typeof state.expedition?.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
        ? Math.max(0, state.expedition.remainingSec)
        : 0;
    const trainN = active.length;
    const trainExpTotal = Math.max(0, Math.floor(state.meta?.trainingExpGained || 0));
    const statusBits = [];
    if (trainN > 0) statusBits.push(`训练中 ${trainN} 只`);
    if (statusExpOn) statusBits.push(`远征剩余 ${fmtDuration(statusExpRem)}`);
    else if (Math.max(0, Math.floor(state.meta?.expeditionsCompleted || 0)) > 0) {
      statusBits.push(`远征已完成 ${Math.floor(state.meta.expeditionsCompleted)} 次`);
    }
    if (trainExpTotal > 0) statusBits.push(`累计训练经验 ${trainExpTotal}`);
    const expDaily = expeditionDailyProgress(state, localDateStr());
    const expDailyDesc = expDaily.claimed
      ? "今日远征任务已领"
      : expDaily.done
        ? "今日远征完成 → 可领 +10 未来币"
        : "今日远征任务：完成 1 次远征 → +10 未来币";
    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">功能摘要</div>
          <div class="row__desc">${statusBits.length ? escapeHtml(statusBits.join(" · ")) : "派遣训练或远征后，回来这里看进度与收获。"}</div>
          <div class="row__desc">${escapeHtml(expDailyDesc)}</div>
        </div>
        <div class="row__right">
          <button type="button" class="btn btn--primary btn--small" data-func-exp-daily-claim ${expDaily.canClaim ? "" : "disabled"}>${expDaily.claimed ? "已领" : "领取 +10"}</button>
        </div>
      </div>
    `);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">训练场</div>
          <div class="row__desc">训练中的精灵：经验获取 ×10，饱腹度消耗 ×2。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="training">${hideTraining ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    if (!hideTraining) {
      if (slotSize < 1) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“训练场”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length === 0) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">暂无精灵</div>
              <div class="row__desc">先去捕捉一只吧。</div>
            </div>
          </div>
        `);
      } else {
        const trainingSet = new Set(active.map((m) => m.id));
        const used = active.length;
        const canTrainStart = used < slotSize;

        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">选择精灵</div>
              <div class="row__desc">槽位：${used} / ${slotSize}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary" data-train-open ${canTrainStart ? "" : "disabled"}>选择训练精灵</button>
            </div>
          </div>
        `);

        if (active.length > 0) {
          for (const m of active) {
            const sat = Math.floor(clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100));
            const exp = Math.max(0, Math.floor(typeof m.exp === "number" && Number.isFinite(m.exp) ? m.exp : 0));
            const needExp = m.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(m.lvl)));
            const expText = needExp > 0 ? `${exp}/${needExp}` : `${exp}/MAX`;
            const nMul = natureTrainExpMul(m, active.length);
            const pass = monPassive(m);
            const abName = getAbilityInfo(m.ability)?.name || pass?.desc || "";
            const nHint =
              nMul > 1
                ? ` · 特性「${escapeHtml(abName)}」经验×${nMul.toFixed(2)}`
                : pass
                  ? ` · 特性「${escapeHtml(getAbilityInfo(m.ability)?.name || "")}」`
                  : "";
            rows.push(`
              <div class="row">
                <div class="row__left">
                  <div class="row__title">训练中：${escapeHtml(m.name)} <span class="row__desc">Lv.${m.lvl} · 饱腹${sat}/100 · 经验${expText}${nHint}</span></div>
                </div>
                <div class="row__right">
                  <button class="btn btn--small" data-train-feed="${m.id}" ${sat >= 100 ? "disabled" : ""}>喂食</button>
                  <button class="btn btn--danger btn--small" data-train-cancel="${m.id}">取消训练</button>
                </div>
              </div>
            `);
          }
        }
      }
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideBreeding = Boolean(ui.functionsHideBreeding);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">饲养屋</div>
          <div class="row__desc">饲养中的精灵：经验获取 ×50，饱腹度每分钟 +1（至 100），消耗树果 10/秒。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="breeding">${hideBreeding ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const breedingUnlocked = (state.buildings?.breedingHouse?.owned ?? 0) > 0;
    if (!state.breeding || typeof state.breeding !== "object") {
      state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
    }
    const breedingOn = Boolean(state.breeding.on);

    if (!hideBreeding) {
      if (!breedingUnlocked) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“饲养屋”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length < 2) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">精灵不足</div>
              <div class="row__desc">至少需要 2 只精灵才能开始饲养。</div>
            </div>
          </div>
        `);
      } else {
        if (!breedingOn) {
          rows.push(`
            <div class="row">
              <div class="row__left">
                <div class="row__title">选择精灵</div>
                <div class="row__desc">选择两只精灵开始饲养（同进化链或百变怪会自动生蛋）。</div>
              </div>
              <div class="row__right">
                <button class="btn btn--primary" data-breed-open>选择饲养精灵</button>
              </div>
            </div>
          `);
        }

        const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
        const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
        const aMon = typeof aId === "number" ? list.find((m) => m && m.id === aId) ?? null : null;
        const bMon = typeof bId === "number" ? list.find((m) => m && m.id === bId) ?? null : null;

        if (breedingOn) {
          const rem =
            typeof state.breeding.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec)
              ? Math.max(0, state.breeding.eggRemainingSec)
              : 0;
          const lvl = clamp(state.buildings?.breedingHouse?.owned ?? 0, 0, 10);
          const eggText = rem > 0 ? `正在生蛋：剩余 ${fmtDuration(rem)}（饲养屋 Lv.${lvl}）` : "未在生蛋";

          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">饲养中</div>
            <div class="row__desc">${eggText}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
          </div>
        </div>
      `);

          if (aMon) {
            const satA = Math.floor(clamp(typeof aMon.satiety === "number" ? aMon.satiety : 100, 0, 100));
            const expA = Math.max(0, Math.floor(typeof aMon.exp === "number" && Number.isFinite(aMon.exp) ? aMon.exp : 0));
            const needExpA = aMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(aMon.lvl)));
            const expTextA = needExpA > 0 ? `${expA}/${needExpA}` : `${expA}/MAX`;
            rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">饲养精灵 A：${escapeHtml(aMon.name)} <span class="row__desc">Lv.${aMon.lvl} · 饱腹${satA}/100 · 经验${expTextA}</span></div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
          if (bMon) {
            const satB = Math.floor(clamp(typeof bMon.satiety === "number" ? bMon.satiety : 100, 0, 100));
            const expB = Math.max(0, Math.floor(typeof bMon.exp === "number" && Number.isFinite(bMon.exp) ? bMon.exp : 0));
            const needExpB = bMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(bMon.lvl)));
            const expTextB = needExpB > 0 ? `${expB}/${needExpB}` : `${expB}/MAX`;
            rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">饲养精灵 B：${escapeHtml(bMon.name)} <span class="row__desc">Lv.${bMon.lvl} · 饱腹${satB}/100 · 经验${expTextB}</span></div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
        }
      }
    }

    const TYPE_ZH_MAP = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS_UI = Object.keys(TYPE_ZH_MAP);
    const monRegionByDex = (dex) => {
      const d = typeof dex === "number" && Number.isFinite(dex) ? Math.floor(dex) : 0;
      if (d >= 1 && d <= 151) return "kanto";
      if (d >= 152 && d <= 251) return "johto";
      if (d >= 252 && d <= 386) return "hoenn";
      if (d >= 387 && d <= 493) return "sinnoh";
      if (d >= 494 && d <= 649) return "unova";
      if (d >= 650 && d <= 721) return "kalos";
      if (d >= 722 && d <= 809) return "alola";
      if (d >= 810 && d <= 905) return "galar";
      return "other";
    };
    const regionLabel = (k) => {
      if (k === "kanto") return "关都";
      if (k === "johto") return "城都";
      if (k === "hoenn") return "丰缘";
      if (k === "sinnoh") return "神奥";
      if (k === "unova") return "合众";
      if (k === "kalos") return "卡洛斯";
      if (k === "alola") return "阿罗拉";
      if (k === "galar") return "伽勒尔";
      return "其他";
    };
    const getMonTypesSimple = (m) => {
      const localTypes = globalThis.POKEMON_TYPES;
      if (localTypes && typeof localTypes === "object") {
        const lt = localTypes[m.dex];
        if (Array.isArray(lt) && lt.length > 0) return lt;
      }
      const api = getPokeApiDataByDex(m.dex);
      const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
      return types.filter((x) => typeof x === "string");
    };
    const sortMons = (arr, sortKey, dir0) => {
      const k = sortKey === "lvl" || sortKey === "dex" || sortKey === "power" ? sortKey : "power";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : "desc";
      const dirMul = dir === "asc" ? 1 : -1;
      const withPower = arr.map((m) => ({ m, p: monPower(m) }));
      const cmpAsc = (a, b) => {
        if (k === "dex") return (a.m.dex ?? 0) - (b.m.dex ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0);
        if (k === "lvl") return (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
        return (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
      };
      withPower.sort((a, b) => dirMul * cmpAsc(a, b));
      return withPower.map((x) => x.m);
    };

    let trainingModalHtml = "";
    if (ui.trainingModalOpen) {
      const trainingSet = new Set(active.map((m) => m.id));
      const used = active.length;
      const capLeft = Math.max(0, slotSize - used);
      const allCandidates = list.filter((m) => m && !trainingSet.has(m.id));

      const q0 = typeof ui.trainingModalQuery === "string" ? ui.trainingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.trainingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.trainingModalRegion === "string" ? ui.trainingModalRegion : "all";
      const region = ["all", "kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.trainingModalType === "string" ? ui.trainingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.trainingModalSort === "string" ? ui.trainingModalSort : "power";
      const sort = ["power", "lvl", "dex"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.trainingModalSortDir === "string" ? ui.trainingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.trainingModalSortDir) ui.trainingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, capLeft);
      ui.trainingModalSelectedIds = sel;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "kanto", n: "关都" },
        { k: "johto", n: "城都" },
        { k: "hoenn", n: "丰缘" },
        { k: "sinnoh", n: "神奥" },
        { k: "unova", n: "合众" },
        { k: "kalos", n: "卡洛斯" },
        { k: "alola", n: "阿罗拉" },
        { k: "galar", n: "伽勒尔" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          return `
            <div class="row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderPokemonIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)} Lv.${m.lvl}</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-train-modal-check="${m.id}" ${checked ? "checked" : ""} ${capLeft <= 0 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `训练：选择精灵（剩余槽位 ${capLeft}）`;
      const sub = `支持筛选/排序与多选，点击“开始训练”后会直接加入训练。`;
      const empty = sorted.length === 0 ? `<div class="badge badge--muted">暂无可选精灵</div>` : "";
      const disabledReason = capLeft <= 0 ? `<div class="badge badge--muted">训练槽位已满</div>` : "";
      const canConfirm = capLeft > 0 && sel.length > 0;

      trainingModalHtml = `
        <div class="modalOverlay" data-train-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${escapeHtml(title)}</div>
              <div class="modal__right">
                <button class="btn btn--primary btn--small" data-train-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始训练</button>
                <button class="btn btn--small" data-train-modal-clear="1">清空</button>
                <button class="btn btn--small" data-train-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row">
                <div class="row__left">
                  <div class="row__title">筛选/排序</div>
                  <div class="row__desc">已选：${sel.length} / ${capLeft}</div>
                </div>
                <div class="row__right">
                  <select class="input" data-train-modal-region>${regionOptions}</select>
                  <select class="input" data-train-modal-type>${typeOptions}</select>
                  <select class="input" data-train-modal-sort>${sortOptions}</select>
                  <select class="input" data-train-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-train-modal-q />
                </div>
              </div>
              ${disabledReason}
              ${empty}
              ${candidateRows}
            </div>
          </div>
        </div>
      `;
    }

    let breedingModalHtml = "";
    if (ui.breedingModalOpen) {
      const allCandidates = list.filter((m) => m);

      const q0 = typeof ui.breedingModalQuery === "string" ? ui.breedingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.breedingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.breedingModalRegion === "string" ? ui.breedingModalRegion : "all";
      const region = ["all", "kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.breedingModalType === "string" ? ui.breedingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.breedingModalSort === "string" ? ui.breedingModalSort : "power";
      const sort = ["power", "lvl", "dex"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.breedingModalSortDir === "string" ? ui.breedingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.breedingModalSortDir) ui.breedingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, 2);
      ui.breedingModalSelectedIds = sel;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "kanto", n: "关都" },
        { k: "johto", n: "城都" },
        { k: "hoenn", n: "丰缘" },
        { k: "sinnoh", n: "神奥" },
        { k: "unova", n: "合众" },
        { k: "kalos", n: "卡洛斯" },
        { k: "alola", n: "阿罗拉" },
        { k: "galar", n: "伽勒尔" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          return `
            <div class="row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderPokemonIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)} Lv.${m.lvl}</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-breed-modal-check="${m.id}" ${checked ? "checked" : ""} ${sel.length >= 2 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `饲养：选择精灵（需要 2 只）`;
      const sub = `支持筛选/排序与多选（最多 2 只），点击“开始饲养”后会直接开始。`;
      const empty = sorted.length === 0 ? `<div class="badge badge--muted">暂无可选精灵</div>` : "";
      const canConfirm = sel.length === 2;

      breedingModalHtml = `
        <div class="modalOverlay" data-breed-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${escapeHtml(title)}</div>
              <div class="modal__right">
                <button class="btn btn--small" data-breed-modal-clear="1">清空</button>
                <button class="btn btn--small" data-breed-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row">
                <div class="row__left">
                  <div class="row__title">筛选/排序</div>
                  <div class="row__desc">已选：${sel.length} / 2</div>
                </div>
                <div class="row__right">
                  <select class="input" data-breed-modal-region>${regionOptions}</select>
                  <select class="input" data-breed-modal-type>${typeOptions}</select>
                  <select class="input" data-breed-modal-sort>${sortOptions}</select>
                  <select class="input" data-breed-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-breed-modal-q />
                </div>
              </div>
              ${empty}
              ${candidateRows}
            </div>
            <div class="actions">
              <button class="btn btn--primary" data-breed-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始饲养</button>
            </div>
          </div>
        </div>
      `;
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideExpedition = Boolean(ui.functionsHideExpedition);
    const expeditionSeasonLabel = resolveExpeditionSeasonLabel(ui.remoteConfig);
    const expeditionSeasonBlurb = getExpeditionSeasonBlurb(resolveSeasonId(ui.remoteConfig));
    const relicLines = seasonRelicLines(state);
    const relicDesc =
      relicLines.length > 0
        ? `本季印记：${relicLines.map((r) => `${r.name}×${r.count}`).join(" · ")}`
        : "本季印记：尚未获得（远征完成有概率掉落独特印记道具）";

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">远征所 <span class="muted">· ${escapeHtml(expeditionSeasonLabel)}</span></div>
          <div class="row__desc">${escapeHtml(expeditionSeasonBlurb)}。派遣精灵下副本：完成后获得经验与未来币，并概率掉落药剂。属性克制可提高远征收益。</div>
          <div class="row__desc">${escapeHtml(relicDesc)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="expedition">${hideExpedition ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
    const expeditionUnlocked = postLvl > 0;
    if (!state.expedition || typeof state.expedition !== "object") {
      state.expedition = {
        on: false,
        selectedLevel: "basic",
        selectedDungeonKey: null,
        selectedIds: [],
        activeIds: [],
        remainingSec: 0,
        totalSec: 0,
        rewardExp: 0,
        rewardCoin: 0,
        rewardPotionTotal: 0,
        dungeonType: null,
        dungeons: null,
      };
    }
    if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
    if (!Array.isArray(state.expedition.activeIds)) state.expedition.activeIds = [];

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;

    const typeMap = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS = Object.keys(typeMap);
    const getMonTypes = (m) => getMonTypesForExpedition(m, getPokeApiDataByDex);
    const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getPokeApiDataByDex);
    const expeditionRewardMul = (mons, dungeonType) => {
      if (!Array.isArray(mons) || mons.length === 0) return 1;
      const avg = mons.reduce((acc, m) => acc + typeMul(m, dungeonType), 0) / mons.length;
      return clamp(avg, 0.75, 1.5);
    };

    const regenAllDungeons = () => {
      if (!Array.isArray(TYPE_KEYS) || TYPE_KEYS.length === 0) return;
      const dungeons = {};
      for (const lvl of EXP_LEVELS) dungeons[lvl.key] = pickExpeditionDungeons(TYPE_KEYS);
      state.expedition.dungeons = dungeons;
    };

    if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
      regenAllDungeons();
    } else {
      ensureExpeditionDungeonTiers(state.expedition.dungeons, TYPE_KEYS);
    }

    const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
    const lvlDef = getExpLevelDef(selLvl);

    const levelOptions = EXP_LEVELS.map((x) => {
      const unlocked = postLvl >= x.unlockLvl;
      const sel = selLvl === x.key;
      return `<option value="${x.key}" ${sel ? "selected" : ""} ${unlocked ? "" : "disabled"}>${x.name}${unlocked ? "" : "（未解锁）"}</option>`;
    }).join("");

    if (!hideExpedition) {
      if (!expeditionUnlocked) {
        const trainOk = (state.buildings.trainingGround?.owned ?? 0) > 0;
        const breedOk = (state.buildings.breedingHouse?.owned ?? 0) > 0;
        const chainHint = trainOk && breedOk
          ? "训练场与饲养屋已就绪，在「建筑」页建造远征所即可解锁。"
          : "需先建造训练场与饲养屋，再建造远征所。";
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">${escapeHtml(chainHint)}</div>
            </div>
          </div>
        `);
      } else {
        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">远征等级</div>
          <div class="row__desc">远征所等级：Lv.${postLvl}</div>
        </div>
        <div class="row__right">
          <select class="input" data-exp-lvl ${expOn ? "disabled" : ""}>${levelOptions}</select>
        </div>
      </div>
    `);

        const dungeons = state.expedition.dungeons?.[selLvl];
        const dlist = Array.isArray(dungeons) ? dungeons : [];
        if (!state.expedition.selectedDungeonKey || !dlist.some((x) => x.key === state.expedition.selectedDungeonKey)) {
          state.expedition.selectedDungeonKey = dlist[0]?.key ?? null;
        }
        const dungeonObj = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
        const dungeonType = dungeonObj?.type ?? null;

        for (const d of dlist) {
          const zh = typeMap[d.type] ?? d.type;
          const selected = d.key === state.expedition.selectedDungeonKey;
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${escapeHtml(zh)}副本</div>
            <div class="row__desc">战力需求：${lvlDef.req}</div>
          </div>
          <div class="row__right">
            <div class="badge ${selected ? "badge--ok" : ""}">${selected ? "已选择" : ""}</div>
            <button class="btn btn--small" data-exp-dungeon="${escapeHtml(d.key)}" ${expOn ? "disabled" : ""}>选择</button>
          </div>
        </div>
      `);
        }

        const selectedIds0 = state.expedition.selectedIds.slice(0, 20);
        const selectedIds1 = selectedIds0.filter((id) => {
          const m = list.find((x) => x && x.id === id) ?? null;
          if (!m) return false;
          const cd0 =
            typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
              ? Math.max(0, m.skillCdRemainingSec)
              : 0;
          return cd0 <= 0;
        });
        state.expedition.selectedIds = selectedIds1;
        const selectedIds = selectedIds1;
        const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id) ?? null).filter((x) => x);

        const selectedSet = new Set(selectedIds);

        let expTeamModalHtml = "";

        const effPower = selectedMons.reduce((acc, m) => acc + monPower(m) * typeMul(m, dungeonType), 0);
        const canStartExp = !expOn && selectedMons.length > 0 && effPower >= lvlDef.req;
        const baseSec = 7200;
        const excessPct = canStartExp ? Math.max(0, (effPower - lvlDef.req) / lvlDef.req) : 0;
        const natureTimeMul = expeditionNatureTimeMul(selectedMons);
        const totalSec = canStartExp
          ? Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul))
          : baseSec;
        const rewardMul = expeditionRewardMul(selectedMons, dungeonType);
        const natureHint =
          natureTimeMul < 0.999
            ? ` · 性格加速 ×${(1 / natureTimeMul).toFixed(2)}`
            : "";
        const rewardExp = Math.floor(lvlDef.exp * rewardMul);
        const rewardCoin = Math.floor(lvlDef.coin * rewardMul);

        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">远征队伍</div>
          <div class="row__desc">已选：${selectedMons.length} / 20 · 总战力：${Math.floor(effPower)} / ${lvlDef.req} · 预计用时：${fmtDuration(totalSec)}${natureHint} · 属性相性 x${rewardMul.toFixed(2)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-exp-team-open ${expOn ? "disabled" : ""}>选择队员</button>
          <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
        </div>
      </div>
    `);

        if (ui.expeditionTeamModalOpen) {
          const filter0 = typeof ui.expeditionTeamTypeFilter === "string" ? ui.expeditionTeamTypeFilter : "all";
          const filter = filter0 && (filter0 === "all" || TYPE_KEYS.includes(filter0)) ? filter0 : "all";
          if (filter !== ui.expeditionTeamTypeFilter) ui.expeditionTeamTypeFilter = filter;

          const typeOptions = [
            `<option value="all" ${filter === "all" ? "selected" : ""}>全部属性</option>`,
            ...TYPE_KEYS.map((k) => `<option value="${k}" ${filter === k ? "selected" : ""}>${escapeHtml(typeMap[k] ?? k)}</option>`),
          ].join("");

          const candidates = list.filter((m) => {
            const cd0 =
              typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
                ? Math.max(0, m.skillCdRemainingSec)
                : 0;
            return cd0 <= 0;
          });

          const candidates1 = filter === "all" ? candidates : candidates.filter((m) => getMonTypes(m).includes(filter));

          const candidateWithPower = candidates1
            .map((m) => ({ m, effPower: monPower(m) * typeMul(m, dungeonType) }))
            .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0));

          if (ui.expeditionTeamAutoPick) {
            ui.expeditionTeamAutoPick = false;
            state.expedition.selectedIds = candidateWithPower.slice(0, 20).map((x) => x.m.id);
          }

          const selNow = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : [];
          const selSetNow = new Set(selNow);

          const candidateRows = candidateWithPower
            .map(({ m, effPower }) => {
              const checked = selSetNow.has(m.id);
              const power = Math.floor(effPower);
              const mul = typeMul(m, dungeonType);
              const disabled = expOn || (!checked && selNow.length >= 20);
              const rightText = expOn ? "远征中" : "";
              return `
            <div class="row">
              <div class="row__left">
                <div class="row__title">${escapeHtml(m.name)}</div>
                <div class="row__desc">Lv.${m.lvl} · 战力 ${power} · 属性相性 x${mul.toFixed(2)}${rightText ? ` · ${escapeHtml(rightText)}` : ""}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-exp-team-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
              </div>
            </div>
          `;
            })
            .join("");

          expTeamModalHtml = `
        <div class="modalOverlay" data-exp-team-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">选择远征队员</div>
              <div class="modal__right">
                <select class="input" data-exp-team-type>${typeOptions}</select>
                <button class="btn btn--small" data-exp-team-auto ${expOn ? "disabled" : ""}>一键选择</button>
                <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
                <button class="btn btn--small" data-exp-team-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">多选请直接勾选（最多 20 只，技能冷却中的精灵不会出现在列表中）。</div>
            <div class="modal__body">${candidateRows}</div>
          </div>
        </div>
      `;
        }

        if (!expOn) {
          const quickOn = Boolean(ui.expeditionQuick);
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">开始远征</div>
            <div class="row__desc">奖励：经验 +${rewardExp}（每只参与精灵）· 未来币 +${rewardCoin} · 药剂掉落总数 ${lvlDef.pot} · 属性相性 x${rewardMul.toFixed(2)}</div>
            <div class="row__desc muted">急行：时长约 ×0.3，奖励约 ×0.7</div>
          </div>
          <div class="row__right">
            <label class="check" style="margin-right:8px">
              <input type="checkbox" data-exp-quick ${quickOn ? "checked" : ""} />
              <span>急行</span>
            </label>
            <button class="btn btn--primary" data-exp-start ${canStartExp ? "" : "disabled"}>${quickOn ? "急行出征" : "出征"}</button>
          </div>
        </div>
      `);
        } else {
          const rem =
            typeof state.expedition.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
              ? Math.max(0, state.expedition.remainingSec)
              : 0;
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">远征中</div>
            <div class="row__desc">剩余：${fmtDuration(rem)}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-exp-cancel>取消远征</button>
          </div>
        </div>
      `);
        }

        if (expTeamModalHtml) rows.push(expTeamModalHtml);
      }
    }

    if (trainingModalHtml) rows.push(trainingModalHtml);
    if (breedingModalHtml) rows.push(breedingModalHtml);
    elFunctionsTraining.innerHTML = rows.join("");

    try {
      const body = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (body) body.scrollTop = prevTrainModalBodyScrollTop;
      const breedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (breedBody) breedBody.scrollTop = prevBreedModalBodyScrollTop;
      const expTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (expTeamBody) expTeamBody.scrollTop = prevExpTeamModalBodyScrollTop;

      if (prevFocusKind === "train") {
        const inp = elFunctionsTraining.querySelector('input[data-train-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      } else if (prevFocusKind === "breed") {
        const inp = elFunctionsTraining.querySelector('input[data-breed-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      }
      if (prevPageScrollY > 0 && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          try {
            const nowY = window.scrollY || 0;
            if (Math.abs(nowY - prevPageScrollY) > 2) window.scrollTo(window.scrollX || 0, prevPageScrollY);
          } catch {
          }
        });
      }
    } catch {
    }
    ui.functionsDirty = false;
  };
}

export function initFunctionsTab({
  elFunctionsTraining,
  ui,
  clamp,
  fmtDuration,
  monPower,
  getPokeApiDataByDex,
  markFunctionsDirty,
  markMonListDirty,
  addLog,
  addRes,
  render,
  getState,
}) {
  if (!elFunctionsTraining) return;

  const stateRef = () => (typeof getState === "function" ? getState() : null);

  const SELECT_FOCUS_SELECTOR =
    "select[data-exp-lvl],select[data-exp-team-type],select[data-train-modal-region],select[data-train-modal-type],select[data-train-modal-sort],select[data-breed-modal-region],select[data-breed-modal-type],select[data-breed-modal-sort]";

  const focusOn = () => { ui.functionsFocus = true; };
  const focusOff = () => {
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  };

  for (const [evt, handler] of [
    ["pointerdown", focusOn],
    ["mousedown", focusOn],
    ["touchstart", focusOn],
    ["focusin", focusOn],
    ["focusout", focusOff],
  ]) {
    elFunctionsTraining.addEventListener(evt, (ev) => {
      const sel = ev.target?.closest?.(SELECT_FOCUS_SELECTOR);
      if (!sel || !elFunctionsTraining.contains(sel)) return;
      handler();
    }, true);
  }

  elFunctionsTraining.addEventListener("input", (ev) => {
    const tQ = ev.target?.closest?.("input[data-train-modal-q]");
    if (tQ && elFunctionsTraining.contains(tQ)) {
      ui.trainingModalQuery = String(tQ.value || "");
      markFunctionsDirty();
      render();
      return;
    }

    const bQ = ev.target?.closest?.("input[data-breed-modal-q]");
    if (bQ && elFunctionsTraining.contains(bQ)) {
      ui.breedingModalQuery = String(bQ.value || "");
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const sel = ev.target?.closest?.("select[data-exp-team-type]");
    if (!sel || !elFunctionsTraining.contains(sel)) return;
    ui.expeditionTeamTypeFilter = String(sel.value || "all");
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const lvlSel = ev.target?.closest?.("select[data-exp-lvl]");
    if (lvlSel && elFunctionsTraining.contains(lvlSel)) {
      const state = stateRef();
      if (!state || !state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedLevel = String(lvlSel.value || "basic");
      state.expedition.selectedDungeonKey = null;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const tRegion = ev.target?.closest?.("select[data-train-modal-region]");
    if (tRegion && elFunctionsTraining.contains(tRegion)) {
      ui.trainingModalRegion = String(tRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tType = ev.target?.closest?.("select[data-train-modal-type]");
    if (tType && elFunctionsTraining.contains(tType)) {
      ui.trainingModalType = String(tType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tSort = ev.target?.closest?.("select[data-train-modal-sort]");
    if (tSort && elFunctionsTraining.contains(tSort)) {
      ui.trainingModalSort = String(tSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const tDir = ev.target?.closest?.("select[data-train-modal-dir]");
    if (tDir && elFunctionsTraining.contains(tDir)) {
      ui.trainingModalSortDir = String(tDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
    const bRegion = ev.target?.closest?.("select[data-breed-modal-region]");
    if (bRegion && elFunctionsTraining.contains(bRegion)) {
      ui.breedingModalRegion = String(bRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bType = ev.target?.closest?.("select[data-breed-modal-type]");
    if (bType && elFunctionsTraining.contains(bType)) {
      ui.breedingModalType = String(bType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bSort = ev.target?.closest?.("select[data-breed-modal-sort]");
    if (bSort && elFunctionsTraining.contains(bSort)) {
      ui.breedingModalSort = String(bSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const bDir = ev.target?.closest?.("select[data-breed-modal-dir]");
    if (bDir && elFunctionsTraining.contains(bDir)) {
      ui.breedingModalSortDir = String(bDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-train-modal-check]");
    if (chk && elFunctionsTraining.contains(chk)) {
      const id = Number(chk.getAttribute("data-train-modal-check"));
      if (!Number.isFinite(id)) return;
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);

      const trainingSet = new Set(state.training.activeIds);
      if (trainingSet.has(id)) {
        chk.checked = false;
        return;
      }

      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x) && !trainingSet.has(x));

      if (chk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= capLeft) {
            chk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.trainingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }

    const bchk = ev.target?.closest?.("input[data-breed-modal-check]");
    if (bchk && elFunctionsTraining.contains(bchk)) {
      const id = Number(bchk.getAttribute("data-breed-modal-check"));
      if (!Number.isFinite(id)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 2);

      if (bchk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= 2) {
            bchk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.breedingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("click", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const expDailyClaim = ev.target?.closest?.("button[data-func-exp-daily-claim]");
    if (expDailyClaim && elFunctionsTraining.contains(expDailyClaim)) {
      if (expDailyClaim.disabled) return;
      if (!markExpeditionDailyClaimed(state, localDateStr())) {
        addLog("今日远征任务未完成或已领取");
        return;
      }
      addRes("futurecoin", 10);
      addLog("今日远征任务：未来币 +10", true);
      markFunctionsDirty();
      render();
      return;
    }

    const toggleBtn = ev.target?.closest?.("button[data-func-toggle]");
    if (toggleBtn && elFunctionsTraining.contains(toggleBtn)) {
      const key = toggleBtn.getAttribute("data-func-toggle");
      if (key === "training") ui.functionsHideTraining = !Boolean(ui.functionsHideTraining);
      if (key === "breeding") ui.functionsHideBreeding = !Boolean(ui.functionsHideBreeding);
      if (key === "expedition") ui.functionsHideExpedition = !Boolean(ui.functionsHideExpedition);
      markFunctionsDirty();
      render();
      return;
    }

    const trainOpenBtn = ev.target?.closest?.("button[data-train-open]");
    if (trainOpenBtn && elFunctionsTraining.contains(trainOpenBtn)) {
      const slotSize =
        typeof state.training?.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      if (slotSize < 1) return;
      const activeIds = Array.isArray(state.training?.activeIds) ? state.training.activeIds : [];
      if (activeIds.length >= slotSize) return;
      ui.trainingModalOpen = true;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const trainCloseBtn = ev.target?.closest?.("button[data-train-modal-close]");
    if (trainCloseBtn && elFunctionsTraining.contains(trainCloseBtn)) {
      ui.trainingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const trainOverlay = ev.target?.closest?.("div[data-train-modal-overlay]");
    if (trainOverlay && elFunctionsTraining.contains(trainOverlay)) {
      if (ev.target === trainOverlay) {
        ui.trainingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const trainClearBtn = ev.target?.closest?.("button[data-train-modal-clear]");
    if (trainClearBtn && elFunctionsTraining.contains(trainClearBtn)) {
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const trainConfirmBtn = ev.target?.closest?.("button[data-train-modal-confirm]");
    if (trainConfirmBtn && elFunctionsTraining.contains(trainConfirmBtn)) {
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);
      if (capLeft <= 0) return;
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      const pickMons = sel0
        .map((id) => alive.find((m) => m && m.id === id) ?? null)
        .filter((x) => x)
        .slice(0, capLeft);
      if (pickMons.length <= 0) return;
      for (const mon of pickMons) {
        if (!state.training.activeIds.includes(mon.id) && state.training.activeIds.length < slotSize) {
          state.training.activeIds.push(mon.id);
          addLog(`训练开始：${mon.name}`);
        }
      }
      ui.trainingModalOpen = false;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const feedBtn = ev.target?.closest?.("button[data-train-feed]");
    if (feedBtn && elFunctionsTraining.contains(feedBtn)) {
      if (feedBtn.disabled) return;
      const id = Number(feedBtn.getAttribute("data-train-feed"));
      if (!Number.isFinite(id)) return;
      const m = (state.mons?.list ?? []).find((x) => x.id === id);
      if (!m) return;

      const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
      if (sat0 >= 100) return;

      const needSat = Math.max(0, 100 - sat0);
      const stepsNeed = Math.max(0, Math.ceil(needSat / 5));
      const needCatnip = stepsNeed * 100;
      const haveCatnip = Math.max(0, Math.floor(state.res.catnip.value ?? 0));

      if (haveCatnip < 100) {
        addLog(`喂食失败：树果不足（需要 ${needCatnip}，当前 ${haveCatnip}）`, true);
        return;
      }

      if (haveCatnip >= needCatnip) {
        state.res.catnip.value = Math.max(0, state.res.catnip.value - needCatnip);
        m.satiety = 100;
        addLog(`喂食：${m.name} 饱腹度补满（消耗树果 ${needCatnip}）`, true);
      } else {
        const steps = Math.max(0, Math.floor(haveCatnip / 100));
        const cost = steps * 100;
        const addSat = steps * 5;
        const sat1 = clamp(sat0 + addSat, 0, 100);
        state.res.catnip.value = Math.max(0, state.res.catnip.value - cost);
        m.satiety = sat1;
        const miss = Math.max(0, needCatnip - cost);
        addLog(`喂食：${m.name} 饱腹度 +${Math.floor(sat1 - sat0)}（树果不足，距离喂满还差 ${miss}）`, true);
      }

      markMonListDirty(false);
      render();
      return;
    }

    const cancelBtn = ev.target?.closest?.("button[data-train-cancel]");
    if (cancelBtn && elFunctionsTraining.contains(cancelBtn)) {
      const cid = Number(cancelBtn.getAttribute("data-train-cancel"));
      if (state.training && typeof state.training === "object") {
        if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
        state.training.activeIds = state.training.activeIds.filter((x) => x !== cid);
      }
      addLog("训练已取消");
      markFunctionsDirty();
      render();
    }

    const breedOpenBtn = ev.target?.closest?.("button[data-breed-open]");
    if (breedOpenBtn && elFunctionsTraining.contains(breedOpenBtn)) {
      if (!state.breeding || typeof state.breeding !== "object") {
        state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
      }
      if (Boolean(state.breeding.on)) return;
      ui.breedingModalOpen = true;
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const breedCloseBtn = ev.target?.closest?.("button[data-breed-modal-close]");
    if (breedCloseBtn && elFunctionsTraining.contains(breedCloseBtn)) {
      ui.breedingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const breedOverlay = ev.target?.closest?.("div[data-breed-modal-overlay]");
    if (breedOverlay && elFunctionsTraining.contains(breedOverlay)) {
      if (ev.target === breedOverlay) {
        ui.breedingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const breedClearBtn = ev.target?.closest?.("button[data-breed-modal-clear]");
    if (breedClearBtn && elFunctionsTraining.contains(breedClearBtn)) {
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const breedConfirmBtn = ev.target?.closest?.("button[data-breed-modal-confirm]");
    if (breedConfirmBtn && elFunctionsTraining.contains(breedConfirmBtn)) {
      if (!state.breeding || typeof state.breeding !== "object") {
        state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
      }
      if (Boolean(state.breeding.on)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      const sel = sel0
        .map((id) => alive.find((m) => m && m.id === id) ?? null)
        .filter((x) => x)
        .slice(0, 2);
      if (sel.length !== 2) return;
      if (sel[0].id === sel[1].id) return;
      state.breeding.aId = sel[0].id;
      state.breeding.bId = sel[1].id;
      state.breeding.on = true;
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      ui.breedingModalOpen = false;
      ui.breedingModalSelectedIds = [];
      addLog("开始饲养", true);
      markFunctionsDirty();
      render();
      return;
    }

    const breedCancelBtn = ev.target?.closest?.("button[data-breed-cancel]");
    if (breedCancelBtn && elFunctionsTraining.contains(breedCancelBtn)) {
      if (state.breeding && typeof state.breeding === "object") {
        state.breeding.on = false;
        state.breeding.eggRemainingSec = 0;
        state.breeding.eggTotalSec = 0;
      }
      addLog("饲养已取消", true);
      markFunctionsDirty();
      render();
    }

    const expTeamOpenBtn = ev.target?.closest?.("button[data-exp-team-open]");
    if (expTeamOpenBtn && elFunctionsTraining.contains(expTeamOpenBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamCloseBtn = ev.target?.closest?.("button[data-exp-team-close]");
    if (expTeamCloseBtn && elFunctionsTraining.contains(expTeamCloseBtn)) {
      ui.expeditionTeamModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamOverlay = ev.target?.closest?.("div[data-exp-team-overlay]");
    if (expTeamOverlay && elFunctionsTraining.contains(expTeamOverlay)) {
      if (ev.target === expTeamOverlay) {
        ui.expeditionTeamModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }

    const expDungeonBtn = ev.target?.closest?.("button[data-exp-dungeon]");
    if (expDungeonBtn && elFunctionsTraining.contains(expDungeonBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const key = expDungeonBtn.getAttribute("data-exp-dungeon");
      if (!key) return;
      state.expedition.selectedDungeonKey = String(key);
      markFunctionsDirty();
      render();
      return;
    }

    const expClearBtn = ev.target?.closest?.("button[data-exp-clear]");
    if (expClearBtn && elFunctionsTraining.contains(expClearBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const expAutoBtn = ev.target?.closest?.("button[data-exp-team-auto]");
    if (expAutoBtn && elFunctionsTraining.contains(expAutoBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamAutoPick = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expRemoveBtn = ev.target?.closest?.("button[data-exp-remove]");
    if (expRemoveBtn && elFunctionsTraining.contains(expRemoveBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const id = Number(expRemoveBtn.getAttribute("data-exp-remove"));
      if (!Number.isFinite(id)) return;
      if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
      state.expedition.selectedIds = state.expedition.selectedIds.filter((x) => x !== id);
      markFunctionsDirty();
      render();
      return;
    }

    const expStartBtn = ev.target?.closest?.("button[data-exp-start]");
    if (expStartBtn && elFunctionsTraining.contains(expStartBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
      if (postLvl < 1) return;
      const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
      const lvlDef = getExpLevelDef(selLvl);
      if (postLvl < lvlDef.unlockLvl) return;

      const dungeons = state.expedition.dungeons?.[selLvl];
      const dlist = Array.isArray(dungeons) ? dungeons : [];
      const d = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
      if (!d) return;

      const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getPokeApiDataByDex);

      const selIds = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : [];
      const mons = state.mons?.list ?? [];
      const selMons = selIds.map((id) => mons.find((x) => x && x.id === id) ?? null).filter((x) => x);
      if (selMons.length <= 0) return;
      for (const m of selMons) {
        const cd0 =
          typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
            ? Math.max(0, m.skillCdRemainingSec)
            : 0;
        if (cd0 > 0) return;
      }

      const selMonsSorted = selMons
        .map((m) => ({ m, effPower: monPower(m) * typeMul(m, d.type) }))
        .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0))
        .map((x) => x.m);

      const effPower = selMonsSorted.reduce((acc, m) => acc + monPower(m) * typeMul(m, d.type), 0);
      if (effPower < lvlDef.req) return;
      const baseSec = 7200;
      const excessPct = Math.max(0, (effPower - lvlDef.req) / lvlDef.req);
      const natureTimeMul = expeditionNatureTimeMul(selMonsSorted);
      const totalSec0 = Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul));
      const quick = Boolean(ui.expeditionQuick);
      const totalSec = applyQuickExpeditionDuration(totalSec0, quick);
      const rewardMul0 = selMonsSorted.reduce((acc, m) => acc + typeMul(m, d.type), 0) / selMonsSorted.length;
      const rewardMul = Math.max(0.75, Math.min(1.5, rewardMul0));

      state.expedition.on = true;
      state.expedition.activeIds = selMonsSorted.map((m) => m.id);
      state.expedition.remainingSec = totalSec;
      state.expedition.totalSec = totalSec;
      state.expedition.quick = quick;
      state.expedition.milestonesFired = {};
      state.expedition.rewardExp = applyQuickExpeditionReward(Math.floor(lvlDef.exp * rewardMul), quick);
      state.expedition.rewardCoin = applyQuickExpeditionReward(Math.floor(lvlDef.coin * rewardMul), quick);
      state.expedition.rewardPotionTotal = applyQuickExpeditionReward(lvlDef.pot, quick);
      state.expedition.dungeonType = d.type;
      const impishN = selMonsSorted.filter((m) => monPassive(m)?.key === "expeditionTimeBonus").length;
      const quickLabel = quick ? "（急行）" : "";
      addLog(impishN > 0 ? `开始远征${quickLabel}（淘气性格加速 ×${impishN}）` : `开始远征${quickLabel}`, true);
      markFunctionsDirty();
      render();
      return;
    }

    const expCancelBtn = ev.target?.closest?.("button[data-exp-cancel]");
    if (expCancelBtn && elFunctionsTraining.contains(expCancelBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      state.expedition.on = false;
      state.expedition.activeIds = [];
      state.expedition.remainingSec = 0;
      state.expedition.totalSec = 0;
      state.expedition.rewardExp = 0;
      state.expedition.rewardCoin = 0;
      state.expedition.rewardPotionTotal = 0;
      state.expedition.dungeonType = null;
      state.expedition.quick = false;
      state.expedition.milestonesFired = {};
      addLog("远征已取消", true);
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const quickChk = ev.target?.closest?.("input[data-exp-quick]");
    if (quickChk && elFunctionsTraining.contains(quickChk)) {
      ui.expeditionQuick = Boolean(quickChk.checked);
      markFunctionsDirty();
      render();
      return;
    }
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-exp-team-check]");
    if (!chk || !elFunctionsTraining.contains(chk)) return;
    if (!state.expedition || typeof state.expedition !== "object") return;

    const id = Number(chk.getAttribute("data-exp-team-check"));
    if (!Number.isFinite(id)) return;

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
    if (expOn) {
      const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
      chk.checked = sel0.includes(id);
      return;
    }

    const list = state.mons?.list ?? [];
    const m = list.find((x) => x && x.id === id);
    if (!m) return;

    const cd0 =
      typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
        ? Math.max(0, m.skillCdRemainingSec)
        : 0;
    if (cd0 > 0) {
      chk.checked = false;
      return;
    }

    const aliveSet = new Set(list.map((x) => (x && typeof x.id === "number" ? x.id : null)).filter((x) => typeof x === "number"));
    const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
    let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 20);

    const checked = Boolean(chk.checked);
    if (checked) {
      if (!sel.includes(id)) {
        if (sel.length >= 20) {
          chk.checked = false;
          return;
        }
        sel = sel.concat([id]);
      }
    } else {
      sel = sel.filter((x) => x !== id);
    }

    state.expedition.selectedIds = sel;
    markFunctionsDirty();
    render();
  });
}
