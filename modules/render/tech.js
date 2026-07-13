import { techReqHint } from "../tech_req_hint.js";
import { getTechStage, TECH_STAGE_LABELS, TECH_STAGE_ORDER } from "../tech_defs.js";

const TECH_PACING_BLURB =
  "研究耗时随投入分档：起步科技约数秒～半分钟，中期扩产约 1 分钟，后期飞跃链显著更长；建研究所可缩短耗时。";

export function createRenderTech({ elTech, elAutoResearchToggle, elAutoResearchMode, elResearchEff, defs, canAfford, computeResearchTimeSec, fmtDuration, getResearchEfficiency, getState, getResearchCost }) {
  return function renderTech() {
    const state = getState();
    const byStage = new Map(TECH_STAGE_ORDER.map((s) => [s, []]));

    if (elAutoResearchToggle) {
      const unlocked = Boolean(state.unlocks?.autoResearch);
      elAutoResearchToggle.disabled = !unlocked;
      elAutoResearchToggle.checked = unlocked ? Boolean(state.autoResearchOn) : false;
    }

    if (elAutoResearchMode) {
      const unlocked = Boolean(state.unlocks?.autoResearch);
      elAutoResearchMode.disabled = !unlocked;
      const m = typeof state.autoResearchMode === "string" ? state.autoResearchMode : "time";
      elAutoResearchMode.value = m === "cost" ? "cost" : "time";
    }

    if (elResearchEff) {
      const { n, reduce } = getResearchEfficiency();
      elResearchEff.textContent = `研究效率提高：研究时间-${Math.round(reduce * 100)}%（研究建筑×${n}）`;
    }

    const activeResearchTid =
      state.research && typeof state.research === "object" && typeof state.research.tid === "string" ? state.research.tid : null;
    const activeRemain =
      state.research && typeof state.research === "object" && typeof state.research.remainingSec === "number" ? state.research.remainingSec : 0;

    for (const [tid, tdef] of Object.entries(defs.tech)) {
      const owned = Boolean(state.tech[tid]);
      if (owned) continue;
      const prereqOk = (tdef.prereq ?? []).every((p) => Boolean(state.tech[p]));
      const reqOk = typeof tdef.req === "function" ? Boolean(tdef.req(state)) : true;

      const visible = owned || prereqOk || (tdef.prereq ?? []).length === 0;
      if (!visible) continue;

      const cost = typeof getResearchCost === "function" ? getResearchCost(tdef) : (tdef.cost ?? {});
      const afford = canAfford(cost);
      const isActive = Boolean(activeResearchTid && activeResearchTid === tid);
      const researchBusy = Boolean(activeResearchTid && activeResearchTid !== tid);
      const canBuy = !owned && prereqOk && reqOk && afford && !activeResearchTid;
      const locked = !prereqOk || !reqOk;

      const costText = Object.entries(cost)
        .map(([rid, v]) => `${defs.resources[rid].name}${v}`)
        .join(" / ");

      const timeText = fmtDuration(computeResearchTimeSec(tdef));

      let statusText = "可研究";
      if (owned) statusText = "已研究";
      else if (!prereqOk) statusText = "缺少前置";
      else if (!reqOk) statusText = "条件不足";
      else if (isActive) statusText = "研究中";
      else if (researchBusy) statusText = "研究中";
      else if (!afford) statusText = "资源不足";

      const btnText = isActive ? `剩余 ${fmtDuration(activeRemain)}` : "研究";

      const missingPrereq = (tdef.prereq ?? []).filter((p) => !state.tech[p]);
      const depHint =
        !prereqOk && missingPrereq.length
          ? `需要：${missingPrereq.map((p) => defs.tech[p]?.name ?? p).join("、")}`
          : "";
      const reqHint = prereqOk && !reqOk ? techReqHint(state, tid, tdef) : "";
      const gateHint = depHint || reqHint;

      const rowClass = [
        "row",
        locked ? "is-locked" : "",
        isActive ? "row--researching" : "",
        canBuy ? "row--researchable" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const stage = getTechStage(tid);
      const bucket = byStage.get(stage) ?? byStage.get("mid");
      bucket.push(`
        <div class="${rowClass}">
          <div class="row__left">
            <div class="row__title">${tdef.name}</div>
            <div class="row__desc">${tdef.desc}${gateHint ? `<span class="tech-dep">${gateHint}</span>` : ""}</div>
          </div>
          <div class="row__right">
            <div class="badge ${owned ? "badge--ok" : ""}">${statusText}</div>
            <div class="badge">花费：${costText || "-"}</div>
            <div class="badge">耗时：${timeText}</div>
            <button class="btn btn--primary" data-research="${tid}" ${canBuy ? "" : "disabled"}>${btnText}</button>
          </div>
        </div>
      `);
    }

    const sections = [`<p class="tech-pacing muted">${TECH_PACING_BLURB}</p>`];

    for (const stage of TECH_STAGE_ORDER) {
      const rows = byStage.get(stage) ?? [];
      if (rows.length === 0) continue;
      const label = TECH_STAGE_LABELS[stage] ?? stage;
      sections.push(`
        <div class="building-section tech-section" role="group" aria-label="${label}">
          <div class="building-section__title">${label}</div>
        </div>
      `);
      sections.push(...rows);
    }

    elTech.innerHTML = sections.join("");
  };
}
