#!/usr/bin/env node
// Pure-function contract checks for rebuilt functions/ helpers
import { readFile } from "node:fs/promises";
import { buffLevel, decayedRemaining, clampBuffKey, SERVER_BUFF_KEYS } from "../functions/api/_buffs.js";
import { applyBossRegen, bossAttackDamage, buildBossRewards, parseRewards, BOSS_MAX_HP } from "../functions/api/_boss.js";
import { clampUid, clampName, clampUsername } from "../functions/api/_uid.js";
import { isSessionExpired, SESSION_TTL_MS } from "../functions/api/_auth.js";
import { verifyWebhookSignature, parseWebhookPayload, IAP_ORDER_STATUS } from "../functions/api/_iap.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(SESSION_TTL_MS === 90 * 24 * 60 * 60 * 1000, "session ttl 90d");
assert(isSessionExpired(Date.now()) === false, "fresh session");
assert(isSessionExpired(Date.now() - SESSION_TTL_MS - 1) === true, "expired session");
assert(isSessionExpired(0) === true, "bad created_at");
assert(isSessionExpired(null) === true, "null created_at");

{
  const v = verifyWebhookSignature("secret", '{"sku":"x"}', "stub:secret");
  assert(v.ok === true, "iap stub sig ok");
  const bad = verifyWebhookSignature("secret", "{}", "nope");
  assert(bad.ok === false && bad.reason === "invalid_signature", "iap bad sig");
  const uncfg = verifyWebhookSignature("", "{}", "stub:");
  assert(uncfg.reason === "provider_unconfigured", "iap unconfigured");
  const payload = parseWebhookPayload({ sku: "futurecoin_pack_s", order_id: "o1", uid: "u1", amount_cny: 6 });
  assert(payload && payload.sku === "futurecoin_pack_s", "iap payload parse");
  assert(IAP_ORDER_STATUS.pending === "pending", "iap status enum");
}

assert(SERVER_BUFF_KEYS.length === 6, "buff keys");
assert(buffLevel(0) === 0, "buff lvl 0");
assert(buffLevel(1) === 1, "buff lvl 1");
assert(buffLevel(12 * 3600) === 2, "buff lvl 2 at 12h");
assert(buffLevel(12 * 3600 * 20) === 10, "buff lvl cap 10");
assert(clampBuffKey("exp") === "exp", "clamp buff");
assert(clampBuffKey("nope") === null, "clamp buff bad");

{
  const now = 1_000_000;
  const d = decayedRemaining({ remainingSec: 100, updatedAt: now - 40_000 }, now);
  assert(d.rem === 60, "decay rem got " + d.rem);
}

assert(applyBossRegen(100, 1000, 0, Date.now()).hp === 100, "regen no ts");
{
  const now = 10 * 3600 * 1000;
  const r = applyBossRegen(100, 1000, 0, now);
  // ts0=0 → no regen
  assert(r.hp === 100, "regen ts0");
  const r2 = applyBossRegen(100, 1000, now - 3 * 3600 * 1000, now);
  assert(r2.hp === 103, "regen +3h got " + r2.hp);
}
assert(bossAttackDamage(1000) === 10, "dmg");
assert(parseRewards('{"futurecoin":5}', null, 0).futurecoin === 5, "parse json");
assert(parseRewards(null, "rareCandy", 3).rareCandy === 3, "parse legacy");
{
  const rw = buildBossRewards(() => 0);
  assert(rw.futurecoin === 5000, "reward min");
}

assert(clampUid("  abc  ") === "abc", "uid");
assert(clampUid("") === null, "uid empty");
assert(clampName("") === "训练家", "name default");
assert(clampUsername("ab") === "ab", "username");
assert(clampUsername("x") === null, "username short");

// leaderboard board map sanity
const BOARD_COL = {
  dex: "dexCount",
  power: "power",
  contrib: "power",
  hatch: "hatchCount",
  shiny: "shinyCount",
  total_power: "totalPower",
  gather: "gatherClicks",
  resource: "resourceProduced",
  catch: "catchCount",
};
assert(Object.keys(BOARD_COL).length === 9, "9 boards");

const actorBoundEndpoints = [
  "social/messages.js",
  "social/pvp-invites.js",
  "social/pvp-invite.js",
  "social/pvp-accept.js",
  "social/pvp-result.js",
  "social/friend-profile.js",
  "social/achievements.js",
  "friends/list.js",
  "friends/accept.js",
  "friends/request.js",
  "friends/gift.js",
  "daily_tasks/index.js",
  "daily_tasks/claim.js",
];
for (const endpoint of actorBoundEndpoints) {
  const source = await readFile(new URL(`../functions/api/${endpoint}`, import.meta.url), "utf8");
  assert(source.includes("requireUser"), `${endpoint} requires authenticated user`);
  assert(!source.includes('searchParams.get("uid")'), `${endpoint} does not trust query uid`);
}

const rateLimitedWriteEndpoints = [
  { file: "server/buffs/buy.js", key: "buffs/buy" },
  { file: "server/boss/bully/attack.js", key: "boss/attack" },
  { file: "score/submit.js", key: "score/submit" },
  { file: "events/push.js", key: "events/push" },
  { file: "social/pvp-result.js", key: "social/pvp-result" },
];
for (const { file, key } of rateLimitedWriteEndpoints) {
  const source = await readFile(new URL(`../functions/api/${file}`, import.meta.url), "utf8");
  assert(source.includes("requireUser"), `${file} requires authenticated user`);
  assert(source.includes("checkRateLimit"), `${file} applies rate limiting`);
  assert(source.includes(key), `${file} uses rate limit key ${key}`);
}

const authOnlyWriteEndpoints = ["server/boss/bully/claim.js"];
for (const endpoint of authOnlyWriteEndpoints) {
  const source = await readFile(new URL(`../functions/api/${endpoint}`, import.meta.url), "utf8");
  assert(source.includes("requireUser"), `${endpoint} requires authenticated user`);
}

{
  const webhook = await readFile(new URL("../functions/api/iap/webhook.js", import.meta.url), "utf8");
  assert(webhook.includes("verifyWebhookSignature"), "iap webhook verifies signature");
  assert(webhook.includes("provider_unconfigured"), "iap webhook honest 501");
  assert(webhook.includes("recordIapOrder"), "iap webhook records ledger");
  const grant = await readFile(new URL("../functions/api/iap/grant.js", import.meta.url), "utf8");
  assert(grant.includes("grantIapOrder"), "iap grant route calls grantIapOrder");
  const iapCore = await readFile(new URL("../functions/api/_iap.js", import.meta.url), "utf8");
  assert(iapCore.includes("IAP_SKU_GRANTS"), "iap SKU grant map exists");
  const migration = await readFile(new URL("../scripts/migrations/2026-07-13-iap-orders.sql", import.meta.url), "utf8");
  assert(migration.includes("iap_orders"), "iap_orders migration exists");
}

if (failed) {
  console.error(`api-contract-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("api-contract-selfcheck: OK");
