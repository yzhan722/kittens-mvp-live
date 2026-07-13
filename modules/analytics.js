// Client analytics: localStorage queue, best-effort flush to /api/ops/ingest
const QUEUE_KEY = "kittens_mvp_analytics_queue_v1";
const FIRST_CAPTURE_KEY = "kittens_mvp_analytics_first_capture_v1";
const MAX_QUEUE = 200;
const MAX_BATCH = 50;
const FLUSH_INTERVAL_MS = 15000;

export const FUNNEL_EVENTS = [
  "session_start",
  "gather_click",
  "first_capture",
  "daily_claim",
  "futurecoin_spend",
];

export function sanitizeEventName(name) {
  const s = typeof name === "string" ? name.trim().slice(0, 64) : "";
  return /^[a-z][a-z0-9_]{0,63}$/.test(s) ? s : "";
}

export function sanitizeProps(props) {
  if (!props || typeof props !== "object" || Array.isArray(props)) return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(props)) {
    if (n >= 20) break;
    const key = typeof k === "string" ? k.trim().slice(0, 32) : "";
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;
    if (v == null) continue;
    if (typeof v === "string") out[key] = v.slice(0, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    n += 1;
  }
  return out;
}

export function mergeQueues(a, b, maxLen = MAX_QUEUE) {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  const merged = [...left, ...right];
  if (merged.length <= maxLen) return merged;
  return merged.slice(merged.length - maxLen);
}

export function buildIngestPayload(events, { sessionId = "", uid = "", gameVersion = "" } = {}) {
  const batch = (Array.isArray(events) ? events : []).slice(0, MAX_BATCH).map((e) => ({
    event: sanitizeEventName(e?.event),
    ts: Number.isFinite(e?.ts) ? Math.floor(e.ts) : Date.now(),
    props: sanitizeProps(e?.props),
    sessionId: typeof sessionId === "string" ? sessionId.slice(0, 64) : "",
    uid: typeof uid === "string" ? uid.slice(0, 64) : "",
    gameVersion: typeof gameVersion === "string" ? gameVersion.slice(0, 32) : "",
  }));
  return { events: batch.filter((e) => e.event) };
}

function readQueue(storage) {
  try {
    const raw = storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, queue) {
  try {
    storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // ponytail: drop oldest on quota — queue is best-effort
    try {
      storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-Math.floor(MAX_QUEUE / 2))));
    } catch {
    }
  }
}

export function createAnalytics({ gameVersion = "" } = {}) {
  const sessionId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  let getBaseUrl = () => "";
  let getToken = () => "";
  let getUid = () => "";
  let flushTimer = 0;
  let flushing = false;
  let sessionStarted = false;

  function enqueue(item) {
    if (typeof localStorage === "undefined") return;
    const q = readQueue(localStorage);
    q.push(item);
    writeQueue(localStorage, q);
  }

  function track(event, props = null) {
    try {
      const name = sanitizeEventName(event);
      if (!name) return;
      enqueue({
        event: name,
        ts: Date.now(),
        props: sanitizeProps(props),
        sessionId,
      });
      scheduleFlush();
    } catch {
    }
  }

  function trackOnceSession(event, props = null) {
    if (sessionStarted && event === "session_start") return;
    if (event === "session_start") sessionStarted = true;
    track(event, props);
  }

  function trackFirstCapture(props = null) {
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem(FIRST_CAPTURE_KEY)) return;
      track("first_capture", props);
      if (typeof localStorage !== "undefined") localStorage.setItem(FIRST_CAPTURE_KEY, "1");
    } catch {
      track("first_capture", props);
    }
  }

  function scheduleFlush() {
    if (flushTimer || typeof window === "undefined") return;
    flushTimer = window.setTimeout(() => {
      flushTimer = 0;
      flush();
    }, 1200);
  }

  async function flush() {
    if (flushing || typeof localStorage === "undefined") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const token = typeof getToken === "function" ? getToken() : "";
    const uid = typeof getUid === "function" ? getUid() : "";
    // ponytail: flush when online; auth optional — server accepts anonymous uid
    if (!token && !uid) {
      // still flush anonymous events with empty uid
    }

    const queue = readQueue(localStorage);
    if (queue.length === 0) return;

    flushing = true;
    try {
      const base = typeof getBaseUrl === "function" ? getBaseUrl() : "";
      if (!base) return;

      const batch = queue.slice(0, MAX_BATCH);
      const payload = buildIngestPayload(batch, {
        sessionId,
        uid,
        gameVersion,
      });

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${base}/api/ops/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!res.ok) return;

      const rest = queue.slice(batch.length);
      writeQueue(localStorage, rest);
      if (rest.length > 0) scheduleFlush();
    } catch {
    } finally {
      flushing = false;
    }
  }

  function init({ baseUrl, getToken: gt, getUid: gu } = {}) {
    if (typeof baseUrl === "function") getBaseUrl = baseUrl;
    else if (typeof baseUrl === "string") getBaseUrl = () => baseUrl;

    if (typeof gt === "function") getToken = gt;
    if (typeof gu === "function") getUid = gu;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => flush());
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
      window.setInterval(() => flush(), FLUSH_INTERVAL_MS);
    }
  }

  return {
    track,
    trackOnceSession,
    trackFirstCapture,
    trackFuturecoinSpend: (amount, reason = "") =>
      track("futurecoin_spend", { amount: Math.max(0, Math.floor(amount || 0)), reason: String(reason || "").slice(0, 64) }),
    flush,
    init,
    sessionId,
  };
}
