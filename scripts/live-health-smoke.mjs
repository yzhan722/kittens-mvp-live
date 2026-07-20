#!/usr/bin/env node
/**
 * Live health smoke — health + ingest + one social GET.
 * Usage: node scripts/live-health-smoke.mjs [baseUrl]
 */
const base = String(process.argv[2] || "https://game.pokeauto.online").replace(/\/$/, "");

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok  ${name}`);
    return true;
  } catch (e) {
    console.error(`FAIL ${name}: ${e?.message || e}`);
    return false;
  }
}

let failed = 0;

if (
  !(await check("GET /api/health", async () => {
    const r = await fetch(`${base}/api/health`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    if (!j?.ok) throw new Error("ok!=true");
  }))
)
  failed += 1;

if (
  !(await check("POST /api/ops/ingest", async () => {
    const r = await fetch(`${base}/api/ops/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [{ event: "session_start", ts: Date.now(), sessionId: "live-health-smoke", props: {} }],
      }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    if (!j?.ok) throw new Error(JSON.stringify(j));
  }))
)
  failed += 1;

if (
  !(await check("GET /api/events/pull", async () => {
    const r = await fetch(`${base}/api/events/pull?since=0&limit=3`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    if (!Array.isArray(j?.items) && typeof j?.lastId !== "number") throw new Error("bad shape");
  }))
)
  failed += 1;

if (
  !(await check("GET /api/leaderboard/dex", async () => {
    const r = await fetch(`${base}/api/leaderboard/dex`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    if (!Array.isArray(j?.items)) throw new Error("items missing");
  }))
)
  failed += 1;

if (
  !(await check("GET /api/friends/list (anon)", async () => {
    const r = await fetch(`${base}/api/friends/list?uid=smoke-anon`);
    // may be 401 without token — both 200 and 401 prove route is alive
    if (r.status !== 200 && r.status !== 401 && r.status !== 400) {
      throw new Error(`unexpected ${r.status}`);
    }
  }))
)
  failed += 1;

if (failed) {
  console.error(`live-health-smoke: ${failed} failed`);
  process.exit(1);
}
console.log("live-health-smoke: OK");
