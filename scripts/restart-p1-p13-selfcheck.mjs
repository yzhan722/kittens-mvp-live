#!/usr/bin/env node
/**
 * Restart P1–P13 contract tests. Written to fail before the production patch.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { REMOTE_CONFIG_DEFAULTS } from "../modules/remote_config.js";
import {
  atmosphereFakesEnabled,
  fakeSocialFeed,
  ghostRivalsForDay,
  padLeaderboard,
  seasonGhostsForDay,
} from "../modules/systems/world_presence.js";
import { liveNextGoalLine, seasonBarVsGhosts } from "../modules/systems/gameplay_fun.js";
import { buildShinyShareText, shinyShareCardPayload } from "../modules/systems/collection_fun.js";
import { maybeNewbieHandoff } from "../modules/guide.js";
import { hatchEgg } from "../modules/systems/breeding.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

{
  assert.equal(REMOTE_CONFIG_DEFAULTS.featureFlags.atmosphereFakes, false, "atmosphere default off");
  assert.equal(atmosphereFakesEnabled(), false, "helper default off");
  assert.equal(padLeaderboard([], "dex", "2026-07-13").length, 0, "empty board honest");
  const onlyReal = padLeaderboard(
    [{ score: 999, name: "RealPlayer", attrs: { ownerName: "RealPlayer" } }],
    "dex",
    "2026-07-13"
  );
  assert.equal(onlyReal.length, 1, "real row not padded");
  assert.equal(onlyReal[0].fake, false, "real not marked fake");
  assert.equal(fakeSocialFeed("2026-07-13", 4).length, 0, "social feed honest empty");
  assert.equal(ghostRivalsForDay("2026-07-13").length, 0, "no ghost rivals by default");
  assert.equal(seasonGhostsForDay("2026-07-13").length, 0, "no season ghosts by default");
  const padded = padLeaderboard([], "dex", "2026-07-13", { atmosphereFakes: true });
  assert.ok(padded.length >= 12, "opt-in still pads");
  assert.ok(padded.every((x) => x.fake), "opt-in rows fake");
}

{
  const line = liveNextGoalLine({ catchCount: 0 }, { dexPct: 0 });
  assert.ok(line.includes("捕捉"), `first-catch goal, got: ${line}`);
  const after = liveNextGoalLine({ catchCount: 1 }, { dexPct: 3 });
  assert.ok(after.includes("图鉴") || after.includes("3%"), `post-catch dex goal, got: ${after}`);
}

{
  const empty = seasonBarVsGhosts(0, []);
  assert.equal(empty.total, 0, "empty ghosts total");
  assert.ok(!String(empty.tip).includes("幽灵训练家") || String(empty.tip).includes("还没有"), "honest empty season bar");
}

{
  const state = {
    dex: {
      shiny: {
        pika: { dex: 25, name: "皮卡丘", at: 3 },
        bulba: { dex: 1, name: "妙蛙种子", at: 2 },
      },
    },
  };
  const text = buildShinyShareText(state);
  assert.ok(text.includes("闪光馆"), "share mentions gallery");
  assert.ok(text.includes("皮卡丘"), "share names shiny");
  assert.ok(text.includes("2"), "share unique count");
  const card = shinyShareCardPayload(state);
  assert.equal(card.unique, 2, "card unique");
  assert.ok(Array.isArray(card.entries) && card.entries.length === 2, "card entries");
  assert.equal(buildShinyShareText({ dex: { shiny: {} } }), "", "empty gallery no share");
}

{
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
  };
  const tabs = [];
  maybeNewbieHandoff({
    state: { meta: { starterBallsGranted: true }, res: { pokeball: { value: 5 } }, catchCount: 0 },
    activateTab: (t) => tabs.push(t),
    addLog: () => {},
  });
  assert.ok(tabs.includes("capture"), "handoff to capture");
}

{
  assert.equal(typeof hatchEgg, "function", "hatchEgg extracted");
  const state = {
    breeding: { aId: 1, bId: 2, eggRemainingSec: 0 },
    mons: { nextId: 3, list: [] },
    meta: {},
  };
  const logs = [];
  const hatched = hatchEgg(state, {
    mons: {
      list: [
        { id: 1, pid: "p25", name: "皮卡丘" },
        { id: 2, pid: "p25", name: "皮卡丘" },
      ],
    },
    monById: null,
    getMonById: (_mons, _map, id) => ({ id, pid: "p25", name: "皮卡丘" }),
    getBasePid: (pid) => pid,
    sameFamily: () => true,
    getSpeciesByPid: () => ({ id: "p25", pid: "p25", dex: 25, name: "皮卡丘", tier: "common" }),
    createMonInstance: (sp) => ({ id: 9, pid: sp.pid, dex: sp.dex, name: sp.name, isShiny: false }),
    randFloat: () => 0.5,
    addLog: (m) => logs.push(m),
    addRes: () => {},
    ui: {},
  });
  assert.equal(hatched, true, "hatch succeeds");
  assert.equal(state.mons.list.length, 1, "mon added");
  assert.ok(logs.some((x) => String(x).includes("生蛋成功")), "hatch log");
}

{
  const saveApi = readFileSync(join(root, "functions/api/save/index.js"), "utf8");
  assert.ok(saveApi.includes("status: 409"), "optimistic lock 409");
  const app = readFileSync(join(root, "app.js"), "utf8");
  assert.ok(app.includes("exportSaveJson") && app.includes("importSaveJsonFile"), "json io");
  assert.ok(app.includes("kittens_mvp_save_slot_1") || app.includes("SAVE_SLOT_KEY"), "slot1 wired");
  const social = readFileSync(join(root, "modules/render/social.js"), "utf8");
  assert.ok(social.includes("还没有好友动态") || social.includes("暂无好友动态"), "honest social empty copy");
  const dex = readFileSync(join(root, "modules/render/dex.js"), "utf8");
  assert.ok(dex.includes("data-dex-shiny-card") || dex.includes("data-dex-shiny-share"), "shiny share control");
}

console.log("restart-p1-p13-selfcheck: ok");
