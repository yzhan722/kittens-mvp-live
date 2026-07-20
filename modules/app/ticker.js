// Ticker 跑马灯系统（队列 + DOM + 轮询）
// 维护者窗口：B
// 注：含 DOM/网络，放 modules/app/（非 systems 纯函数）

import { ambientWorldBatch, ambientWorldLine, bossHudLine } from "../systems/world_presence.js";

export function createTickerSystem({
  getElTicker,
  getUi,
  lbBaseUrl,
  lbFetchJson,
  escapeHtml,
  nowMs,
  readLocalStorage,
  writeLocalStorage,
}) {
  const TICKER_LAST_ID_KEY = "kittens_mvp_ticker_last_id_v1";
  let TICKER_LAST_ID = 0;
  try {
    const raw = typeof readLocalStorage === "function" ? readLocalStorage(TICKER_LAST_ID_KEY) : null;
    const n = raw != null ? Number(raw) : 0;
    TICKER_LAST_ID = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
  }

  const TICKER_LANE_COUNT = 2;
  const TICKER_LANE_H = 28;
  let TICKER_QUEUE = [];
  let TICKER_QSEQ = 1;
  let TICKER_LANES_READY = false;
  let TICKER_LANE_BUSY = Array.from({ length: TICKER_LANE_COUNT }, () => false);
  let TICKER_SEEN_EVENT_IDS = new Set();
  let TICKER_BASE_DUR_SEC = 0;
  let TICKER_TIMER_ID = null;
  let TICKER_AMBIENT_TICK = 0;
  let TICKER_LAST_BOSS_LINE = "";
  let TICKER_LAST_REAL_MSG = "";

  function elTicker() {
    return typeof getElTicker === "function" ? getElTicker() : null;
  }

  function tickerBaseDurSec() {
    if (TICKER_BASE_DUR_SEC > 0) return TICKER_BASE_DUR_SEC;
    try {
      const raw = String(getComputedStyle(document.documentElement).getPropertyValue("--ticker-dur") || "").trim();
      const m = raw.match(/^([0-9.]+)s$/);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > 0) TICKER_BASE_DUR_SEC = n;
      }
    } catch {
    }
    if (TICKER_BASE_DUR_SEC <= 0) TICKER_BASE_DUR_SEC = 20;
    return TICKER_BASE_DUR_SEC;
  }

  function shouldSuppressTickerMsg(msg) {
    const s = String(msg || "");
    if (!s) return false;
    if (s.includes("遭遇神兽") || s.includes("高级遭遇神兽")) return true;
    if (
      (s.includes("神兽") || s.includes("传说") || s.includes("幻")) &&
      (s.includes("区域") || s.includes("领域")) &&
      (s.includes("遭遇") || s.includes("遇到"))
    ) {
      return true;
    }
    return false;
  }

  function tickerLaneDurationSec(laneIdx) {
    const base = tickerBaseDurSec();
    const speedMul = TICKER_QUEUE.length > 200 ? 2 : 1;
    const laneMul = laneIdx === 1 ? 1.2 : 1;
    return Math.max(4, base / speedMul / laneMul);
  }

  function escapeTickerText(s) {
    return escapeHtml(String(s || "").replace(/\s+/g, " ").trim());
  }

  function setTickerVisible(on) {
    const el = elTicker();
    if (!el) return;
    try {
      document.documentElement.style.setProperty("--ticker-h", on ? `${TICKER_LANE_H * TICKER_LANE_COUNT}px` : "0px");
    } catch {
    }
    el.style.display = on ? "flex" : "none";
  }

  function ensureTickerLanes() {
    const el = elTicker();
    if (!el) return;
    if (TICKER_LANES_READY) return;
    const lanes = Array.from({ length: TICKER_LANE_COUNT }, (_, i) => `<div class="ticker__lane" data-ticker-lane="${i}"></div>`).join("");
    el.innerHTML = `<div class="ticker__lanes">${lanes}</div>`;
    TICKER_LANES_READY = true;
  }

  function tryStartTicker() {
    const el = elTicker();
    if (!el) return;
    ensureTickerLanes();
    if (!Array.isArray(TICKER_QUEUE) || TICKER_QUEUE.length === 0) {
      const anyBusy = TICKER_LANE_BUSY.some((x) => x);
      if (!anyBusy) {
        el.innerHTML = "";
        TICKER_LANES_READY = false;
        TICKER_LANE_BUSY = Array.from({ length: TICKER_LANE_COUNT }, () => false);
        setTickerVisible(false);
      }
      return;
    }

    setTickerVisible(true);
    for (let i = 0; i < TICKER_LANE_COUNT; i += 1) {
      if (TICKER_LANE_BUSY[i]) continue;
      const next = TICKER_QUEUE.shift();
      if (!next || !next.msg) continue;

      const lane = el.querySelector(`[data-ticker-lane="${i}"]`);
      if (!lane) continue;

      const ty = typeof next.type === "string" ? next.type : "";
      const cls =
        ty === "shiny"
          ? "ticker__content ticker__content--shiny"
          : ty === "mythic"
            ? "ticker__content ticker__content--mythic"
            : "ticker__content";

      const dur = tickerLaneDurationSec(i);
      TICKER_LANE_BUSY[i] = true;
      lane.innerHTML = `<div class="ticker__track"><div class="${cls}" style="animation-duration:${dur}s" data-ticker-content="${next.qid}">${escapeTickerText(next.msg)}</div></div>`;
      const contentEl = lane.querySelector("[data-ticker-content]");
      if (contentEl) {
        contentEl.addEventListener(
          "animationend",
          () => {
            lane.innerHTML = "";
            TICKER_LANE_BUSY[i] = false;
            tryStartTicker();
          },
          { once: true }
        );
      } else {
        lane.innerHTML = "";
        TICKER_LANE_BUSY[i] = false;
      }
    }
  }

  function enqueueLocal(type, msg, { eventId = 0 } = {}) {
    const text = String(msg || "").replace(/\s+/g, " ").trim();
    if (!text || shouldSuppressTickerMsg(text)) return;
    const ty = String(type || "event").slice(0, 32);
    // ambient / fake padding never counts as "real" pulse
    if (ty !== "ambient") TICKER_LAST_REAL_MSG = text;
    const repeat = ty === "mythic" || ty === "shiny" ? 2 : 1;
    for (let r = 0; r < repeat; r += 1) {
      TICKER_QUEUE.push({ qid: TICKER_QSEQ++, eventId: eventId || 0, msg: text, type: ty });
    }
    if (TICKER_QUEUE.length > 200) TICKER_QUEUE = TICKER_QUEUE.slice(-200);
    tryStartTicker();
  }

  function injectAmbientIfQuiet() {
    TICKER_AMBIENT_TICK += 1;
    const busy = TICKER_LANE_BUSY.some((x) => x) || TICKER_QUEUE.length > 0;
    // ~每 3 次轮询（约 12s）补一条氛围；队列空时更勤
    const due = !busy || TICKER_AMBIENT_TICK % 3 === 0;
    if (!due) return;
    const ui = typeof getUi === "function" ? getUi() : null;
    const bossLine = bossHudLine(ui?.bossBully);
    if (bossLine && bossLine !== TICKER_LAST_BOSS_LINE && ui?.bossBully) {
      TICKER_LAST_BOSS_LINE = bossLine;
      enqueueLocal("boss", `全服·${bossLine}`);
      return;
    }
    const batch = ambientWorldBatch(nowMs(), busy ? 1 : 2);
    for (const it of batch) enqueueLocal(it.type, it.msg);
  }

  function syncWorldPulse() {
    const el = document.getElementById("worldPulse");
    if (!el) return;
    const ui = typeof getUi === "function" ? getUi() : null;
    const boss = bossHudLine(ui?.bossBully);
    const tip = TICKER_LAST_REAL_MSG || "";
    if (ui?.bossBully && boss) {
      el.hidden = false;
      el.textContent = tip ? `${boss} · ${tip}` : boss;
      try {
        document.documentElement.style.setProperty("--world-pulse-h", "22px");
      } catch {}
      return;
    }
    if (tip) {
      el.hidden = false;
      el.textContent = tip;
      try {
        document.documentElement.style.setProperty("--world-pulse-h", "22px");
      } catch {}
      return;
    }
    // No boss + no real event: collapse pulse (ambient stays in ticker)
    el.hidden = true;
    el.textContent = "";
    try {
      document.documentElement.style.setProperty("--world-pulse-h", "0px");
    } catch {}
  }

  async function pollTickerOnce() {
    const base = lbBaseUrl();
    let gotRemote = false;
    try {
      const res = await lbFetchJson(`${base}/api/events/pull?since=${encodeURIComponent(String(TICKER_LAST_ID || 0))}&limit=30`);
      const items = Array.isArray(res?.items) ? res.items : [];
      const lastId = typeof res?.lastId === "number" && Number.isFinite(res.lastId) ? Math.floor(res.lastId) : TICKER_LAST_ID;
      if (items.length) {
        gotRemote = true;
        const now = nowMs();
        const maxAgeMs = 6 * 60 * 60 * 1000;
        for (const it of items) {
          const id = typeof it?.id === "number" && Number.isFinite(it.id) ? Math.floor(it.id) : 0;
          const msg = typeof it?.msg === "string" ? it.msg : "";
          const type = typeof it?.type === "string" ? it.type : "";
          const ts = typeof it?.ts === "number" && Number.isFinite(it.ts) ? Math.floor(it.ts) : 0;
          if (!id || !msg) continue;
          if (TICKER_SEEN_EVENT_IDS.has(id)) continue;
          TICKER_SEEN_EVENT_IDS.add(id);
          if (shouldSuppressTickerMsg(msg)) continue;
          if (ts > 0 && now - ts > maxAgeMs) continue;
          enqueueLocal(type, msg, { eventId: id });
        }
      }
      TICKER_LAST_ID = Math.max(TICKER_LAST_ID, lastId);
      try {
        if (typeof writeLocalStorage === "function") writeLocalStorage(TICKER_LAST_ID_KEY, String(TICKER_LAST_ID));
        else localStorage.setItem(TICKER_LAST_ID_KEY, String(TICKER_LAST_ID));
      } catch {
      }
    } catch {
    }
    // Real events first: ambient only when remote empty, or sparsely as floor
    if (!gotRemote) injectAmbientIfQuiet();
    else if (TICKER_AMBIENT_TICK % 8 === 0) injectAmbientIfQuiet();
    else TICKER_AMBIENT_TICK += 1;
    syncWorldPulse();
  }

  function ensureTickerPolling() {
    if (!elTicker()) return;
    if (TICKER_TIMER_ID) return;
    setTickerVisible(false);
    // 首屏先灌氛围，避免空白跑马灯
    injectAmbientIfQuiet();
    syncWorldPulse();
    pollTickerOnce();
    TICKER_TIMER_ID = window.setInterval(() => {
      pollTickerOnce();
    }, 4000);
  }

  function pushTickerEvent(type, msg) {
    const ui = typeof getUi === "function" ? getUi() : null;
    const base = lbBaseUrl();
    const name = typeof ui?.lbName === "string" && ui.lbName.trim() ? ui.lbName.trim() : "训练家";
    if (shouldSuppressTickerMsg(msg)) return;
    const full = String(`${name}：${String(msg || "")}`).slice(0, 200);
    // 本地立刻可见（不等服务端 pull / 不依赖登录）
    enqueueLocal(type, full);
    const body = {
      type: String(type || "event").slice(0, 32),
      uid: ui?.lbUid,
      name,
      msg: full,
    };
    try {
      if (typeof lbFetchJson === "function") {
        lbFetchJson(`${base}/api/events/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => {});
      } else {
        fetch(`${base}/api/events/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => {});
      }
    } catch {
    }
  }

  return {
    pushTickerEvent,
    ensureTickerPolling,
    shouldSuppressTickerMsg,
    syncWorldPulse,
  };
}
