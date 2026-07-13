#!/usr/bin/env node
import { EXP_LEVELS, getExpLevelDef, getExpLevelKeys } from "../modules/expedition_defs.js";
import {
  EXPEDITION_SEASON_BLURBS,
  ensureExpeditionDungeonTiers,
  getExpeditionSeasonBlurb,
  pickExpeditionDungeons,
  resolveExpeditionSeasonLabel,
  resolveSeasonId,
} from "../modules/systems/expedition.js";
import { REMOTE_CONFIG_DEFAULTS } from "../modules/remote_config.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(EXP_LEVELS.length === 7, "EXP_LEVELS has elite+legend");
assert(getExpLevelDef("elite").unlockLvl === 12, "elite unlock");
assert(getExpLevelDef("legend").req === 100000, "legend req");
assert(getExpLevelKeys().includes("legend"), "level keys");

assert(resolveExpeditionSeasonLabel(null) === REMOTE_CONFIG_DEFAULTS.expeditionSeasonLabel, "default season label");
assert(resolveExpeditionSeasonLabel({ expeditionSeasonLabel: " 测试赛季 " }) === "测试赛季", "trim label");
assert(resolveSeasonId({ seasonId: "s2" }) === "s2", "season id");
assert(getExpeditionSeasonBlurb("s2") === EXPEDITION_SEASON_BLURBS.s2, "s2 blurb");
assert(getExpeditionSeasonBlurb("unknown").length > 0, "fallback blurb");

{
  const picks = pickExpeditionDungeons(["fire", "water", "grass", "electric"]);
  assert(picks.length === 3, "pick 3 dungeons");
  assert(new Set(picks.map((x) => x.type)).size === 3, "unique types");
}

{
  const dungeons = { basic: [{ key: "a", type: "fire" }] };
  assert(ensureExpeditionDungeonTiers(dungeons, ["fire", "water", "grass"]) === true, "fills tiers");
  assert(Array.isArray(dungeons.elite) && dungeons.elite.length === 3, "elite pool");
}

if (failed) {
  console.error(`expedition-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("expedition-selfcheck: ok");
