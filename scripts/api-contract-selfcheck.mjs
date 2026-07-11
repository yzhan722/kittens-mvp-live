#!/usr/bin/env node
// Pure-function contract checks for rebuilt functions/ helpers
import { buffLevel, decayedRemaining, clampBuffKey, SERVER_BUFF_KEYS } from "../functions/api/_buffs.js";
import { applyBossRegen, bossAttackDamage, buildBossRewards, parseRewards, BOSS_MAX_HP } from "../functions/api/_boss.js";
import { clampUid, clampName, clampUsername } from "../functions/api/_uid.js";
import { isSessionExpired, SESSION_TTL_MS } from "../functions/api/_auth.js";

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

if (failed) {
  console.error(`api-contract-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("api-contract-selfcheck: OK");
