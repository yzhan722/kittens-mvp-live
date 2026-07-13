export function createRenderFutureShop({ elFutureShop, ui, defs, fmt, getState, monthlyCard }) {
  return function renderFutureShop() {
    const state = getState();
    if (!elFutureShop) return;
    if (ui.activeTab !== "future") return;
    if (!ui.futureDirty) return;

    const badge = document.getElementById("futureCoinBadge");
    if (badge) {
      const fc = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
      badge.textContent = `未来币 ${typeof fmt === "function" ? fmt(fc) : fc}`;
    }

    const fmtRemain = (sec) => {
      const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      const pad2 = (x) => String(x).padStart(2, "0");
      if (hh > 0) return `${hh}:${pad2(mm)}:${pad2(ss)}`;
      return `${mm}:${pad2(ss)}`;
    };

    const rates = {
      catnip: 1000,
      wood: 500,
    };

    const AUTO_EX_MAX_LEVEL = 10;
    const autoExLvl0 = state.auto?.autoExchangeLevel ?? 0;
    const autoExLvl =
      typeof autoExLvl0 === "number" && Number.isFinite(autoExLvl0)
        ? Math.max(0, Math.min(AUTO_EX_MAX_LEVEL, Math.floor(autoExLvl0)))
        : 0;
    const autoExOn = Boolean(state.auto?.autoExchangeOn) && autoExLvl > 0;
    const autoExMinText = autoExLvl > 0 ? String(Math.round((100 / autoExLvl) * 100) / 100) : "-";

    const rows = [];
    const foldCfg = ui.futureShopFold && typeof ui.futureShopFold === "object" ? ui.futureShopFold : {};
    const foldDefaults = { daily: false, exchange: false, boost: true, permanent: true, item: true, package: true, auto: true, craft: true };
    const isFolded = (k) =>
      Boolean(
        foldCfg && Object.prototype.hasOwnProperty.call(foldCfg, k)
          ? foldCfg[k]
          : Object.prototype.hasOwnProperty.call(foldDefaults, k)
            ? foldDefaults[k]
            : true
      );
    const sectionHeader = (k, title) => {
      const folded = isFolded(k);
      const icon = folded ? "▸" : "▾";
      return `
        <div class="sidebar__sectionTitleRow">
          <div class="sidebar__sectionTitle">${title}</div>
          <button class="btn btn--small btn--ghost" data-fc-fold="${k}">${icon}</button>
        </div>
      `;
    };

    const dailyRows = [];
    const exchangeRows = [];
    const autoRows = [];
    const craftRows = [];
    const packageRows = [];
    const boostRows = [];
    const permanentRows = [];
    const itemRows = [];

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">当前未来币</div>
          <div class="row__desc">可用树果/球果兑换未来币。</div>
          <div class="row__desc"><input class="chk" type="checkbox" data-auto-exchange ${autoExOn ? "checked" : ""} ${autoExLvl > 0 ? "" : "disabled"} /> 自动兑币${autoExLvl > 0 ? `（每 ${autoExMinText} 分钟）` : "（需升级）"}</div>
        </div>
        <div class="row__right">
          <div class="badge">当前未来币：${fmt(state.res.futurecoin.value)}</div>
        </div>
      </div>
    `);

    {
      const today = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      const claimed = state.meta.dailyFreeFcDate === today;
      dailyRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">每日免费未来币</div>
            <div class="row__desc">每天可领 +5 未来币（本地日界）。</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-fc-daily-free ${claimed ? "disabled" : ""}>${claimed ? "今日已领" : "领取 +5"}</button>
          </div>
        </div>
      `);
      const dealBought = state.meta.shopDailyDealDate === today;
      const haveFc = Math.max(0, Math.floor(state.res.futurecoin?.value ?? 0));
      const dealOk = !dealBought && haveFc >= 3;
      dailyRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">今日特惠小包</div>
            <div class="row__desc">半价：花 3 未来币得 +10 未来币（每日限一次，诚实小赚）。</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-fc-daily-deal ${dealOk ? "" : "disabled"}>${dealBought ? "今日已购" : "购买（3→+10）"}</button>
          </div>
        </div>
      `);
      const spinClaimed = state.meta.dailySpinDate === today;
      dailyRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">每日幸运转盘</div>
            <div class="row__desc">免费转一次：未来币或大树果（加权随机，诚实表）。</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-fc-daily-spin ${spinClaimed ? "disabled" : ""}>${spinClaimed ? "今日已转" : "免费转一次"}</button>
          </div>
        </div>
      `);
      const triple = (() => {
        const free = state.meta.dailyFreeFcDate === today;
        const spin = state.meta.dailySpinDate === today;
        const n = (free ? 1 : 0) + (spin ? 1 : 0);
        const claimed = state.meta.shopTripleClaimDate === today;
        return { n, claimed, canClaim: n >= 2 && !claimed };
      })();
      dailyRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">每日双礼</div>
            <div class="row__desc">免费币 + 转盘全做完（${triple.n}/2）→ 额外 +15 未来币</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary btn--small" data-fc-daily-triple ${triple.canClaim ? "" : "disabled"}>${triple.claimed ? "双礼已领" : "领取双礼 +15"}</button>
          </div>
        </div>
      `);
    }

    // 月卡（每日签到已并入上方「每日任务」领取，避免双入口）
    if (monthlyCard) {
      const cardInfo = monthlyCard.getInfo();
      const rewardText = Object.entries(cardInfo.dailyReward)
        .map(([k, v]) => {
          const resName = defs.resources[k]?.name || k;
          return `${resName} +${v}`;
        })
        .join("、");
      const fc30 = cardInfo.totalFuturecoin30d ?? cardInfo.dailyFuturecoin * (cardInfo.durationDays ?? 30);
      const expiringSoon = cardInfo.active && cardInfo.remainingDays <= 3;

      if (cardInfo.active) {
        dailyRows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">月卡特权${expiringSoon ? ' <span class="hint--warn">即将到期</span>' : ""}</div>
              <div class="row__desc">剩余 ${cardInfo.remainingDays} 天 · 已领取 ${cardInfo.totalClaimed} 次</div>
              <div class="row__desc">每日奖励：${rewardText}</div>
              <div class="row__desc"><span class="badge badge--ok">30天累计约 ${fc30} 未来币 + 道具</span></div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary" data-monthly-claim ${cardInfo.canClaim ? "" : "disabled"}>${cardInfo.canClaim ? "领取今日奖励" : "今日已领取"}</button>
              <button class="btn btn--small" data-monthly-renew>续费 ${cardInfo.durationDays ?? 30} 天（${cardInfo.price}币）</button>
            </div>
          </div>
        `);
      } else {
        dailyRows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title">月卡特权（未激活）</div>
              <div class="row__desc">每日可领：${rewardText}</div>
              <div class="row__desc"><span class="badge badge--ok">${cardInfo.durationDays ?? 30}天共 ${fc30} 未来币 + 道具 · 售价 ${cardInfo.price} 未来币</span></div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary" data-monthly-buy>开通月卡（${cardInfo.price}币）</button>
            </div>
          </div>
        `);
      }
    }

    for (const [rid, perCoin] of Object.entries(rates)) {
      const def = defs.resources[rid];
      if (!def) continue;
      const have = state.res[rid]?.value ?? 0;
      const maxCoins = Math.max(0, Math.floor(have / perCoin));
      const can1 = have >= perCoin;
      const canMax = maxCoins >= 1;
      exchangeRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">${def.name}</div>
            <div class="row__desc">${perCoin} ${def.name} = 1 未来币（当前 ${fmt(have)}）</div>
          </div>
          <div class="row__right">
            <button class="btn btn--small" data-fc="${rid}" data-fc-qty="1" ${can1 ? "" : "disabled"}>兑换 1</button>
            <button class="btn btn--primary" data-fc="${rid}" data-fc-qty="max" ${canMax ? "" : "disabled"}>兑换全部（+${maxCoins}）</button>
          </div>
        </div>
      `);
    }

    const candyPrice = 50;
    const candyQty = 1;
    const candyPrice10 = 500;
    const candyQty10 = 10;
    const canBuyCandy = (state.res.futurecoin?.value ?? 0) >= candyPrice;
    const canBuyCandy10 = (state.res.futurecoin?.value ?? 0) >= candyPrice10;
    exchangeRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">兑换神奇糖果</div>
          <div class="row__desc">${candyPrice} 未来币 = 神奇糖果 x${candyQty}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-buy="rareCandy" data-fc-price="${candyPrice}" data-fc-amount="${candyQty}" ${canBuyCandy ? "" : "disabled"}>兑换1个</button>
          <button class="btn btn--small" data-fc-buy="rareCandy" data-fc-price="${candyPrice10}" data-fc-amount="${candyQty10}" ${canBuyCandy10 ? "" : "disabled"}>兑换10个</button>
        </div>
      </div>
    `);

    const autoPrice = 100;
    const autoUnlocked = Boolean(state.unlocks?.autoResearch);
    const autoBuildPrice = 100;
    const autoBuildUnlocked = Boolean(state.unlocks?.autoBuild);
    const autoCraftPrice = 200;
    const autoCraftUnlocked = Boolean(state.unlocks?.autoCraft);
    const autoBallPrice = 200;
    const autoBallUnlocked = Boolean(state.unlocks?.autoBall);

    if (!autoBuildUnlocked) {
      const canBuyAutoBuild = (state.res.futurecoin?.value ?? 0) >= autoBuildPrice;
      autoRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">自动建造</div>
            <div class="row__desc">一次性解锁：${autoBuildPrice} 未来币</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-fc-buy="autoBuild" data-fc-price="${autoBuildPrice}" data-fc-amount="1" ${canBuyAutoBuild ? "" : "disabled"}>解锁</button>
          </div>
        </div>
      `);
    }

    if (!autoUnlocked) {
      const canBuyAuto = (state.res.futurecoin?.value ?? 0) >= autoPrice;
      autoRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">自动科研</div>
            <div class="row__desc">一次性解锁：${autoPrice} 未来币</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-fc-buy="autoResearch" data-fc-price="${autoPrice}" data-fc-amount="1" ${canBuyAuto ? "" : "disabled"}>解锁</button>
          </div>
        </div>
      `);
    }

    if (!autoCraftUnlocked) {
      const canBuyAutoCraft = (state.res.futurecoin?.value ?? 0) >= autoCraftPrice;
      autoRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">自动合成</div>
            <div class="row__desc">一次性解锁：${autoCraftPrice} 未来币</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-fc-buy="autoCraft" data-fc-price="${autoCraftPrice}" data-fc-amount="1" ${canBuyAutoCraft ? "" : "disabled"}>解锁</button>
          </div>
        </div>
      `);
    }

    if (!autoBallUnlocked) {
      const canBuyAutoBall = (state.res.futurecoin?.value ?? 0) >= autoBallPrice;
      autoRows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title">自动搓球</div>
            <div class="row__desc">一次性解锁：${autoBallPrice} 未来币</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-fc-buy="autoBall" data-fc-price="${autoBallPrice}" data-fc-amount="1" ${canBuyAutoBall ? "" : "disabled"}>解锁</button>
          </div>
        </div>
      `);
    }

    const autoExPrice = 1000;
    const canUpAutoEx = (state.res.futurecoin?.value ?? 0) >= autoExPrice;
    const autoExMaxed = autoExLvl >= AUTO_EX_MAX_LEVEL;
    autoRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">自动兑币</div>
          <div class="row__desc">等级：Lv.${autoExLvl}（上限${AUTO_EX_MAX_LEVEL}）· 每级消耗 ${autoExPrice} 未来币</div>
          <div class="row__desc">效果：每（100/等级）分钟自动把树果、球果全部兑换未来币${autoExLvl > 0 ? `（当前约每 ${autoExMinText} 分钟）` : ""}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-autoex-up="1" data-fc-price="${autoExPrice}" ${canUpAutoEx && !autoExMaxed ? "" : "disabled"}>升级</button>
        </div>
      </div>
    `);

    const expBoostRem = typeof state.expBoostRemainingSec === "number" && Number.isFinite(state.expBoostRemainingSec) ? state.expBoostRemainingSec : 0;
    const expBoostPrice1 = 10;
    const expBoostPrice10 = 100;
    const expBoostSec1 = 3600;
    const expBoostSec10 = 36000;
    const canBuyBoost1 = (state.res.futurecoin?.value ?? 0) >= expBoostPrice1;
    const canBuyBoost10 = (state.res.futurecoin?.value ?? 0) >= expBoostPrice10;
    boostRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">经验加成（全局双倍，限时）</div>
          <div class="row__desc">价格：${expBoostPrice1} 未来币/1小时 · ${expBoostPrice10} 未来币/10小时</div>
          <div class="row__desc">生效期：所有精灵获得双倍经验。可叠加累积时长。</div>
          <div class="row__desc">剩余时间：${expBoostRem > 0 ? fmtRemain(expBoostRem) : "无"}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-fc-boost="exp2" data-fc-price="${expBoostPrice1}" data-fc-sec="${expBoostSec1}" ${canBuyBoost1 ? "" : "disabled"}>兑换一小时（${expBoostPrice1}币）</button>
          <button class="btn btn--primary" data-fc-boost="exp2" data-fc-price="${expBoostPrice10}" data-fc-sec="${expBoostSec10}" ${canBuyBoost10 ? "" : "disabled"}>兑换十小时（${expBoostPrice10}币）</button>
        </div>
      </div>
    `);

    // 捕获率加成
    const captureBoostRem = typeof state.captureBoostRemainingSec === "number" && Number.isFinite(state.captureBoostRemainingSec) ? state.captureBoostRemainingSec : 0;
    const captureBoostPrice1 = 15;
    const captureBoostPrice10 = 150;
    const captureBoostSec1 = 3600;
    const captureBoostSec10 = 36000;
    const canBuyCaptureBoost1 = (state.res.futurecoin?.value ?? 0) >= captureBoostPrice1;
    const canBuyCaptureBoost10 = (state.res.futurecoin?.value ?? 0) >= captureBoostPrice10;
    boostRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">捕获率提升（限时）</div>
          <div class="row__desc">价格：${captureBoostPrice1} 未来币/1小时 · ${captureBoostPrice10} 未来币/10小时</div>
          <div class="row__desc">生效期：捕获率 +20%。可叠加累积时长。</div>
          <div class="row__desc">剩余时间：${captureBoostRem > 0 ? fmtRemain(captureBoostRem) : "无"}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-fc-boost="capture" data-fc-price="${captureBoostPrice1}" data-fc-sec="${captureBoostSec1}" ${canBuyCaptureBoost1 ? "" : "disabled"}>兑换一小时（${captureBoostPrice1}币）</button>
          <button class="btn btn--primary" data-fc-boost="capture" data-fc-price="${captureBoostPrice10}" data-fc-sec="${captureBoostSec10}" ${canBuyCaptureBoost10 ? "" : "disabled"}>兑换十小时（${captureBoostPrice10}币）</button>
        </div>
      </div>
    `);

    // 资源产量加成
    const prodBoostRem = typeof state.prodBoostRemainingSec === "number" && Number.isFinite(state.prodBoostRemainingSec) ? state.prodBoostRemainingSec : 0;
    const prodBoostPrice1 = 20;
    const prodBoostPrice10 = 200;
    const prodBoostSec1 = 3600;
    const prodBoostSec10 = 36000;
    const canBuyProdBoost1 = (state.res.futurecoin?.value ?? 0) >= prodBoostPrice1;
    const canBuyProdBoost10 = (state.res.futurecoin?.value ?? 0) >= prodBoostPrice10;
    boostRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">资源产量加成（限时）</div>
          <div class="row__desc">价格：${prodBoostPrice1} 未来币/1小时 · ${prodBoostPrice10} 未来币/10小时</div>
          <div class="row__desc">生效期：所有资源产量 +50%。可叠加累积时长。</div>
          <div class="row__desc">剩余时间：${prodBoostRem > 0 ? fmtRemain(prodBoostRem) : "无"}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-fc-boost="production" data-fc-price="${prodBoostPrice1}" data-fc-sec="${prodBoostSec1}" ${canBuyProdBoost1 ? "" : "disabled"}>兑换一小时（${prodBoostPrice1}币）</button>
          <button class="btn btn--primary" data-fc-boost="production" data-fc-price="${prodBoostPrice10}" data-fc-sec="${prodBoostSec10}" ${canBuyProdBoost10 ? "" : "disabled"}>兑换十小时（${prodBoostPrice10}币）</button>
        </div>
      </div>
    `);

    // 资源礼包
    const smallPackPrice = 50;
    const canBuySmallPack = (state.res.futurecoin?.value ?? 0) >= smallPackPrice;
    packageRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">基础资源礼包</div>
          <div class="row__desc">价格：${smallPackPrice} 未来币</div>
          <div class="row__desc">内容：树果 x1000、球果 x500、进化石碎片 x50、精灵球 x10</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-package="small" data-fc-price="${smallPackPrice}" ${canBuySmallPack ? "" : "disabled"}>购买</button>
        </div>
      </div>
    `);

    const mediumPackPrice = 150;
    const canBuyMediumPack = (state.res.futurecoin?.value ?? 0) >= mediumPackPrice;
    packageRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">进阶资源礼包</div>
          <div class="row__desc">价格：${mediumPackPrice} 未来币</div>
          <div class="row__desc">内容：大树果 x20、进化能量 x10、进化石 x3、神奇糖果 x5</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-package="medium" data-fc-price="${mediumPackPrice}" ${canBuyMediumPack ? "" : "disabled"}>购买</button>
        </div>
      </div>
    `);

    const largePackPrice = 500;
    const canBuyLargePack = (state.res.futurecoin?.value ?? 0) >= largePackPrice;
    packageRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">豪华资源礼包</div>
          <div class="row__desc">价格：${largePackPrice} 未来币</div>
          <div class="row__desc">内容：巨大树果 x10、MEGA进化石 x2、通信绳 x3、大师球 x1、神奇糖果 x20</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-package="large" data-fc-price="${largePackPrice}" ${canBuyLargePack ? "" : "disabled"}>购买</button>
        </div>
      </div>
    `);

    // 特殊道具
    const masterballPrice = 2000;
    const canBuyMasterball = (state.res.futurecoin?.value ?? 0) >= masterballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">大师球</div>
          <div class="row__desc">价格：${masterballPrice} 未来币/个</div>
          <div class="row__desc">效果：100% 捕获任何精灵</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.masterball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="masterball" data-fc-price="${masterballPrice}" data-fc-amount="1" ${canBuyMasterball ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    // 特殊精灵球
    const ultraballPrice = 150;
    const canBuyUltraball = (state.res.futurecoin?.value ?? 0) >= ultraballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">高级球</div>
          <div class="row__desc">价格：${ultraballPrice} 未来币/10个</div>
          <div class="row__desc">效果：捕获率 x2（比普通精灵球更强）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.ultraball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="ultraball" data-fc-price="${ultraballPrice}" data-fc-amount="10" ${canBuyUltraball ? "" : "disabled"}>购买10个</button>
        </div>
      </div>
    `);

    const quickballPrice = 300;
    const canBuyQuickball = (state.res.futurecoin?.value ?? 0) >= quickballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">先机球</div>
          <div class="row__desc">价格：${quickballPrice} 未来币/5个</div>
          <div class="row__desc">效果：首次遭遇时捕获率 x5</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.quickball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="quickball" data-fc-price="${quickballPrice}" data-fc-amount="5" ${canBuyQuickball ? "" : "disabled"}>购买5个</button>
        </div>
      </div>
    `);

    const luxuryballPrice = 400;
    const canBuyLuxuryball = (state.res.futurecoin?.value ?? 0) >= luxuryballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">豪华球</div>
          <div class="row__desc">价格：${luxuryballPrice} 未来币/5个</div>
          <div class="row__desc">效果：捕获后精灵初始亲密度 +20</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.luxuryball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="luxuryball" data-fc-price="${luxuryballPrice}" data-fc-amount="5" ${canBuyLuxuryball ? "" : "disabled"}>购买5个</button>
        </div>
      </div>
    `);

    // 经验道具
    const expCandyPrice = 100;
    const canBuyExpCandy = (state.res.futurecoin?.value ?? 0) >= expCandyPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">经验糖果</div>
          <div class="row__desc">价格：${expCandyPrice} 未来币/10个</div>
          <div class="row__desc">效果：使用后精灵获得 1000 经验值</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.expCandy?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="expCandy" data-fc-price="${expCandyPrice}" data-fc-amount="10" ${canBuyExpCandy ? "" : "disabled"}>购买10个</button>
        </div>
      </div>
    `);

    const expCandyLPrice = 400;
    const canBuyExpCandyL = (state.res.futurecoin?.value ?? 0) >= expCandyLPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">经验糖果L</div>
          <div class="row__desc">价格：${expCandyLPrice} 未来币/5个</div>
          <div class="row__desc">效果：使用后精灵获得 5000 经验值</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.expCandyL?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="expCandyL" data-fc-price="${expCandyLPrice}" data-fc-amount="5" ${canBuyExpCandyL ? "" : "disabled"}>购买5个</button>
        </div>
      </div>
    `);

    const expCandyXLPrice = 1200;
    const canBuyExpCandyXL = (state.res.futurecoin?.value ?? 0) >= expCandyXLPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">经验糖果XL</div>
          <div class="row__desc">价格：${expCandyXLPrice} 未来币/3个</div>
          <div class="row__desc">效果：使用后精灵获得 20000 经验值</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.expCandyXL?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="expCandyXL" data-fc-price="${expCandyXLPrice}" data-fc-amount="3" ${canBuyExpCandyXL ? "" : "disabled"}>购买3个</button>
        </div>
      </div>
    `);

    // 亲密度道具
    const affectionTreatPrice = 200;
    const canBuyAffectionTreat = (state.res.futurecoin?.value ?? 0) >= affectionTreatPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">亲密点心</div>
          <div class="row__desc">价格：${affectionTreatPrice} 未来币/10个</div>
          <div class="row__desc">效果：使用后精灵亲密度 +5</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.affectionTreat?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="affectionTreat" data-fc-price="${affectionTreatPrice}" data-fc-amount="10" ${canBuyAffectionTreat ? "" : "disabled"}>购买10个</button>
        </div>
      </div>
    `);

    const friendshipBraceletPrice = 800;
    const canBuyFriendshipBracelet = (state.res.futurecoin?.value ?? 0) >= friendshipBraceletPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">友谊手环</div>
          <div class="row__desc">价格：${friendshipBraceletPrice} 未来币/个</div>
          <div class="row__desc">效果：使用后精灵亲密度直接提升至 100</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.friendshipBracelet?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="friendshipBracelet" data-fc-price="${friendshipBraceletPrice}" data-fc-amount="1" ${canBuyFriendshipBracelet ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    // 特殊功能道具
    const shinyCharmPrice = 100000;
    const canBuyShinyCharm = (state.res.futurecoin?.value ?? 0) >= shinyCharmPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">闪耀护符</div>
          <div class="row__desc">价格：${shinyCharmPrice} 未来币/个</div>
          <div class="row__desc">效果：使用后消耗1个，闪光精灵出现率 x2（持续24小时）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.shinyCharm?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="shinyCharm" data-fc-price="${shinyCharmPrice}" data-fc-amount="1" ${canBuyShinyCharm ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const luckyEggPrice = 1500;
    const canBuyLuckyEgg = (state.res.futurecoin?.value ?? 0) >= luckyEggPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">幸运蛋</div>
          <div class="row__desc">价格：${luckyEggPrice} 未来币/个</div>
          <div class="row__desc">效果：对指定精灵使用，1小时经验 x1.5（与上方「全局双倍」可叠加）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.luckyEgg?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="luckyEgg" data-fc-price="${luckyEggPrice}" data-fc-amount="1" ${canBuyLuckyEgg ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const bottleCapPrice = 1000;
    const canBuyBottleCap = (state.res.futurecoin?.value ?? 0) >= bottleCapPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">银色王冠</div>
          <div class="row__desc">价格：${bottleCapPrice} 未来币/个</div>
          <div class="row__desc">效果：将精灵单项个体值提升至31（最大）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.bottleCap?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="bottleCap" data-fc-price="${bottleCapPrice}" data-fc-amount="1" ${canBuyBottleCap ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const goldBottleCapPrice = 5000;
    const canBuyGoldBottleCap = (state.res.futurecoin?.value ?? 0) >= goldBottleCapPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">金色王冠</div>
          <div class="row__desc">价格：${goldBottleCapPrice} 未来币/个</div>
          <div class="row__desc">效果：将精灵所有个体值提升至31（6V）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.goldBottleCap?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="goldBottleCap" data-fc-price="${goldBottleCapPrice}" data-fc-amount="1" ${canBuyGoldBottleCap ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const netballPrice = 250;
    const canBuyNetball = (state.res.futurecoin?.value ?? 0) >= netballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">捕网球</div>
          <div class="row__desc">价格：${netballPrice} 未来币/5个</div>
          <div class="row__desc">效果：对虫/水/草属性捕获率 ×3</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.netball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="netball" data-fc-price="${netballPrice}" data-fc-amount="5" ${canBuyNetball ? "" : "disabled"}>购买5个</button>
        </div>
      </div>
    `);

    const duskballPrice = 280;
    const canBuyDuskball = (state.res.futurecoin?.value ?? 0) >= duskballPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">黑暗球</div>
          <div class="row__desc">价格：${duskballPrice} 未来币/5个</div>
          <div class="row__desc">效果：夜间（18:00–06:00）捕获率 ×3，其余时段 ×1.2</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.duskball?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="duskball" data-fc-price="${duskballPrice}" data-fc-amount="5" ${canBuyDuskball ? "" : "disabled"}>购买5个</button>
        </div>
      </div>
    `);

    const energyDrinkPrice = 45;
    const canBuyEnergyDrink = (state.res.futurecoin?.value ?? 0) >= energyDrinkPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">能量饮料</div>
          <div class="row__desc">价格：${energyDrinkPrice} 未来币/个</div>
          <div class="row__desc">效果：使用后采集充能 +250（上限 1000）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.energyDrink?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="energyDrink" data-fc-price="${energyDrinkPrice}" data-fc-amount="1" ${canBuyEnergyDrink ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const searchFlarePrice = 55;
    const canBuySearchFlare = (state.res.futurecoin?.value ?? 0) >= searchFlarePrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">搜索信号弹</div>
          <div class="row__desc">价格：${searchFlarePrice} 未来币/个</div>
          <div class="row__desc">效果：使用后遭遇充能 +25（上限 100）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.searchFlare?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="searchFlare" data-fc-price="${searchFlarePrice}" data-fc-amount="1" ${canBuySearchFlare ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const advSearchCellPrice = 120;
    const canBuyAdvSearchCell = (state.res.futurecoin?.value ?? 0) >= advSearchCellPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">高级搜索电池</div>
          <div class="row__desc">价格：${advSearchCellPrice} 未来币/个</div>
          <div class="row__desc">效果：使用后高级搜索次数 +2</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.advSearchCell?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="advSearchCell" data-fc-price="${advSearchCellPrice}" data-fc-amount="1" ${canBuyAdvSearchCell ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const sootheBellPrice = 400;
    const canBuySootheBell = (state.res.futurecoin?.value ?? 0) >= sootheBellPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">安抚之铃</div>
          <div class="row__desc">价格：${sootheBellPrice} 未来币/个</div>
          <div class="row__desc">效果：使用后全体精灵亲密度 +3</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.sootheBell?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="sootheBell" data-fc-price="${sootheBellPrice}" data-fc-amount="1" ${canBuySootheBell ? "" : "disabled"}>购买1个</button>
        </div>
      </div>
    `);

    const expCandySPrice = 80;
    const canBuyExpCandyS = (state.res.futurecoin?.value ?? 0) >= expCandySPrice;
    itemRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">经验糖果S</div>
          <div class="row__desc">价格：${expCandySPrice} 未来币/20个</div>
          <div class="row__desc">效果：使用后指定精灵获得 200 经验</div>
        </div>
        <div class="row__right">
          <div class="badge">当前：${fmt(state.res.expCandyS?.value ?? 0)}</div>
          <button class="btn btn--primary" data-fc-buy="expCandyS" data-fc-price="${expCandySPrice}" data-fc-amount="20" ${canBuyExpCandyS ? "" : "disabled"}>购买20个</button>
        </div>
      </div>
    `);

    // 药剂礼包
    const potionPackPrice = 100;
    const canBuyPotionPack = (state.res.futurecoin?.value ?? 0) >= potionPackPrice;
    packageRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">药剂礼包</div>
          <div class="row__desc">价格：${potionPackPrice} 未来币</div>
          <div class="row__desc">内容：各属性药剂（HP/攻击/防御/特攻/特防/速度）各 x5</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-package="potion" data-fc-price="${potionPackPrice}" ${canBuyPotionPack ? "" : "disabled"}>购买</button>
        </div>
      </div>
    `);

    // 永久增益
    const MAX_PERM_LEVEL = 10;
    const permExpLvl = typeof state.permanentBoosts?.exp === "number" ? Math.max(0, Math.min(MAX_PERM_LEVEL, Math.floor(state.permanentBoosts.exp))) : 0;
    const permExpPrice = 500;
    const canUpPermExp = (state.res.futurecoin?.value ?? 0) >= permExpPrice && permExpLvl < MAX_PERM_LEVEL;
    permanentRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">永久经验加成</div>
          <div class="row__desc">等级：Lv.${permExpLvl}/${MAX_PERM_LEVEL} · 每级消耗 ${permExpPrice} 未来币</div>
          <div class="row__desc">效果：所有精灵获得经验 +${permExpLvl * 10}%（每级 +10%）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-perm="exp" data-fc-price="${permExpPrice}" ${canUpPermExp ? "" : "disabled"}>${permExpLvl >= MAX_PERM_LEVEL ? "已满级" : "升级"}</button>
        </div>
      </div>
    `);

    const permCaptureLvl = typeof state.permanentBoosts?.capture === "number" ? Math.max(0, Math.min(MAX_PERM_LEVEL, Math.floor(state.permanentBoosts.capture))) : 0;
    const permCapturePrice = 600;
    const canUpPermCapture = (state.res.futurecoin?.value ?? 0) >= permCapturePrice && permCaptureLvl < MAX_PERM_LEVEL;
    permanentRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">永久捕获加成</div>
          <div class="row__desc">等级：Lv.${permCaptureLvl}/${MAX_PERM_LEVEL} · 每级消耗 ${permCapturePrice} 未来币</div>
          <div class="row__desc">效果：捕获率 +${permCaptureLvl * 5}%（每级 +5%）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-perm="capture" data-fc-price="${permCapturePrice}" ${canUpPermCapture ? "" : "disabled"}>${permCaptureLvl >= MAX_PERM_LEVEL ? "已满级" : "升级"}</button>
        </div>
      </div>
    `);

    const permProdLvl = typeof state.permanentBoosts?.production === "number" ? Math.max(0, Math.min(MAX_PERM_LEVEL, Math.floor(state.permanentBoosts.production))) : 0;
    const permProdPrice = 700;
    const canUpPermProd = (state.res.futurecoin?.value ?? 0) >= permProdPrice && permProdLvl < MAX_PERM_LEVEL;
    permanentRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">永久资源产量加成</div>
          <div class="row__desc">等级：Lv.${permProdLvl}/${MAX_PERM_LEVEL} · 每级消耗 ${permProdPrice} 未来币</div>
          <div class="row__desc">效果：所有资源产量 +${permProdLvl * 10}%（每级 +10%）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-perm="production" data-fc-price="${permProdPrice}" ${canUpPermProd ? "" : "disabled"}>${permProdLvl >= MAX_PERM_LEVEL ? "已满级" : "升级"}</button>
        </div>
      </div>
    `);

    const permCapLvl = typeof state.permanentBoosts?.capacity === "number" ? Math.max(0, Math.min(MAX_PERM_LEVEL, Math.floor(state.permanentBoosts.capacity))) : 0;
    const permCapPrice = 800;
    const canUpPermCap = (state.res.futurecoin?.value ?? 0) >= permCapPrice && permCapLvl < MAX_PERM_LEVEL;
    permanentRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">永久资源上限加成</div>
          <div class="row__desc">等级：Lv.${permCapLvl}/${MAX_PERM_LEVEL} · 每级消耗 ${permCapPrice} 未来币</div>
          <div class="row__desc">效果：所有资源上限 +${permCapLvl * 10}%（每级 +10%）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-perm="capacity" data-fc-price="${permCapPrice}" ${canUpPermCap ? "" : "disabled"}>${permCapLvl >= MAX_PERM_LEVEL ? "已满级" : "升级"}</button>
        </div>
      </div>
    `);


    const permEncPlusLvl = typeof state.permanentBoosts?.encPlusMax === "number" ? Math.max(0, Math.min(20, Math.floor(state.permanentBoosts.encPlusMax))) : 0;
    const permEncPlusPrice = 1000;
    const canUpPermEncPlus = (state.res.futurecoin?.value ?? 0) >= permEncPlusPrice && permEncPlusLvl < 20;
    permanentRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">永久高级搜索上限</div>
          <div class="row__desc">等级：Lv.${permEncPlusLvl}/20 · 每级消耗 ${permEncPlusPrice} 未来币</div>
          <div class="row__desc">效果：高级遭遇次数上限 +1（当前上限 ${10 + permEncPlusLvl} 次）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--primary" data-fc-perm="encPlusMax" data-fc-price="${permEncPlusPrice}" ${canUpPermEncPlus ? "" : "disabled"}>${permEncPlusLvl >= 20 ? "已满级" : "升级"}</button>
        </div>
      </div>
    `);

    // 合成进化石
    const bigBerryCost = 50;
    const canCraftBigBerry = (state.res.catnip?.value ?? 0) >= bigBerryCost;
    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">制作大树果</div>
          <div class="row__desc">消耗：树果 x${bigBerryCost} → 大树果 x1（立即完成）</div>
        </div>
        <div class="row__right">
          <div class="badge">当前树果：${fmt(state.res.catnip?.value ?? 0)}</div>
          <div class="badge">当前大树果：${fmt(state.res.bigBerry?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="bigBerry" ${canCraftBigBerry ? "" : "disabled"}>制作</button>
        </div>
      </div>
    `);

    // 合成进化石
    const madeStone0 =
      typeof state.evolutionStoneMade === "number" && Number.isFinite(state.evolutionStoneMade)
        ? Math.max(0, Math.floor(state.evolutionStoneMade))
        : 0;
    const stoneCost = Math.min(10000, 500 + madeStone0 * 10);
    const stoneTime = 1800; // 30分钟 = 1800秒
    const hasMinerals = (state.res.minerals?.value ?? 0) >= stoneCost;
    const craftObj = state.crafting && typeof state.crafting === "object" ? state.crafting : null;
    const stoneTask =
      craftObj && craftObj.evolutionEnergy && typeof craftObj.evolutionEnergy === "object"
        ? craftObj.evolutionEnergy
        : craftObj && craftObj.evolutionStone && typeof craftObj.evolutionStone === "object"
          ? craftObj.evolutionStone
          : null;
    const isCrafting = Boolean(stoneTask && typeof stoneTask.remainingSec === "number" && stoneTask.remainingSec > 0);
    const remainingSec = isCrafting ? stoneTask.remainingSec : 0;
    const totalSec = isCrafting && typeof stoneTask.totalSec === "number" && stoneTask.totalSec > 0 ? stoneTask.totalSec : stoneTime;
    const canStart = hasMinerals && !isCrafting;
    const progress = isCrafting ? Math.max(0, Math.min(100, ((totalSec - remainingSec) / totalSec) * 100)) : 0;
    const timeText = remainingSec > 0 ? `${Math.ceil(remainingSec)}秒` : "完成";
    const stoneBlockedText = !hasMinerals ? "碎片不足" : isCrafting ? "合成中" : "";
    const stoneBtnText = isCrafting ? "合成中..." : stoneBlockedText ? stoneBlockedText : "开始合成";
    const autoCraftOn = Boolean(state.unlocks?.autoCraft);
    const autoCraftCfg = state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : {};
    const autoCraftEnergy = Boolean(autoCraftCfg.evolutionEnergy);
    
    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">合成进化能量</div>
          ${autoCraftOn ? `<div class="row__desc"><input class="chk" type="checkbox" data-auto-craft="evolutionEnergy" ${autoCraftEnergy ? "checked" : ""} /> 自动合成</div>` : ""}
          <div class="row__desc">消耗：进化石碎片 x${stoneCost}，耗时：30分钟</div>
          ${isCrafting ? `<div class="row__desc" style="margin-top: 4px;">进度：${Math.round(progress)}% · 剩余：${timeText}</div>` : ""}
        </div>
        <div class="row__right">
          <div class="badge">当前碎片：${fmt(state.res.minerals?.value ?? 0)}</div>
          <div class="badge">当前进化能量：${fmt(state.res.evolutionEnergy?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="evolutionEnergy" ${canStart ? "" : "disabled"}>${stoneBtnText}</button>
        </div>
      </div>
    `);

    // 10进化能量 -> 1进化石
    const toStoneCostEnergy = 10;
    const canToStone = (state.res.evolutionEnergy?.value ?? 0) >= toStoneCostEnergy;
    const autoCraftStone = Boolean(autoCraftCfg.evolutionStone);
    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">合成进化石</div>
          ${autoCraftOn ? `<div class="row__desc"><input class="chk" type="checkbox" data-auto-craft="evolutionStone" ${autoCraftStone ? "checked" : ""} /> 自动合成</div>` : ""}
          <div class="row__desc">消耗：进化能量 x${toStoneCostEnergy} → 进化石 x1</div>
        </div>
        <div class="row__right">
          <div class="badge">当前进化能量：${fmt(state.res.evolutionEnergy?.value ?? 0)}</div>
          <div class="badge">当前进化石：${fmt(state.res.evolutionStone?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="energyToStone" ${canToStone ? "" : "disabled"}>兑换</button>
        </div>
      </div>
    `);

    // 合成通信绳
    const ropeCostStone = 3;
    const ropeTime = 3600; // 60分钟
    const hasStone = (state.res.evolutionStone?.value ?? 0) >= ropeCostStone;
    const ropeTask = craftObj && craftObj.linkRope && typeof craftObj.linkRope === "object" ? craftObj.linkRope : null;
    const isRopeCrafting = Boolean(ropeTask && typeof ropeTask.remainingSec === "number" && ropeTask.remainingSec > 0);
    const ropeRemainingSec = isRopeCrafting ? ropeTask.remainingSec : 0;
    const ropeTotalSec = isRopeCrafting && typeof ropeTask.totalSec === "number" && ropeTask.totalSec > 0 ? ropeTask.totalSec : ropeTime;
    const ropeCanStart = hasStone && !isRopeCrafting;
    const ropeProgress = isRopeCrafting ? Math.max(0, Math.min(100, ((ropeTotalSec - ropeRemainingSec) / ropeTotalSec) * 100)) : 0;
    const ropeTimeText = ropeRemainingSec > 0 ? `${Math.ceil(ropeRemainingSec)}秒` : "完成";
    const ropeBlockedText = !hasStone ? "进化石不足" : isRopeCrafting ? "合成中" : "";
    const ropeBtnText = isRopeCrafting ? "合成中..." : ropeBlockedText ? ropeBlockedText : "开始合成";
    const autoCraftRope = Boolean(autoCraftCfg.linkRope);

    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">合成通信绳</div>
          ${autoCraftOn ? `<div class="row__desc"><input class="chk" type="checkbox" data-auto-craft="linkRope" ${autoCraftRope ? "checked" : ""} /> 自动合成</div>` : ""}
          <div class="row__desc">消耗：进化石 x${ropeCostStone}，耗时：60分钟</div>
          ${isRopeCrafting ? `<div class="row__desc" style="margin-top: 4px;">进度：${Math.round(ropeProgress)}% · 剩余：${ropeTimeText}</div>` : ""}
        </div>
        <div class="row__right">
          <div class="badge">当前进化石：${fmt(state.res.evolutionStone?.value ?? 0)}</div>
          <div class="badge">当前通信绳：${fmt(state.res.linkRope?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="linkRope" ${ropeCanStart ? "" : "disabled"}>${ropeBtnText}</button>
        </div>
      </div>
    `);

    // 合成MEGA进化石
    const megaCostStone = 10;
    const megaTime = 7200; // 2小时
    const megaHaveStone = (state.res.evolutionStone?.value ?? 0) >= megaCostStone;
    const megaTask = craftObj && craftObj.megaStone && typeof craftObj.megaStone === "object" ? craftObj.megaStone : null;
    const isMegaCrafting = Boolean(megaTask && typeof megaTask.remainingSec === "number" && megaTask.remainingSec > 0);
    const megaRemainingSec = isMegaCrafting ? megaTask.remainingSec : 0;
    const megaTotalSec = isMegaCrafting && typeof megaTask.totalSec === "number" && megaTask.totalSec > 0 ? megaTask.totalSec : megaTime;
    const megaProgress = isMegaCrafting ? Math.max(0, Math.min(100, ((megaTotalSec - megaRemainingSec) / megaTotalSec) * 100)) : 0;
    const megaTimeText = megaRemainingSec > 0 ? fmtRemain(megaRemainingSec) : "完成";
    const megaCanStart = megaHaveStone && !isMegaCrafting;
    const megaBlockedText = !megaHaveStone ? "进化石不足" : isMegaCrafting ? "合成中" : "";
    const megaBtnText = isMegaCrafting ? "合成中..." : megaBlockedText ? megaBlockedText : "开始合成";
    const autoCraftMega = Boolean(autoCraftCfg.megaStone);

    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">合成MEGA进化石</div>
          ${autoCraftOn ? `<div class="row__desc"><input class="chk" type="checkbox" data-auto-craft="megaStone" ${autoCraftMega ? "checked" : ""} /> 自动合成</div>` : ""}
          <div class="row__desc">消耗：进化石 x${megaCostStone}，耗时：2小时</div>
          ${isMegaCrafting ? `<div class="row__desc" style="margin-top: 4px;">进度：${Math.round(megaProgress)}% · 剩余：${megaTimeText}</div>` : ""}
        </div>
        <div class="row__right">
          <div class="badge">当前进化石：${fmt(state.res.evolutionStone?.value ?? 0)}</div>
          <div class="badge">当前MEGA进化石：${fmt(state.res.megaStone?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="megaStone" ${megaCanStart ? "" : "disabled"}>${megaBtnText}</button>
        </div>
      </div>
    `);

    // 合成巨大树果
    const hugeCostCatnip = 5000;
    const hugeCostBig = 30;
    const hugeTime = 7200;
    const haveCatnip = (state.res.catnip?.value ?? 0) >= hugeCostCatnip;
    const haveBig = (state.res.bigBerry?.value ?? 0) >= hugeCostBig;
    const hugeTask = craftObj && craftObj.hugeBerry && typeof craftObj.hugeBerry === "object" ? craftObj.hugeBerry : null;
    const isHugeCrafting = Boolean(hugeTask && typeof hugeTask.remainingSec === "number" && hugeTask.remainingSec > 0);
    const hugeRemainingSec = isHugeCrafting ? hugeTask.remainingSec : 0;
    const hugeTotalSec = isHugeCrafting && typeof hugeTask.totalSec === "number" && hugeTask.totalSec > 0 ? hugeTask.totalSec : hugeTime;
    const hugeProgress = isHugeCrafting ? Math.max(0, Math.min(100, ((hugeTotalSec - hugeRemainingSec) / hugeTotalSec) * 100)) : 0;
    const hugeTimeText = hugeRemainingSec > 0 ? fmtRemain(hugeRemainingSec) : "完成";
    const hugeCanStart = haveCatnip && haveBig && !isHugeCrafting;
    const hugeBlockedText = !haveCatnip ? "树果不足" : !haveBig ? "大树果不足" : isHugeCrafting ? "合成中" : "";
    const hugeBtnText = isHugeCrafting ? "合成中..." : hugeBlockedText ? hugeBlockedText : "开始合成";
    const autoCraftHuge = Boolean(autoCraftCfg.hugeBerry);

    craftRows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">合成巨大树果</div>
          ${autoCraftOn ? `<div class="row__desc"><input class="chk" type="checkbox" data-auto-craft="hugeBerry" ${autoCraftHuge ? "checked" : ""} /> 自动合成</div>` : ""}
          <div class="row__desc">消耗：树果 x${hugeCostCatnip} + 大树果 x${hugeCostBig}，耗时：2小时</div>
          ${isHugeCrafting ? `<div class="row__desc" style="margin-top: 4px;">进度：${Math.round(hugeProgress)}% · 剩余：${hugeTimeText}</div>` : ""}
        </div>
        <div class="row__right">
          <div class="badge">当前树果：${fmt(state.res.catnip?.value ?? 0)}</div>
          <div class="badge">当前大树果：${fmt(state.res.bigBerry?.value ?? 0)}</div>
          <div class="badge">当前巨大树果：${fmt(state.res.hugeBerry?.value ?? 0)}</div>
          <button class="btn btn--primary" data-craft="hugeBerry" ${hugeCanStart ? "" : "disabled"}>${hugeBtnText}</button>
        </div>
      </div>
    `);

    rows.push(sectionHeader("daily", "每日福利（月卡）"));
    if (!isFolded("daily")) rows.push(...dailyRows);

    rows.push(sectionHeader("exchange", "兑换"));
    if (!isFolded("exchange")) rows.push(...exchangeRows);

    rows.push(sectionHeader("boost", "限时增益"));
    if (!isFolded("boost")) rows.push(...boostRows);

    rows.push(sectionHeader("permanent", "永久"));
    if (!isFolded("permanent")) rows.push(...permanentRows);

    rows.push(sectionHeader("item", "道具"));
    if (!isFolded("item")) rows.push(...itemRows);

    rows.push(sectionHeader("package", "礼包"));
    if (!isFolded("package")) rows.push(...packageRows);

    rows.push(sectionHeader("auto", "自动"));
    if (!isFolded("auto")) rows.push(...autoRows);

    rows.push(sectionHeader("craft", "合成"));
    if (!isFolded("craft")) rows.push(...craftRows);

    elFutureShop.innerHTML = rows.join("");
    ui.futureDirty = false;
  };
}
