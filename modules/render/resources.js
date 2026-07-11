// 将速率转为更直观的文本：速率很低时显示「约Xs/个」
function fmtRate(perSec) {
  if (perSec <= 0) return "0/秒";
  if (perSec < 0.5) {
    const secPer = Math.round(1 / perSec);
    return `约${secPer}s/个`;
  }
  if (perSec < 1) return `${perSec.toFixed(2)}/秒`;
  return `${Math.floor(perSec)}/秒`;
}

// 根据图鉴数量计算训练家等级
export function getTrainerLevel(dexUnique) {
  const n = Math.max(0, Math.floor(dexUnique || 0));
  if (n >= 600) return { level: 9, name: "精英四天王", next: null, nextReq: 600 };
  if (n >= 450) return { level: 8, name: "神奥冠军", next: "伽勒尔旷野", nextReq: 600 };
  if (n >= 350) return { level: 7, name: "卡洛斯冠军", next: "阿罗拉海滩", nextReq: 450 };
  if (n >= 250) return { level: 6, name: "合众冠军", next: "神兽领域", nextReq: 350 };
  if (n >= 150) return { level: 5, name: "神奥冠军", next: "卡洛斯花田", nextReq: 250 };
  if (n >= 80)  return { level: 4, name: "丰缘冠军", next: "合众沙漠", nextReq: 150 };
  if (n >= 30)  return { level: 3, name: "城都冠军", next: "神奥雪原", nextReq: 80 };
  if (n >= 10)  return { level: 2, name: "关都冠军", next: "丰缘海岸", nextReq: 30 };
  return         { level: 1, name: "新手训练家", next: "城都树林", nextReq: 10 };
}

export function createRenderResources({ elResources, defs, fmt, getState }) {
  let lastSignature = "";
  let lastOrder = [];
  const rowMap = new Map();
  const fmtInt = (n) => {
    if (typeof n !== "number" || Number.isNaN(n)) return "0";
    return String(Math.floor(n));
  };

  const buildRows = (items) => {
    if (!elResources) return;
    elResources.innerHTML = "";
    rowMap.clear();
    const frag = document.createDocumentFragment();
    for (const it of items) {
      const row = document.createElement("div");
      row.className = "resrow";

      const left = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.className = "resrow__k";
      nameEl.textContent = it.name;

      const metaEl = document.createElement("div");
      metaEl.className = "resrow__meta";
      metaEl.textContent = it.meta;

      left.append(nameEl, metaEl);

      const valueEl = document.createElement("div");
      valueEl.className = "resrow__v";
      const valueText = it.noCap ? fmtInt(it.value) : `${fmtInt(it.value)} / ${fmtInt(it.cap)}`;
      valueEl.textContent = valueText;

      row.append(left, valueEl);
      frag.append(row);
      rowMap.set(it.id, {
        row,
        nameEl,
        metaEl,
        valueEl,
        lastName: it.name,
        lastMeta: it.meta,
        lastValue: valueText,
      });
    }
    elResources.append(frag);
  };

  // 渲染训练家等级进度条（默认折叠；插在资源列表前，跟资源同属 topbar）
  function renderTrainerLevel(state) {
    if (!elResources) return;
    const caught = state.dex?.caught ?? {};
    let unique = 0;
    for (const v of Object.values(caught)) {
      if (typeof v === "number" && v > 0) unique++;
    }
    const info = getTrainerLevel(unique);
    const containerId = "trainerLevelBar";
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement("details");
      el.id = containerId;
      el.className = "trainerLevel";
      const host = elResources.parentNode;
      if (host) host.insertBefore(el, elResources);
    }
    const pct = info.next ? Math.min(100, Math.round((unique / info.nextReq) * 100)) : 100;
    const nextTip = info.next ? `→ 解锁「${info.next}」(${unique}/${info.nextReq})` : "全部地图已解锁";
    const wasOpen = el.open;
    el.innerHTML = `
      <summary class="trainerLevel__summary">Lv.${info.level} ${info.name}</summary>
      <div class="trainerLevel__row">
        <span class="trainerLevel__tip">${nextTip}</span>
      </div>
      <div class="trainerLevel__bar"><div class="trainerLevel__fill" style="width:${pct}%"></div></div>
    `;
    el.open = wasOpen;
  }

  return function renderResources(eff) {
    const state = getState();

    // 训练家等级始终刷新（不受 signature 缓存影响）
    renderTrainerLevel(state);

    const items = [];

    items.push({
      id: "catnip",
      name: defs.resources.catnip.name,
      value: state.res.catnip.value,
      cap: state.res.catnip.cap,
      meta: fmtRate(eff.catnipPerSec),
    });

    if (state.unlocks.wood || state.res.wood.value > 0) {
      items.push({
        id: "wood",
        name: defs.resources.wood.name,
        value: state.res.wood.value,
        cap: state.res.wood.cap,
        meta: fmtRate(eff.woodPerSec),
      });
    }

    if (state.unlocks.minerals || state.res.minerals.value > 0) {
      items.push({
        id: "minerals",
        name: defs.resources.minerals.name,
        value: state.res.minerals.value,
        cap: state.res.minerals.cap,
        meta: fmtRate(eff.mineralsPerSec),
      });
    }

    const signature = items
      .map((it) => `${it.id}:${fmtInt(it.value)}:${fmtInt(it.cap)}:${it.meta}:${it.noCap ? 1 : 0}`)
      .join("|");
    if (signature === lastSignature) return;
    lastSignature = signature;

    const order = items.map((it) => it.id);
    const orderChanged = order.length !== lastOrder.length || order.some((id, idx) => lastOrder[idx] !== id);
    if (orderChanged || rowMap.size === 0) {
      lastOrder = order;
      buildRows(items);
      return;
    }

    for (const it of items) {
      const entry = rowMap.get(it.id);
      if (!entry) {
        buildRows(items);
        return;
      }
      if (entry.lastName !== it.name) {
        entry.nameEl.textContent = it.name;
        entry.lastName = it.name;
      }
      if (entry.lastMeta !== it.meta) {
        entry.metaEl.textContent = it.meta;
        entry.lastMeta = it.meta;
      }
      const valueText = it.noCap ? fmtInt(it.value) : `${fmtInt(it.value)} / ${fmtInt(it.cap)}`;
      if (entry.lastValue !== valueText) {
        entry.valueEl.textContent = valueText;
        entry.lastValue = valueText;
      }
    }
  };
}
