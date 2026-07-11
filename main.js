const BOOT_PANEL_ID = "bootStatus";
const MAX_RETRY = 5;
const RELOAD_GUARD_KEY = "bootReloadCount";
const VERSION_CHECK_KEY = "lastKnownVersion";
const CURRENT_VERSION = "0.39.2";

// 版本检测：版本变化时清缓存并刷新
(function checkVersion() {
  const lastVersion = localStorage.getItem(VERSION_CHECK_KEY);
  if (lastVersion && lastVersion !== CURRENT_VERSION) {
    localStorage.setItem(VERSION_CHECK_KEY, CURRENT_VERSION);
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      }).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
    return;
  }
  localStorage.setItem(VERSION_CHECK_KEY, CURRENT_VERSION);
})();

function ensureBootPanel() {
  let el = document.getElementById(BOOT_PANEL_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = BOOT_PANEL_ID;
  el.style.cssText = "position:fixed;left:12px;right:12px;top:12px;z-index:99999;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.78);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:14px;line-height:1.4;backdrop-filter:blur(6px)";
  (document.body || document.documentElement).appendChild(el);
  return el;
}

function waitMs(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getReloadGuardCount() {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function bumpReloadGuardCount() {
  const next = getReloadGuardCount() + 1;
  try { window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(next)); } catch {}
  return next;
}

function forceReloadPage() {
  const n = bumpReloadGuardCount();
  const url = new URL(window.location.href);
  url.searchParams.set("r", `${Date.now()}_${n}`);
  window.location.replace(url.toString());
}

function formatErr(err) {
  const msg = err && typeof err === "object" && "message" in err ? String(err.message || "") : String(err || "");
  return msg || "Unknown error";
}

function renderBootPanel({ loading, detail, attempt }) {
  const el = ensureBootPanel();
  el.innerHTML = "";

  const row1 = document.createElement("div");
  row1.style.fontWeight = "700";
  row1.textContent = loading ? "正在加载游戏资源…" : "资源加载遇到问题，正在自动重试";
  el.appendChild(row1);

  if (!loading && typeof attempt === "number") {
    const rowAttempt = document.createElement("div");
    rowAttempt.style.opacity = "0.75";
    rowAttempt.style.marginTop = "4px";
    rowAttempt.style.fontSize = "12px";
    rowAttempt.textContent = `第 ${attempt + 1} / ${MAX_RETRY} 次尝试`;
    el.appendChild(rowAttempt);
  }

  if (detail && !loading) {
    const row2 = document.createElement("div");
    row2.style.marginTop = "6px";
    row2.style.whiteSpace = "pre-wrap";
    row2.style.opacity = "0.7";
    row2.style.fontSize = "12px";
    row2.textContent = detail;
    el.appendChild(row2);
  }

  // 只在最后一次失败时才展示手动重试按钒
  if (!loading && attempt >= MAX_RETRY - 1) {
    const actions = document.createElement("div");
    actions.style.cssText = "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "手动重试";
    btn.style.cssText = "cursor:pointer;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);color:#fff";
    btn.addEventListener("click", () => forceReloadPage());
    actions.appendChild(btn);

    el.appendChild(actions);
  }
}

let bootRunId = 0;

async function boot(force = false) {
  const runId = (bootRunId += 1);

  for (let attempt = 0; attempt < MAX_RETRY; attempt += 1) {
    if (runId !== bootRunId) return;

    renderBootPanel({ loading: true, attempt });

    const bust = `b=${Date.now()}_${attempt}${force ? "_f" : ""}`;
    try {
      await import(`./modules/type_zh.js?${bust}`);
      await import(`./app.js?${bust}`);
      try { window.sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch {}
      const el = document.getElementById(BOOT_PANEL_ID);
      if (el) el.remove();
      return;
    } catch (err) {
      const detail = formatErr(err);
      const retryDelayMs = Math.min(8000, 800 * Math.pow(2, attempt));

      renderBootPanel({ loading: false, detail, attempt });

      // 网络错误时自动刷新页面（最多3次，避免死循环）
      const canAutoReload = getReloadGuardCount() < 2;
      const isFetchLike = /failed to fetch|dynamically imported module|importing a module script failed/i.test(detail);
      if (!force && attempt >= 1 && canAutoReload && isFetchLike) {
        await waitMs(400);
        forceReloadPage();
        return;
      }

      if (attempt >= MAX_RETRY - 1) return;
      await waitMs(retryDelayMs);
    }
  }
}

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

boot(false);
