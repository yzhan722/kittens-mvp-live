/**
 * ponytail: assert broken-name remap + guide handoff keys exist.
 * Run: node scripts/newbie-path-selfcheck.mjs
 */
import { looksBrokenName, displayTrainerId } from "../modules/systems/world_presence.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(looksBrokenName("allf5fec93a50"), "hash stub allf5… should be broken");
assert(looksBrokenName("qae8166adc59"), "qa… stub should be broken");
assert(looksBrokenName(""), "empty broken");
assert(!looksBrokenName("LeafGrove"), "LeafGrove ok");
assert(!looksBrokenName("训练家小明"), "CJK name ok");

const mapped = displayTrainerId("allf5fec93a50", "u1");
assert(mapped && mapped !== "allf5fec93a50", `display remap got ${mapped}`);

const guide = readFileSync(join(root, "modules/guide.js"), "utf8");
assert(guide.includes("maybeNewbieHandoff"), "handoff export");
assert(guide.includes("HANDOFF_CATCH_KEY"), "catch handoff key");
assert(guide.includes("第5步"), "5-step guide");

const help = readFileSync(join(root, "modules/tabs/help_tab.js"), "utf8");
assert(help.includes("前30分钟路线"), "help 30m block");

const html = readFileSync(join(root, "index.html"), "utf8");
assert(html.includes("换设备不丢档"), "options cloud CTA");

const app = readFileSync(join(root, "app.js"), "utf8");
assert(app.includes("maybeNewbieHandoff"), "app wires handoff");

console.log("newbie-path-selfcheck: ok");
