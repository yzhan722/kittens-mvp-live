import {
  busyMonIds,
  pickWeakMonIds,
  releaseMonIds,
} from "../systems/mon_release.js";

export function initMonsTab({
  elMonBack,
  elMonList,
  elMonDetail,
  elMonRegion,
  elMonType,
  elMonSort,
  elMonPrev,
  elMonNext,
  ui,
  clamp,
  TYPE_ZH,
  TYPE_SKILLS,
  monPower,
  clampStar,
  getStarUpgradeNeed,
  getStarUpgradeGate,
  meetsStarUpgradeGate,
  isSameEvoFamily,
  stageIndex,
  getEvoReqLevel,
  defaultReqLvlByStage,
  isTradeEvo,
  isAffectionEvo,
  evolveMon,
  addRes,
  addLog,
  render,
  markMonsDirty,
  markMonListDirty,
  getState,
  pushTickerEvent,
  lbFetchJson,
  lbBaseUrl,
  onBossBullyMaybeReward,
  onEvolve,
}) {
  if (elMonRegion) {
    elMonRegion.value = ui.monRegion;
    elMonRegion.addEventListener("change", () => {
      ui.monRegion = String(elMonRegion.value || "all");
      markMonListDirty(true);
    });
  }

  if (elMonType) {
    elMonType.value = ui.monType || "all";
    elMonType.addEventListener("change", () => {
      ui.monType = String(elMonType.value || "all");
      markMonListDirty(true);
    });
  }

  if (elMonSort) {
    elMonSort.value = ui.monSort;
    elMonSort.addEventListener("change", () => {
      ui.monSort = String(elMonSort.value || "created");
      markMonListDirty(true);
    });
  }

  if (elMonPrev) {
    elMonPrev.addEventListener("click", () => {
      ui.monPage -= 1;
      markMonListDirty(false);
    });
  }

  if (elMonNext) {
    elMonNext.addEventListener("click", () => {
      ui.monPage += 1;
      markMonListDirty(false);
    });
  }

  if (elMonBack) {
    elMonBack.addEventListener("click", () => {
      ui.monSelectedId = null;
      markMonsDirty();
    });
  }

  if (elMonList) {
    let lastSkillPointerDownTs = 0;
    let lastSkillPointerDownKey = "";
    let monSearchDebounce = null;

    elMonList.addEventListener("input", (ev) => {
      const searchInput = ev.target?.closest?.("input[data-mon-search]");
      if (!searchInput || !elMonList.contains(searchInput)) return;
      const q = String(searchInput.value || "");
      ui.monSearch = q;
      ui.monSearchFocus = true;
      if (monSearchDebounce) clearTimeout(monSearchDebounce);
      monSearchDebounce = setTimeout(() => {
        ui.monPage = 0;
        markMonListDirty(true);
        render();
      }, 200);
    });

    elMonList.addEventListener("focusout", (ev) => {
      const searchInput = ev.target?.closest?.("input[data-mon-search]");
      if (!searchInput || !elMonList.contains(searchInput)) return;
      setTimeout(() => {
        const active = document.activeElement;
        if (active?.closest?.("input[data-mon-search]") !== searchInput) ui.monSearchFocus = false;
      }, 0);
    });

    const getSkillKey = (btn) => {
      const typeId = btn?.getAttribute?.("data-mon-skill") ?? "";
      const monId = btn?.getAttribute?.("data-mon-skill-mon") ?? "";
      return `${monId}:${typeId}`;
    };

    const handleSkillButton = (state, skillBtn) => {
      if (!skillBtn || skillBtn.disabled) return true;
      const typeId = skillBtn.getAttribute("data-mon-skill");
      if (!typeId) return true;

      const IMPLEMENTED_SKILLS = new Set([
        "fighting",
        "bug",
        "ground",
        "electric",
        "fire",
        "grass",
        "water",
        "normal",
        "ghost",
        "steel",
        "ice",
        "fairy",
        "dragon",
        "poison",
        "flying",
        "psychic",
        "rock",
        "dark",
      ]);

      const monId = Number(skillBtn.getAttribute("data-mon-skill-mon"));
      if (!Number.isFinite(monId)) return true;
      const list = state.mons?.list ?? [];
      const mon = list.find((m) => m && m.id === monId);
      if (!mon) return true;

      if (!IMPLEMENTED_SKILLS.has(typeId)) {
        const skillName = TYPE_SKILLS?.[typeId] ?? "技能";
        const typeZh = TYPE_ZH?.[typeId] ?? typeId;
        addLog(`技能未实装：${skillName}（${typeZh}）`, true);
        return true;
      }

      if (!state.skills || typeof state.skills !== "object") {
        state.skills = {
          trainingStacks: [],
          normalBoostStacks: [],
          bullyHp: 100,
          hugeBerryBuffRemainingSec: 0,
          steelBallDiscountCharges: 0,
          iceSatietySlowRemainingSec: 0,
          fairyAffGainRemainingSec: 0,
          dragonCatchBoostRemainingSec: 0,
        };
      }

      const fmtRemain = (sec) => {
        const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        const pad2 = (x) => String(x).padStart(2, "0");
        return `${mm}:${pad2(ss)}`;
      };

      const cd0 = typeof mon.skillCdRemainingSec === "number" && Number.isFinite(mon.skillCdRemainingSec) ? mon.skillCdRemainingSec : 0;
      if (cd0 > 0) {
        addLog(`技能冷却中：剩余 ${fmtRemain(cd0)}`, true);
        return true;
      }

      const sat0 = clamp(typeof mon.satiety === "number" && Number.isFinite(mon.satiety) ? mon.satiety : 100, 0, 100);
      if (sat0 < 50) {
        addLog(`技能失败：饱腹度不足（需要 50，当前 ${Math.floor(sat0)}）`, true);
        return true;
      }

      if (typeId === "electric") {
        const hasResearch = Boolean(state.research && typeof state.research === "object" && state.research.tid);
        if (!hasResearch) {
          addLog("技能失败：当前没有研究项目。", true);
          return true;
        }
      }

      if (typeId === "grass") {
        const have = state.res.catnip?.value ?? 0;
        if (have < 10000) {
          addLog(`技能失败：树果不足（需要 10000，当前 ${Math.floor(have)}）`, true);
          return true;
        }
      }

      if (typeId === "water") {
        const anyPlanting = Array.isArray(state.mons?.list) && state.mons.list.some((x) => x && x.skillActiveType === "grass" && (x.skillActiveRemainingSec ?? 0) > 0);
        if (!anyPlanting) {
          addLog("技能失败：当前没有果树在种植中。", true);
          return true;
        }
      }

      mon.satiety = clamp(sat0 - 50, 0, 100);
      const cdSec = typeId === "grass" ? 8 * 3600 : 3600;
      mon.skillCdRemainingSec = cdSec;

      const skillName = TYPE_SKILLS?.[typeId] ?? "技能";
      const typeZh = TYPE_ZH?.[typeId] ?? typeId;

      if (typeId === "fighting") {
        if (!Array.isArray(state.skills.trainingStacks)) state.skills.trainingStacks = [];
        state.skills.trainingStacks.push(3600);
        const n = state.skills.trainingStacks.length;
        addLog(`技能：${skillName}（${typeZh}）→ 训练场叠加 +1（当前 ${n} 层）`, true);
      } else if (typeId === "bug") {
        const jokes = ["林佬：不准卷了！", "林佬：我血条呢？", "林佬：这也太虫了…", "林佬：已被精神污染", "林佬：你礼貌吗？"];
        const msg = jokes[Math.floor(Math.random() * jokes.length)];

        if (typeof lbFetchJson !== "function" || typeof lbBaseUrl !== "function") {
          addLog(`技能：${skillName}（${typeZh}）→ ${msg}（后端未连接）`, true);
          markMonListDirty(false);
          render();
          return true;
        }

        addLog(`技能：${skillName}（${typeZh}）→ ${msg}（攻击林佬...）`, true);
        (async () => {
          try {
            const base = lbBaseUrl();
            let uid = typeof ui.lbUid === "string" ? ui.lbUid.trim() : "";
            if (!uid) {
              uid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
              ui.lbUid = uid;
              try {
                localStorage.setItem("kittens_mvp_lb_uid_v1", uid);
              } catch {
              }
            }

            const name0 = typeof ui.lbName === "string" && ui.lbName.trim() ? ui.lbName.trim() : "训练家";
            const name = String(name0).slice(0, 32);
            const res = await lbFetchJson(`${base}/api/server/boss/bully/attack`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid, name }),
            });
            const maxHp = typeof res?.maxHp === "number" && Number.isFinite(res.maxHp) ? Math.max(1, Math.floor(res.maxHp)) : 1000;
            const hp = Boolean(res?.killed) ? 0 : typeof res?.hp === "number" && Number.isFinite(res.hp) ? Math.max(0, Math.floor(res.hp)) : 0;
            addLog(`技能：${skillName}（${typeZh}）→ 命中！（HP ${hp}/${maxHp}）`, true);
            if (typeof pushTickerEvent === "function") pushTickerEvent("bully", `恐吓林佬：HP ${hp}/${maxHp}`);

            if (Boolean(res?.killed)) {
              addLog("林佬被击败：奖励已刷新", true);
              if (typeof pushTickerEvent === "function") pushTickerEvent("boss", "林佬被击败：奖励已刷新");
            }

            if (typeof onBossBullyMaybeReward === "function") {
              onBossBullyMaybeReward();
            }
          } catch (e) {
            const msg = typeof e?.message === "string" && e.message ? e.message : "未知错误";
            addLog(`技能：${skillName}（${typeZh}）→ 攻击失败（${msg}）`, true);
            if (typeof pushTickerEvent === "function") pushTickerEvent("bully", `恐吓林佬：攻击失败（${msg}）`);
          } finally {
            markMonListDirty(false);
            render();
          }
        })();
        return true;
      } else if (typeId === "ground") {
        mon.skillActiveType = "ground";
        mon.skillActiveRemainingSec = 600;
        addLog(`技能：${skillName}（${typeZh}）→ 进入挖矿状态（10分钟）`, true);
      } else if (typeId === "electric") {
        const before = typeof state.research.remainingSec === "number" && Number.isFinite(state.research.remainingSec) ? state.research.remainingSec : 0;
        const after = Math.max(0, before - 600);
        state.research.remainingSec = after;
        addLog(`技能：${skillName}（${typeZh}）→ 研究剩余时间 -10分钟（剩余 ${fmtRemain(after)}）`, true);
      } else if (typeId === "fire") {
        const rem0 =
          typeof state.breeding?.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec) ? state.breeding.eggRemainingSec : 0;
        const eggOn = Boolean(state.breeding?.on) && rem0 > 0;
        if (!eggOn) {
          addLog(`技能失败：当前没有在生蛋`, true);
          return true;
        }
        const after = Math.max(0, rem0 - 900);
        state.breeding.eggRemainingSec = after;
        addLog(`技能：${skillName}（${typeZh}）→ 生蛋剩余时间 -15分钟（剩余 ${fmtRemain(after)}）`, true);
      } else if (typeId === "grass") {
        state.res.catnip.value = Math.max(0, (state.res.catnip?.value ?? 0) - 10000);
        mon.skillActiveType = "grass";
        mon.skillActiveRemainingSec = 8 * 3600;
        addLog(`技能：${skillName}（${typeZh}）→ 种植果树（8小时）`, true);
      } else if (typeId === "water") {
        let best = null;
        for (const x of state.mons?.list ?? []) {
          if (!x || x.skillActiveType !== "grass") continue;
          const r = typeof x.skillActiveRemainingSec === "number" && Number.isFinite(x.skillActiveRemainingSec) ? x.skillActiveRemainingSec : 0;
          if (r <= 0) continue;
          if (!best || r < best.r) best = { m: x, r };
        }
        if (best) {
          const next = Math.max(0, best.r - 600);
          best.m.skillActiveRemainingSec = next;
          addLog(`技能：${skillName}（${typeZh}）→ 果树加速 -10分钟`, true);
        }
      } else if (typeId === "normal") {
        if (!Array.isArray(state.skills.normalBoostStacks)) state.skills.normalBoostStacks = [];
        state.skills.normalBoostStacks.push(60);
        const n = state.skills.normalBoostStacks.length;
        addLog(`技能：${skillName}（${typeZh}）→ 资源产量提升（当前叠加 ${n} 层）`, true);
      } else if (typeId === "ghost") {
        const targets = (state.mons?.list ?? []).filter((x) => x && typeof x.skillCdRemainingSec === "number" && x.skillCdRemainingSec > 0);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          t.skillCdRemainingSec = Math.ceil((t.skillCdRemainingSec ?? 0) / 2);
          addLog(`技能：${skillName}（${typeZh}）→ ${t.name} 的冷却时间减半`, true);
        } else {
          addLog(`技能：${skillName}（${typeZh}）→ 没有休息中的精灵`, true);
        }
      } else if (typeId === "steel") {
        const c0 =
          typeof state.skills.steelBallDiscountCharges === "number" && Number.isFinite(state.skills.steelBallDiscountCharges)
            ? Math.max(0, Math.floor(state.skills.steelBallDiscountCharges))
            : 0;
        const c1 = Math.min(1000000, c0 + 100);
        state.skills.steelBallDiscountCharges = c1;
        addLog(`技能：${skillName}（${typeZh}）→ 精灵球成本 -10%（下 ${c1} 次制作）`, true);
      } else if (typeId === "ice") {
        const rem0 =
          typeof state.skills.iceSatietySlowRemainingSec === "number" && Number.isFinite(state.skills.iceSatietySlowRemainingSec)
            ? Math.max(0, state.skills.iceSatietySlowRemainingSec)
            : 0;
        const rem1 = rem0 + 3600;
        state.skills.iceSatietySlowRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ 饱腹自然下降减慢（60分钟）`, true);
      } else if (typeId === "fairy") {
        const rem0 =
          typeof state.skills.fairyAffGainRemainingSec === "number" && Number.isFinite(state.skills.fairyAffGainRemainingSec)
            ? Math.max(0, state.skills.fairyAffGainRemainingSec)
            : 0;
        const rem1 = rem0 + 3600;
        state.skills.fairyAffGainRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ 亲密度增长加速（60分钟）`, true);
      } else if (typeId === "dragon") {
        const rem0 =
          typeof state.skills.dragonCatchBoostRemainingSec === "number" && Number.isFinite(state.skills.dragonCatchBoostRemainingSec)
            ? Math.max(0, state.skills.dragonCatchBoostRemainingSec)
            : 0;
        const rem1 = rem0 + 600;
        state.skills.dragonCatchBoostRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ 捕获率提升（10分钟）`, true);
      } else if (typeId === "psychic") {
        const c0 =
          typeof state.skills.psychicCraftBoostCharges === "number" && Number.isFinite(state.skills.psychicCraftBoostCharges)
            ? Math.max(0, Math.floor(state.skills.psychicCraftBoostCharges))
            : 0;
        const c1 = Math.min(1000000, c0 + 10);
        state.skills.psychicCraftBoostCharges = c1;
        addLog(`技能：${skillName}（${typeZh}）→ 合成效率提升（下 ${c1} 次）`, true);
      } else if (typeId === "flying") {
        const rem0 =
          typeof state.expedition?.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec) ? state.expedition.remainingSec : 0;
        const expOn = Boolean(state.expedition?.on) && rem0 > 0;
        if (!expOn) {
          addLog(`技能失败：当前没有探险任务`, true);
          return true;
        }
        const after = Math.max(0, rem0 - 1800);
        state.expedition.remainingSec = after;
        addLog(`技能：${skillName}（${typeZh}）→ 探险剩余时间 -30分钟`, true);
      } else if (typeId === "rock") {
        const rem0 =
          typeof state.skills.rockBuildBoostRemainingSec === "number" && Number.isFinite(state.skills.rockBuildBoostRemainingSec)
            ? Math.max(0, state.skills.rockBuildBoostRemainingSec)
            : 0;
        const rem1 = rem0 + 3600;
        state.skills.rockBuildBoostRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ 建筑成本降低 20%（60分钟）`, true);
      } else if (typeId === "poison") {
        const rem0 =
          typeof state.skills.poisonResourceSaveRemainingSec === "number" && Number.isFinite(state.skills.poisonResourceSaveRemainingSec)
            ? Math.max(0, state.skills.poisonResourceSaveRemainingSec)
            : 0;
        const rem1 = rem0 + 3600;
        state.skills.poisonResourceSaveRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ 资源消耗减少 20%（60分钟）`, true);
      } else if (typeId === "dark") {
        const rem0 =
          typeof state.skills.darkPveDamageBoostRemainingSec === "number" && Number.isFinite(state.skills.darkPveDamageBoostRemainingSec)
            ? Math.max(0, state.skills.darkPveDamageBoostRemainingSec)
            : 0;
        const rem1 = rem0 + 600;
        state.skills.darkPveDamageBoostRemainingSec = rem1;
        addLog(`技能：${skillName}（${typeZh}）→ PVE 伤害提升 50%（10分钟）`, true);
      } else {
        addLog(`技能：${skillName}（${typeZh}）已触发`, true);
      }

      markMonListDirty(false);
      render();
      return true;
    };

    elMonList.addEventListener("pointerdown", (ev) => {
      const skillBtn = ev.target?.closest?.("button[data-mon-skill]");
      if (!skillBtn || !elMonList.contains(skillBtn)) return;
      if (skillBtn.disabled) return;

      const key = getSkillKey(skillBtn);
      const now = Date.now();
      if (key && key === lastSkillPointerDownKey && now - lastSkillPointerDownTs < 350) return;
      lastSkillPointerDownTs = now;
      lastSkillPointerDownKey = key;

      skillBtn.classList.add("is-pressing");
      setTimeout(() => {
        try {
          skillBtn.classList.remove("is-pressing");
        } catch {
        }
      }, 120);

      const state = getState();
      handleSkillButton(state, skillBtn);
      ev.preventDefault();
    });

    elMonList.addEventListener("click", (ev) => {
      const state = getState();

      const starCloseBtn = ev.target?.closest?.("button[data-mon-starup-close]");
      if (starCloseBtn && elMonList.contains(starCloseBtn)) {
        ui.starUpTargetId = null;
        ui.starUpSelectedIds = [];
        markMonListDirty(false);
        render();
        return;
      }

      const feedAllBtn = ev.target?.closest?.("button[data-mon-feed-all]");
      if (feedAllBtn && elMonList.contains(feedAllBtn)) {
        if (feedAllBtn.disabled) return;
                const list = state.mons?.list ?? [];
        // 按饱腹度升序排列（最饿的优先喂）
        const allMons = list
          .filter((m) => m && clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100) < 100)
          .sort((a, b) => {
            const sa = clamp(typeof a.satiety === "number" ? a.satiety : 100, 0, 100);
            const sb = clamp(typeof b.satiety === "number" ? b.satiety : 100, 0, 100);
            return sa - sb;
          });
        if (allMons.length === 0) return;
        const ids = allMons.map((m) => m.id);
        let haveCatnip = Math.max(0, Math.floor(state.res.catnip.value ?? 0));
        let fedCount = 0;

        for (const id of ids) {
          if (haveCatnip < 100) break;
          const m = list.find((x) => x && x.id === id);
          if (!m) continue;

          const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
          if (sat0 >= 100) continue;

          const needSat = Math.max(0, 100 - sat0);
          const stepsNeed = Math.max(0, Math.ceil(needSat / 5));
          const needCatnip = stepsNeed * 100;
          if (needCatnip <= 0) continue;

          if (haveCatnip >= needCatnip) {
            haveCatnip -= needCatnip;
            state.res.catnip.value = Math.max(0, state.res.catnip.value - needCatnip);
            m.satiety = 100;
            addLog(`一键喂食：${m.name} 饱腹度补满（消耗树果 ${needCatnip}）`, true);
            fedCount += 1;
          } else {
            const steps = Math.max(0, Math.floor(haveCatnip / 100));
            const cost = steps * 100;
            const addSat = steps * 5;
            const sat1 = clamp(sat0 + addSat, 0, 100);
            haveCatnip -= cost;
            state.res.catnip.value = Math.max(0, state.res.catnip.value - cost);
            m.satiety = sat1;
            const miss = Math.max(0, needCatnip - cost);
            addLog(`一键喂食：${m.name} 饱腹度 +${Math.floor(sat1 - sat0)}（树果不足，距离喂满还差 ${miss}）`, true);
            fedCount += 1;
            break;
          }
        }

        if (fedCount <= 0) {
          addLog("一键喂食：所有精灵饱腹度已满或树果不足", true);
        }
        markMonListDirty(false);
        render();
        return;
      }

      const feedHungryBtn = ev.target?.closest?.("button[data-mons-feed-hungry]");
      if (feedHungryBtn && elMonList.contains(feedHungryBtn)) {
        if (feedHungryBtn.disabled) return;
        const list = state.mons?.list ?? [];
        const hungry = list
          .filter((m) => m && clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100) < 50)
          .sort((a, b) => {
            const sa = clamp(typeof a.satiety === "number" ? a.satiety : 100, 0, 100);
            const sb = clamp(typeof b.satiety === "number" ? b.satiety : 100, 0, 100);
            return sa - sb;
          });
        if (hungry.length === 0) return;
        let haveCatnip = Math.max(0, Math.floor(state.res.catnip.value ?? 0));
        let fedCount = 0;
        for (const m of hungry) {
          if (haveCatnip < 100) break;
          const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
          if (sat0 >= 50) continue;
          const needSat = Math.max(0, 50 - sat0);
          const stepsNeed = Math.max(0, Math.ceil(needSat / 5));
          const needCatnip = stepsNeed * 100;
          if (needCatnip <= 0) continue;
          if (haveCatnip >= needCatnip) {
            haveCatnip -= needCatnip;
            state.res.catnip.value = Math.max(0, state.res.catnip.value - needCatnip);
            m.satiety = Math.max(sat0, 50);
            addLog(`喂食饥饿：${m.name} 饱腹→${Math.floor(m.satiety)}（树果 ${needCatnip}）`, true);
            fedCount += 1;
          } else {
            const steps = Math.max(0, Math.floor(haveCatnip / 100));
            const cost = steps * 100;
            const addSat = steps * 5;
            const sat1 = clamp(sat0 + addSat, 0, 100);
            haveCatnip -= cost;
            state.res.catnip.value = Math.max(0, state.res.catnip.value - cost);
            m.satiety = sat1;
            addLog(`喂食饥饿：${m.name} 饱腹 +${Math.floor(sat1 - sat0)}（树果不足）`, true);
            fedCount += 1;
            break;
          }
        }
        if (fedCount <= 0) addLog("喂食饥饿：无目标或树果不足", true);
        markMonListDirty(false);
        render();
        return;
      }

      const focusEvoBtn = ev.target?.closest?.("button[data-mons-focus-evo]");
      if (focusEvoBtn && elMonList.contains(focusEvoBtn)) {
        if (focusEvoBtn.disabled) return;
        const id = ui._monsFirstEvoId;
        if (id == null) {
          addLog("当前筛选下没有可进化精灵");
          return;
        }
        ui.monSelectedId = id;
        markMonListDirty(false);
        addLog("已定位可进化精灵，查看右侧详情进化", true);
        render();
        return;
      }

      const batchCandyBtn = ev.target?.closest?.("button[data-mon-batch-candy]");
      if (batchCandyBtn && elMonList.contains(batchCandyBtn)) {
        if (batchCandyBtn.disabled) return;
        const list = state.mons?.list ?? [];
        const region = ui.monRegion || "all";
        const typeFilter = ui.monType || "all";
        const searchQ = typeof ui.monSearch === "string" ? ui.monSearch.trim().toLowerCase() : "";
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
          if (region === "alola") return m.dex >= 722 && m.dex <= 809;
          if (region === "galar") return m.dex >= 810 && m.dex <= 905;
          return true;
        };
        const typeOk = (m) => {
          if (!m || typeof m.dex !== "number") return false;
          if (typeFilter === "all") return true;
          const api = typeof getPokeApiDataByDex === "function" ? getPokeApiDataByDex(m.dex) : null;
          const types = Array.isArray(api?.types) ? api.types : null;
          if (!types) return true;
          return types.includes(typeFilter);
        };
        const searchOk = (m) => {
          if (!searchQ) return true;
          const name = typeof m?.name === "string" ? m.name.toLowerCase() : "";
          return name.includes(searchQ);
        };
        const targets = list.filter((m) => m && m.lvl < 100 && regionOk(m) && typeOk(m) && searchOk(m));
        let candy = Math.max(0, Math.floor(state.res.rareCandy?.value ?? 0));
        let fed = 0;
        for (const m of targets) {
          if (candy < 1) break;
          candy -= 1;
          state.res.rareCandy.value = Math.max(0, (state.res.rareCandy?.value ?? 0) - 1);
          m.lvl = clamp(m.lvl + 1, 1, 100);
          m.exp = 0;
          fed += 1;
        }
        if (fed > 0) {
          addLog(`批量喂糖：${fed} 只各 +1Lv（消耗神奇糖果 ${fed}）`, true);
        } else {
          addLog("批量喂糖：无可用精灵或糖果不足", true);
        }
        markMonListDirty(false);
        render();
        return;
      }

      const batchReleaseBtn = ev.target?.closest?.("button[data-mon-batch-release]");
      if (batchReleaseBtn && elMonList.contains(batchReleaseBtn)) {
        if (batchReleaseBtn.disabled) return;
        const list = state.mons?.list ?? [];
        const ids = pickWeakMonIds(list, {
          protectIds: busyMonIds(state),
          smartProtect: true,
        });
        if (!ids.length) {
          addLog("批量放生：盒子未满或没有可放生的弱宠", true);
          return;
        }
        const { removed, candy, sampleNames } = releaseMonIds(state, ids, { addRes });
        const names = sampleNames.join("、");
        const suffix = removed > sampleNames.length ? ` 等 ${removed} 只` : "";
        if (candy > 0) {
          addLog(`批量放生：${names}${suffix} → 神奇糖果 +${candy}`, true);
        } else {
          addLog(`批量放生：${names}${suffix}`, true);
        }
        markMonListDirty(false);
        render();
        return;
      }

      const batchSkillBtn = ev.target?.closest?.("button[data-mon-batch-skill]");
      if (batchSkillBtn && elMonList.contains(batchSkillBtn)) {
        if (batchSkillBtn.disabled) return;
        const batchType = batchSkillBtn.getAttribute("data-mon-batch-skill");
        if (!batchType) return;
        const list = state.mons?.list ?? [];
        let batchCount = 0;
        for (const mon of list) {
          if (!mon) continue;
          const api = getPokeApiDataByDex(mon.dex);
          const types = Array.isArray(api?.types) ? api.types : [];
          if (!types.includes(batchType)) continue;
          const sat0 = clamp(typeof mon.satiety === "number" && Number.isFinite(mon.satiety) ? mon.satiety : 100, 0, 100);
          if (sat0 < 50) continue;
          const cd0 = typeof mon.skillCdRemainingSec === "number" && Number.isFinite(mon.skillCdRemainingSec) ? Math.max(0, mon.skillCdRemainingSec) : 0;
          if (cd0 > 0) continue;
          const fakeBtn = { disabled: false, getAttribute: (k) => k === "data-mon-skill" ? batchType : String(mon.id), closest: () => null };
          handleSkillButton(state, fakeBtn);
          batchCount++;
        }
        const typeZh = TYPE_ZH?.[batchType] ?? batchType;
        if (batchCount > 0) {
          addLog(`批量技能：${typeZh}（共触发 ${batchCount} 只）`, true);
        } else {
          addLog(`批量技能：没有可用的 ${typeZh} 属性精灵`, true);
        }
        markMonListDirty(false);
        render();
        return;
      }

      const starClearBtn = ev.target?.closest?.("button[data-mon-starup-clear]");
      if (starClearBtn && elMonList.contains(starClearBtn)) {
        const id = Number(starClearBtn.getAttribute("data-mon-starup-clear"));
        if (!Number.isFinite(id)) return;
        ui.starUpTargetId = id;
        ui.starUpSelectedIds = [];
        markMonListDirty(false);
        render();
        return;
      }

      const starAutoBtn = ev.target?.closest?.("button[data-mon-starup-auto]");
      if (starAutoBtn && elMonList.contains(starAutoBtn)) {
        const id = Number(starAutoBtn.getAttribute("data-mon-starup-auto"));
        if (!Number.isFinite(id)) return;

        const list = state.mons?.list ?? [];
        const target = list.find((x) => x && x.id === id) ?? null;
        if (!target) return;

        const stars = clampStar(target.stars);
        if (stars >= 5) return;

        const need = getStarUpgradeNeed(stars);
        if (!Number.isFinite(need) || need <= 0) return;

        const candidates0 = list.filter((x) => x && x.id !== id && isSameEvoFamily(x.pid, target.pid));
        const candidates = candidates0
          .map((m) => ({ m, p: Math.max(0, Math.floor(monPower(m))) }))
          .sort((a, b) => (a.p ?? 0) - (b.p ?? 0));

        if (candidates.length >= need) {
          const picked = candidates.slice(0, need).map((x) => x.m.id);
          ui.starUpTargetId = id;
          ui.starUpSelectedIds = picked;
          markMonListDirty(false);
          render();
        }
        return;
      }

      const overlay = ev.target?.closest?.("div[data-mon-starup-overlay]");
      if (overlay && elMonList.contains(overlay) && ev.target === overlay) {
        ui.starUpTargetId = null;
        ui.starUpSelectedIds = [];
        markMonListDirty(false);
        render();
        return;
      }

      const skillBtn = ev.target?.closest?.("button[data-mon-skill]");
      if (skillBtn && elMonList.contains(skillBtn)) {
        const key = getSkillKey(skillBtn);
        const now = Date.now();
        if (key && key === lastSkillPointerDownKey && now - lastSkillPointerDownTs < 500) return;
        handleSkillButton(state, skillBtn);
        return;
      }

      const feedBtn = ev.target?.closest?.("button[data-mon-feed]");
      if (feedBtn && elMonList.contains(feedBtn)) {
        if (feedBtn.disabled) return;
        const id = Number(feedBtn.getAttribute("data-mon-feed"));
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

      const starBtn = ev.target?.closest?.("button[data-mon-starup]");
      if (starBtn && elMonList.contains(starBtn)) {
        if (starBtn.disabled) return;
        const id = Number(starBtn.getAttribute("data-mon-starup"));
        if (!Number.isFinite(id)) return;
        if (ui.starUpTargetId === id) {
          ui.starUpTargetId = null;
          ui.starUpSelectedIds = [];
        } else {
          ui.starUpTargetId = id;
          ui.starUpSelectedIds = [];
        }
        markMonListDirty(false);
        render();
        return;
      }

      const starOkBtn = ev.target?.closest?.("button[data-mon-starup-confirm]");
      if (starOkBtn && elMonList.contains(starOkBtn)) {
        if (starOkBtn.disabled) return;
        const id = Number(starOkBtn.getAttribute("data-mon-starup-confirm"));
        if (!Number.isFinite(id)) return;

        const list = state.mons?.list ?? [];
        const target = list.find((x) => x.id === id);
        if (!target) return;

        const stars = clampStar(target.stars);
        if (stars >= 5) return;

        const need = getStarUpgradeNeed(stars);
        if (!Number.isFinite(need) || need <= 0) return;
        if (!meetsStarUpgradeGate(target, stars)) {
          const gate = getStarUpgradeGate(stars);
          addLog(`升星失败：需 Lv.${gate?.lvl ?? "?"} 且亲密度 ${gate?.aff ?? "?"}+`, true);
          return;
        }

        const candidates = list.filter((x) => x && x.id !== id && isSameEvoFamily(x.pid, target.pid));
        const selIds = Array.isArray(ui.starUpSelectedIds) ? ui.starUpSelectedIds : [];
        const validSel = selIds.filter((sid) => candidates.some((x) => x.id === sid));

        if (validSel.length !== need) return;

        const removeSet = new Set(validSel);
        state.mons.list = list.filter((x) => !removeSet.has(x.id));

        const afterTarget = state.mons.list.find((x) => x.id === id);
        if (!afterTarget) return;
        afterTarget.stars = clampStar(stars + 1);

        ui.starUpTargetId = null;
        ui.starUpSelectedIds = [];
        markMonListDirty(false);
        render();
        addLog(`升星成功：${afterTarget.name} → ${afterTarget.stars}星`, true);
        return;
      }

      const openBtn = ev.target?.closest?.("button[data-mon-open]");
      if (openBtn && elMonList.contains(openBtn)) {
        const id = Number(openBtn.getAttribute("data-mon-open"));
        if (!Number.isFinite(id)) return;
        ui.monSelectedId = id;
        markMonsDirty();
        return;
      }

      const releaseBtn = ev.target?.closest?.("button[data-mon-release]");
      if (releaseBtn && elMonList.contains(releaseBtn)) {
        const id = Number(releaseBtn.getAttribute("data-mon-release"));
        if (!Number.isFinite(id)) return;
        const mIdx = (state.mons?.list ?? []).findIndex((x) => x.id === id);
        if (mIdx < 0) return;
        const m = state.mons.list[mIdx];

        const power = monPower(m);
        const refund = Math.max(0, Math.floor((typeof power === "number" && Number.isFinite(power) ? power : 0) / 100));

        state.mons.list.splice(mIdx, 1);
        if (refund > 0) {
          addRes("rareCandy", refund);
          addLog(`放生：${m?.name ? m.name : "未知精灵"}（战力${power}）→ 神奇糖果 +${refund}`, true);
        } else {
          addLog(`放生：${m?.name ? m.name : "未知精灵"}（战力${power}）`, true);
        }
        markMonListDirty(false);
        render();
        return;
      }
    });

    elMonList.addEventListener("change", (ev) => {
      const chk = ev.target?.closest?.("input[data-mon-starup-check]");
      if (!chk || !elMonList.contains(chk)) return;

      const state = getState();
      const targetId = Number(chk.getAttribute("data-mon-starup-target"));
      const sid = Number(chk.getAttribute("data-mon-starup-check"));
      if (!Number.isFinite(targetId) || !Number.isFinite(sid)) return;

      const list = state.mons?.list ?? [];
      const target = list.find((x) => x.id === targetId);
      if (!target) return;

      const stars = clampStar(target.stars);
      const need = getStarUpgradeNeed(stars);
      const candidates = list.filter((x) => x && x.id !== targetId && isSameEvoFamily(x.pid, target.pid));
      const candidateIdSet = new Set(candidates.map((x) => x.id));

      const selIds0 = Array.isArray(ui.starUpSelectedIds) ? ui.starUpSelectedIds : [];
      let selIds = selIds0.filter((id) => candidateIdSet.has(id));

      const checked = Boolean(chk.checked);
      if (checked) {
        if (!selIds.includes(sid)) {
          if (selIds.length >= need) {
            chk.checked = false;
            return;
          }
          selIds = selIds.concat([sid]);
        }
      } else {
        selIds = selIds.filter((id) => id !== sid);
      }

      ui.starUpTargetId = targetId;
      ui.starUpSelectedIds = selIds;
      markMonListDirty(false);
      render();
    });
  }

  if (elMonDetail) {
    elMonDetail.addEventListener("click", (ev) => {
      const state = getState();

      const potionBtn = ev.target?.closest?.("button[data-mon-potion]");
      if (potionBtn && elMonDetail.contains(potionBtn)) {
        if (potionBtn.disabled) return;
        const monId = Number(potionBtn.getAttribute("data-mon-potion-mon"));
        const rid = potionBtn.getAttribute("data-mon-potion");
        if (!Number.isFinite(monId) || !rid) return;
        const m = (state.mons?.list ?? []).find((x) => x && x.id === monId);
        if (!m) return;

        const inExpedition =
          Boolean(state.expedition?.on) &&
          (typeof state.expedition?.remainingSec === "number" ? state.expedition.remainingSec : 0) > 0 &&
          Array.isArray(state.expedition?.activeIds) &&
          state.expedition.activeIds.includes(m.id);
        if (inExpedition) return;

        const have = state.res?.[rid]?.value ?? 0;
        if (have < 1) return;

        const map = {
          hpPotion: "hp",
          atkPotion: "atk",
          defPotion: "def",
          spaPotion: "spa",
          spdPotion: "spd",
          spePotion: "spe",
        };
        const key = map[rid];
        if (!key) return;

        if (!m.statBonus || typeof m.statBonus !== "object") {
          m.statBonus = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        }

        const cur = typeof m.statBonus[key] === "number" && Number.isFinite(m.statBonus[key]) ? m.statBonus[key] : 0;
        if (cur >= 50) {
          addLog(`药剂强化失败：${m.name} ${key.toUpperCase()} 已达到上限 +50`, true);
          return;
        }
        state.res[rid].value = Math.max(0, have - 1);
        m.statBonus[key] = Math.min(50, cur + 5);
        addLog(`药剂强化：${m.name} ${key.toUpperCase()} +5（累计 +${m.statBonus[key]}）`, true);
        markMonsDirty();
        render();
        return;
      }

      const feedBtn = ev.target?.closest?.("button[data-mon-feed]");
      if (feedBtn && elMonDetail.contains(feedBtn)) {
        const id = Number(feedBtn.getAttribute("data-mon-feed"));
        const kind = feedBtn.getAttribute("data-feed");
        const m = (state.mons?.list ?? []).find((x) => x.id === id);
        if (!m) return;

        if (kind === "rareCandy") {
          if ((state.res.rareCandy?.value ?? 0) < 1) return;
          state.res.rareCandy.value = Math.max(0, state.res.rareCandy.value - 1);
          if (m.lvl < 100) {
            m.lvl = clamp(m.lvl + 1, 1, 100);
            m.exp = 0;
          }
          addLog(`喂食：${m.name} 神奇糖果 +1Lv`);
        }

        markMonsDirty();
        render();
        return;
      }

      const expBtn = ev.target?.closest?.("button[data-mon-exp]");
      if (expBtn && elMonDetail.contains(expBtn)) {
        const id = Number(expBtn.getAttribute("data-mon-exp"));
        const expType = expBtn.getAttribute("data-exp");
        const m = (state.mons?.list ?? []).find((x) => x.id === id);
        if (!m) return;

        // 使用经验糖果
        if (typeof window.itemUsage !== "undefined" && window.itemUsage.useExpCandy) {
          const result = window.itemUsage.useExpCandy(id, expType);
          if (result.success) {
            addLog(result.message);
            markMonsDirty();
            render();
          } else {
            addLog(result.message, true);
          }
        }
        return;
      }

      const evoBtn = ev.target?.closest?.("button[data-mon-evo]");
      if (evoBtn && elMonDetail.contains(evoBtn)) {
        const id = Number(evoBtn.getAttribute("data-mon-evo"));
        const toPid = evoBtn.getAttribute("data-evo-to");
        if (!Number.isFinite(id) || !toPid) return;
        const m = (state.mons?.list ?? []).find((x) => x.id === id);
        if (!m) return;

        const beforeName = String(m.name || "");

        const reqLvl = getEvoReqLevel(m.pid, toPid);
        const fallbackReqLvl = defaultReqLvlByStage(m.pid);
        const effReqLvl = typeof reqLvl === "number" ? reqLvl : fallbackReqLvl;
        const needLvl = reqLvl === null ? fallbackReqLvl : effReqLvl;
        if (m.lvl < needLvl) return;

        const needRope = typeof isTradeEvo === "function" ? isTradeEvo(m.pid, toPid) : false;
        const needAff = !needRope && (typeof isAffectionEvo === "function" ? isAffectionEvo(m.pid, toPid) : false);
        if (needAff && !(typeof m.affection === "number" && m.affection >= 20)) return;
        const isStoneEvo = reqLvl === 0 && !needRope && !needAff;
        const reqRid = needRope ? "linkRope" : isStoneEvo ? "evolutionStone" : "evolutionEnergy";
        if ((state.res?.[reqRid]?.value ?? 0) < 1) return;
        state.res[reqRid].value = Math.max(0, (state.res?.[reqRid]?.value ?? 0) - 1);

        const ok = evolveMon(m, toPid);
        if (ok) {
          if (typeof onEvolve === "function") onEvolve();
          addLog(`进化成功：变为 ${m.name}`, true);
          if (typeof pushTickerEvent === "function") pushTickerEvent("evolve", `进化成功 ${beforeName} → ${m.name}`);
          ui.dexDirty = true;
          ui.captureDirty = true;
          markMonsDirty();
          render();
        }
      }
    });
  }
}
