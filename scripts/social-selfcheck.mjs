#!/usr/bin/env node
// Social / async PvP wiring smoke (no live network)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const friends = read("modules/friends.js");
assert(friends.includes("getAuthToken"), "friends gates on cloud token");
assert(friends.includes("data-friend-action"), "friends UI actions");
assert(friends.includes("challenge"), "friends challenge button");
assert(!friends.includes("giftItem"), "gift dead path removed from friends surface");

const social = read("modules/social.js");
assert(social.includes("getPvpResults"), "pvp results poll");
assert(social.includes("hasAuth"), "social hasAuth");
assert(social.includes("请先在设置页登录云账号"), "login copy fixed");

const tab = read("modules/tabs/social_tab.js");
assert(tab.includes('id="friends"'), "friends mount in social tab");
assert(tab.includes("refreshSocial"), "refreshSocial exported");
assert(tab.includes("ingestOutgoingPvpResults"), "inviter result ingest");
assert(tab.includes("pushTickerEvent"), "pvp ticker");

const cloud = read("modules/cloud_save.js");
assert(cloud.includes("getCloudUid"), "cloud uid persisted");
assert(cloud.includes("UID_KEY"), "uid storage key");

const invites = read("functions/api/social/pvp-invites.js");
assert(invites.includes('box === "results"'), "results box");
assert(invites.includes("pvp_battles"), "joins battles");

const invite = read("functions/api/social/pvp-invite.js");
assert(invite.includes("not friends"), "friendship required");
assert(invite.includes("normalizeTeamData"), "team validation");

const tabs = read("modules/tabs/tabs_controller.js");
assert(tabs.includes("renderSocial"), "social tab refresh on activate");

if (failed) {
  console.error(`social-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("social-selfcheck: ok");
