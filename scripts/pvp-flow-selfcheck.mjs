#!/usr/bin/env node
/** PvP async flow wiring checklist (no dual-account live). */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}
const read = (p) => readFileSync(path.join(root, p), "utf8");

const chain = [
  "functions/api/social/pvp-invites.js",
  "functions/api/friends/list.js",
  "modules/social.js",
  "modules/friends.js",
  "modules/tabs/social_tab.js",
];
for (const p of chain) assert(existsSync(path.join(root, p)), `missing ${p}`);

const invites = read("functions/api/social/pvp-invites.js");
assert(invites.includes("requireUser"), "invites auth");
assert(invites.includes('box === "results"'), "results box for inviter");

const social = read("modules/social.js");
assert(social.includes("sendPvpInvite") || social.includes("pvp-invites"), "client invite API");
assert(social.includes("getPvpResults"), "client results poll");

const tab = read("modules/tabs/social_tab.js");
assert(tab.includes("ingestOutgoingPvpResults"), "inviter ingest");
assert(tab.includes("data-social-goto-options") || tab.includes("去设置"), "cloud CTA");
assert(tab.includes("needCloud"), "gates cloud surfaces");

const friends = read("modules/friends.js");
assert(friends.includes("challenge"), "friend challenge");

console.log(
  failed
    ? `pvp-flow-selfcheck: ${failed} failed`
    : "pvp-flow-selfcheck: OK (manual dual-account still: invite→accept→result on two browsers)"
);
process.exit(failed ? 1 : 0);
