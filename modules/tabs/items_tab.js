export function createRenderItems({ defs, getState, itemUsage, ui, render, markMonsDirty }) {
  return function renderItems() {
    const elItems = document.getElementById("items");
    if (!elItems) return;
    const state = getState();

    const effectTextByRid = {
      pokeball: "用于捕捉精灵",
      ultraball: "捕获率 x2",
      quickball: "首次遭遇捕获率 x5",
      luxuryball: "捕获后亲密度 +20",
      masterball: "用于捕捉精灵（必定成功）",
      futurecoin: "用于未来币商店兑换/升级",
      evolutionStone: "用于进化（消耗 x1）",
      megaStone: "用于MEGA进化",
      linkRope: "用于通信进化",
      rareCandy: "喂食精灵 +1Lv",
      bigBerry: "使用：全体精灵饱腹度 +50",
      hugeBerry: "使用：获得 24 小时巨大树果加成",
      expCandy: "使用：精灵获得 1000 经验",
      expCandyL: "使用：精灵获得 5000 经验",
      expCandyXL: "使用：精灵获得 20000 经验",
      affectionTreat: "使用：精灵亲密度 +5",
      friendshipBracelet: "使用：精灵亲密度直接达到 100",
      shinyCharm: "持有：闪光率 x2（可叠加）",
      luckyEgg: "使用：精灵获得1小时经验加成（1.5倍）",
      bottleCap: "使用：精灵单项个体值提升至31",
      goldBottleCap: "使用：精灵所有个体值提升至31（6V）",
      hpPotion: "使用：HP 永久 +5",
      atkPotion: "使用：攻击 永久 +5",
      defPotion: "使用：防御 永久 +5",
      spaPotion: "使用：特攻 永久 +5",
      spdPotion: "使用：特防 永久 +5",
      spePotion: "使用：速度 永久 +5",
    };

    if (!elItems.dataset.itemsInited) {
      elItems.dataset.itemsInited = "1";
      elItems.addEventListener("click", (ev) => {
        // 使用道具按钮
        const useBtn = ev.target?.closest?.("button[data-item-use]");
        if (useBtn && elItems.contains(useBtn)) {
          const rid = useBtn.getAttribute("data-item-use");
          if (!rid) return;

          // 简单道具（不需要选择精灵）
          if (rid === "bigBerry") {
            const have = state.res.bigBerry?.value ?? 0;
            if (have < 1) return;
            state.res.bigBerry.value = Math.max(0, have - 1);
            const list = state.mons?.list ?? [];
            for (const m of list) {
              if (!m || typeof m !== "object") continue;
              const sat0 = typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100;
              m.satiety = Math.max(0, Math.min(100, sat0 + 50));
            }
            renderItems();
            return;
          }

          if (rid === "hugeBerry") {
            const have = state.res.hugeBerry?.value ?? 0;
            if (have < 1) return;
            state.res.hugeBerry.value = Math.max(0, have - 1);
            if (!state.skills || typeof state.skills !== "object") {
              state.skills = { trainingStacks: [], normalBoostStacks: [], bullyHp: 100, hugeBerryBuffRemainingSec: 0 };
            }
            const rem0 =
              typeof state.skills.hugeBerryBuffRemainingSec === "number" && Number.isFinite(state.skills.hugeBerryBuffRemainingSec)
                ? state.skills.hugeBerryBuffRemainingSec
                : 0;
            state.skills.hugeBerryBuffRemainingSec = rem0 + 86400;
            renderItems();
            return;
          }

          // 需要选择精灵的道具
          const needMonSelection = [
            "expCandy", "expCandyL", "expCandyXL",
            "affectionTreat", "friendshipBracelet",
            "luckyEgg", "bottleCap", "goldBottleCap"
          ];

          if (needMonSelection.includes(rid)) {
            ui.itemUseModalOpen = true;
            ui.itemUseType = rid;
            ui.itemUseSelectedMon = null;
            ui.itemUseStatType = null;
            renderItems();
            return;
          }
        }

        // 关闭道具使用模态框
        const closeBtn = ev.target?.closest?.("button[data-item-modal-close]");
        if (closeBtn && elItems.contains(closeBtn)) {
          ui.itemUseModalOpen = false;
          ui.itemUseType = null;
          ui.itemUseSelectedMon = null;
          ui.itemUseStatType = null;
          renderItems();
          return;
        }

        // 选择精灵
        const monBtn = ev.target?.closest?.("button[data-select-mon]");
        if (monBtn && elItems.contains(monBtn)) {
          const monId = monBtn.getAttribute("data-select-mon");
          ui.itemUseSelectedMon = monId;
          renderItems();
          return;
        }

        // 选择属性（银色王冠）
        const statBtn = ev.target?.closest?.("button[data-select-stat]");
        if (statBtn && elItems.contains(statBtn)) {
          const statType = statBtn.getAttribute("data-select-stat");
          ui.itemUseStatType = statType;
          renderItems();
          return;
        }

        // 确认使用
        const confirmBtn = ev.target?.closest?.("button[data-item-confirm]");
        if (confirmBtn && elItems.contains(confirmBtn)) {
          if (!ui.itemUseType || !ui.itemUseSelectedMon) return;

          const itemType = ui.itemUseType;
          const monId = ui.itemUseSelectedMon;

          let result = { success: false, message: "未知错误" };

          if (["expCandy", "expCandyL", "expCandyXL"].includes(itemType)) {
            result = itemUsage.useExpCandy(monId, itemType);
          } else if (["affectionTreat", "friendshipBracelet"].includes(itemType)) {
            result = itemUsage.useAffectionItem(monId, itemType);
          } else if (itemType === "luckyEgg") {
            result = itemUsage.useLuckyEgg(monId);
          } else if (["bottleCap", "goldBottleCap"].includes(itemType)) {
            result = itemUsage.useBottleCap(monId, itemType, ui.itemUseStatType);
          }

          if (result.success) {
            ui.itemUseModalOpen = false;
            ui.itemUseType = null;
            ui.itemUseSelectedMon = null;
            ui.itemUseStatType = null;
            markMonsDirty();
            render();
          } else {
            alert(result.message);
          }
          return;
        }
      });
    }

    const items = [
      { rid: "pokeball", category: "捕捉" },
      { rid: "ultraball", category: "捕捉" },
      { rid: "quickball", category: "捕捉" },
      { rid: "luxuryball", category: "捕捉" },
      { rid: "masterball", category: "捕捉" },
      { rid: "futurecoin", category: "货币" },
      { rid: "evolutionStone", category: "进化" },
      { rid: "megaStone", category: "进化" },
      { rid: "linkRope", category: "进化" },
      { rid: "rareCandy", category: "培养" },
      { rid: "expCandy", category: "培养" },
      { rid: "expCandyL", category: "培养" },
      { rid: "expCandyXL", category: "培养" },
      { rid: "affectionTreat", category: "培养" },
      { rid: "friendshipBracelet", category: "培养" },
      { rid: "luckyEgg", category: "培养" },
      { rid: "bottleCap", category: "培养" },
      { rid: "goldBottleCap", category: "培养" },
      { rid: "bigBerry", category: "消耗品" },
      { rid: "hugeBerry", category: "消耗品" },
      { rid: "shinyCharm", category: "特殊" },
      { rid: "hpPotion", category: "药剂" },
      { rid: "atkPotion", category: "药剂" },
      { rid: "defPotion", category: "药剂" },
      { rid: "spaPotion", category: "药剂" },
      { rid: "spdPotion", category: "药剂" },
      { rid: "spePotion", category: "药剂" },
    ];

    const fmtInt = (n) => {
      if (typeof n !== "number" || Number.isNaN(n)) return "0";
      return String(Math.floor(n));
    };

    // 按分类分组道具
    const categories = {
      "捕捉": [],
      "货币": [],
      "进化": [],
      "培养": [],
      "消耗品": [],
      "特殊": [],
      "药剂": [],
    };

    for (const { rid, category } of items) {
      const v = state.res?.[rid]?.value ?? 0;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        if (categories[category]) {
          categories[category].push(rid);
        }
      }
    }

    const renderCategory = (catName, rids) => {
      if (rids.length === 0) return "";
      const rows = rids.map((rid) => {
        const def = defs.resources[rid];
        const r = state.res?.[rid];
        const name = def?.name ?? rid;
        const effect = typeof effectTextByRid[rid] === "string" ? effectTextByRid[rid] : "";
        const val = r ? fmtInt(r.value ?? 0) : "0";
        const explicitNoCap = Boolean(def?.noCap);
        const capN = r && typeof r.cap === "number" ? r.cap : def?.baseCap;
        const hasCap = !explicitNoCap && typeof capN === "number" && Number.isFinite(capN) && capN > 0;
        const cap = hasCap ? fmtInt(capN) : "";

        // 判断是否可以使用
        const needMonSelection = [
          "expCandy", "expCandyL", "expCandyXL",
          "affectionTreat", "friendshipBracelet",
          "luckyEgg", "bottleCap", "goldBottleCap"
        ];
        const simpleUse = ["bigBerry", "hugeBerry"];
        const canUse = (r?.value ?? 0) >= 1;
        const showUseBtn = simpleUse.includes(rid) || needMonSelection.includes(rid);
        const useBtn = showUseBtn
          ? `<button class="btn btn--small" data-item-use="${rid}" ${canUse ? "" : "disabled"}>使用</button>`
          : "";

        return `
          <div class="row">
            <div class="row__left">
              <div class="row__title">${name}</div>
              <div class="row__desc">${effect}</div>
            </div>
            <div class="row__right">
              <div class="badge">数量：${hasCap ? `${val} / ${cap}` : val}</div>
              ${useBtn}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="row">
          <div class="row__left">
            <div class="row__title">${catName}</div>
          </div>
        </div>
        ${rows}
      `;
    };

    let html = "";
    for (const [catName, rids] of Object.entries(categories)) {
      html += renderCategory(catName, rids);
    }

    // 道具使用模态框
    if (ui.itemUseModalOpen && ui.itemUseType) {
      const itemType = ui.itemUseType;
      const itemNames = {
        expCandy: "经验糖果",
        expCandyL: "经验糖果L",
        expCandyXL: "经验糖果XL",
        affectionTreat: "亲密点心",
        friendshipBracelet: "友谊手环",
        luckyEgg: "幸运蛋",
        bottleCap: "银色王冠",
        goldBottleCap: "金色王冠",
      };
      const itemName = itemNames[itemType] || itemType;

      // 获取精灵列表
      const monList = state.mons?.list ?? [];
      const monsHtml = monList.map(m => {
        const selected = ui.itemUseSelectedMon === m.id;
        return `
          <button class="btn ${selected ? "btn--primary" : "btn--ghost"} btn--small" data-select-mon="${m.id}">
            ${m.name} Lv.${m.lvl}
          </button>
        `;
      }).join("");

      // 如果是银色王冠，显示属性选择
      let statSelectHtml = "";
      if (itemType === "bottleCap" && ui.itemUseSelectedMon) {
        const mon = monList.find(m => m.id === ui.itemUseSelectedMon);
        if (mon && mon.ivs) {
          const statNames = {
            hp: "HP",
            atk: "攻击",
            def: "防御",
            spa: "特攻",
            spd: "特防",
            spe: "速度",
          };
          statSelectHtml = `
            <div class="row">
              <div class="row__left">
                <div class="row__title">选择要提升的属性</div>
              </div>
              <div class="row__right">
                ${Object.entries(statNames).map(([key, name]) => {
                  const iv = mon.ivs[key] || 0;
                  const selected = ui.itemUseStatType === key;
                  const maxed = iv >= 31;
                  return `
                    <button class="btn ${selected ? "btn--primary" : "btn--ghost"} btn--small" 
                            data-select-stat="${key}" ${maxed ? "disabled" : ""}>
                      ${name} (${iv}/31)
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }
      }

      const canConfirm = ui.itemUseSelectedMon && (itemType !== "bottleCap" || ui.itemUseStatType);

      html += `
        <div class="modalOverlay">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">使用 ${itemName}</div>
              <div class="modal__right">
                <button class="btn btn--small" data-item-modal-close>关闭</button>
              </div>
            </div>
            <div class="modal__body">
              <div class="row">
                <div class="row__left">
                  <div class="row__title">选择精灵</div>
                </div>
                <div class="row__right" style="flex-wrap: wrap; gap: 4px;">
                  ${monsHtml}
                </div>
              </div>
              ${statSelectHtml}
              <div class="row">
                <div class="row__left"></div>
                <div class="row__right">
                  <button class="btn btn--primary" data-item-confirm ${canConfirm ? "" : "disabled"}>确认使用</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    elItems.innerHTML = html;
  };
}
