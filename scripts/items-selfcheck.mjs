import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createItemUsage } from "../modules/item_usage.js";

const now = Date.now();
const state = {
  mons: { list: [{ id: 7, name: "测试精灵", iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }] },
  res: { luckyEgg: { value: 1 }, shinyCharm: { value: 1 }, bottleCap: { value: 1 } },
  shinyCharmRemainingSec: 0,
};
const itemUsage = createItemUsage({
  state,
  addRes: () => {},
  addLog: () => {},
  addExpToMon: () => {},
  render: () => {},
});

assert.equal(itemUsage.useLuckyEgg("7").success, true, "string mon id should select the mon");
assert.ok(state.mons.list[0].buffs.luckyEgg > now, "lucky egg should set a future expiry");
assert.equal(itemUsage.useShinyCharm().success, true, "shiny charm should be usable");
assert.equal(state.res.shinyCharm.value, 0, "shiny charm should be consumed");
assert.equal(state.shinyCharmRemainingSec, 86400, "shiny charm should add one day");
assert.equal(itemUsage.useBottleCap("7", "bottleCap", "hp").success, true, "string mon id should work for crown use");
assert.equal(state.mons.list[0].iv.hp, 31, "crowns must use the mon.iv field");

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const monsSource = await readFile(new URL("../modules/tabs/mons_tab.js", import.meta.url), "utf8");
assert.match(appSource, /mon\.buffs\?\.luckyEgg.*Date\.now\(\)/, "lucky egg multiplier must check its expiry");
assert.match(appSource, /luckyEggOn \? 1\.5 : 1/, "lucky egg multiplier must be 1.5x");
assert.match(monsSource, /cur\s*>=\s*50/, "potions must reject stats already at +50");
assert.match(monsSource, /m\.statBonus\[key\]\s*=\s*Math\.min\(50,\s*cur \+ 5\)/, "potions must never exceed +50");

console.log("items selfcheck passed");
