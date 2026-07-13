import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createItemUsage } from "../modules/item_usage.js";
import { ballCatchMult } from "../modules/systems/ball_catch.js";

function makeHarness(overrides = {}) {
  const state = {
    mons: {
      list: [
        {
          id: 7,
          name: "测试精灵",
          iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
          affection: 0,
        },
      ],
    },
    res: {
      luckyEgg: { value: 1 },
      shinyCharm: { value: 1 },
      bottleCap: { value: 1 },
      goldBottleCap: { value: 1 },
      expCandy: { value: 2 },
      expCandyL: { value: 1 },
      expCandyS: { value: 2 },
      affectionTreat: { value: 2 },
      friendshipBracelet: { value: 1 },
      megaStone: { value: 1 },
      energyDrink: { value: 1 },
      searchFlare: { value: 1 },
      advSearchCell: { value: 1 },
      sootheBell: { value: 1 },
      ...overrides.res,
    },
    shinyCharmRemainingSec: 0,
    gatherCharges: 100,
    encounterCharges: 10,
    encounterPlusCharges: 1,
    permanentBoosts: { encPlusMax: 0 },
    ...overrides.state,
  };
  const logs = [];
  let expGained = 0;
  const itemUsage = createItemUsage({
    state,
    addRes: () => {},
    addLog: (msg) => logs.push(msg),
    addExpToMon: (_mon, amt) => {
      expGained += amt;
    },
    render: () => {},
  });
  return { state, itemUsage, logs, getExpGained: () => expGained };
}

// --- createItemUsage export surface ---
{
  const { itemUsage } = makeHarness();
  const keys = [
    "useExpCandy",
    "useAffectionItem",
    "useBottleCap",
    "useLuckyEgg",
    "useMegaStone",
    "useShinyCharm",
    "useEnergyDrink",
    "useSearchFlare",
    "useAdvSearchCell",
    "useSootheBell",
  ];
  for (const k of keys) {
    assert.equal(typeof itemUsage[k], "function", `item_usage must export ${k}`);
  }
}

{
  assert.equal(ballCatchMult("netball", { types: ["water"] }), 3, "netball water");
  assert.equal(ballCatchMult("netball", { types: ["fire"] }), 1, "netball fire");
  assert.equal(ballCatchMult("duskball", { hour: 20 }), 3, "dusk night");
  assert.equal(ballCatchMult("duskball", { hour: 12 }), 1.2, "dusk day");
  assert.equal(ballCatchMult("ultraball"), 2, "ultra");
}

// --- lucky egg ---
{
  const now = Date.now();
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useLuckyEgg("7").success, true, "string mon id should select the mon");
  assert.ok(state.mons.list[0].buffs.luckyEgg > now, "lucky egg should set a future expiry");
  assert.equal(state.res.luckyEgg.value, 0, "lucky egg should be consumed");
}
{
  const { itemUsage } = makeHarness({ res: { luckyEgg: { value: 1 } } });
  assert.equal(itemUsage.useLuckyEgg(999).success, false, "lucky egg rejects missing mon");
}
{
  const { itemUsage } = makeHarness({ res: { luckyEgg: { value: 0 } } });
  assert.equal(itemUsage.useLuckyEgg(7).success, false, "lucky egg rejects zero stock");
}

// --- shiny charm ---
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useShinyCharm().success, true, "shiny charm should be usable");
  assert.equal(state.res.shinyCharm.value, 0, "shiny charm should be consumed");
  assert.equal(state.shinyCharmRemainingSec, 86400, "shiny charm should add one day");
}
{
  const { itemUsage } = makeHarness({ res: { shinyCharm: { value: 0 } } });
  assert.equal(itemUsage.useShinyCharm().success, false, "shiny charm rejects zero stock");
}

// --- utility consumables ---
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useEnergyDrink().success, true, "energy drink");
  assert.equal(state.gatherCharges, 350, "gather +250");
  assert.equal(state.res.energyDrink.value, 0, "energy consumed");
}
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useSearchFlare().success, true, "search flare");
  assert.equal(state.encounterCharges, 35, "encounter +25");
}
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useAdvSearchCell().success, true, "adv cell");
  assert.equal(state.encounterPlusCharges, 3, "plus +2");
}
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useSootheBell().success, true, "soothe");
  assert.equal(state.mons.list[0].affection, 3, "affection +3");
}
{
  const { getExpGained, itemUsage } = makeHarness();
  assert.equal(itemUsage.useExpCandy(7, "expCandyS").success, true, "exp S");
  assert.equal(getExpGained(), 200, "exp S grants 200");
}

// --- bottle caps ---
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useBottleCap("7", "bottleCap", "hp").success, true, "string mon id for silver crown");
  assert.equal(state.mons.list[0].iv.hp, 31, "silver crown must use mon.iv");
  assert.equal(state.res.bottleCap.value, 0, "silver crown consumed");
}
{
  const { state, itemUsage } = makeHarness({
    res: { bottleCap: { value: 1 } },
    state: { mons: { list: [{ id: 7, name: "满IV", iv: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] } },
  });
  assert.equal(itemUsage.useBottleCap(7, "bottleCap", "hp").success, false, "silver crown rejects max stat");
}
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useBottleCap(7, "goldBottleCap").success, true, "gold crown should succeed");
  assert.deepEqual(state.mons.list[0].iv, { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, "gold crown maxes all iv");
  assert.equal(state.res.goldBottleCap.value, 0, "gold crown consumed");
}

// --- exp candy ---
{
  const { state, itemUsage, getExpGained } = makeHarness();
  assert.equal(itemUsage.useExpCandy(7, "expCandy").success, true, "exp candy usable");
  assert.equal(getExpGained(), 1000, "exp candy grants 1000 exp");
  assert.equal(state.res.expCandy.value, 1, "exp candy decrements");
}
{
  const { itemUsage } = makeHarness({ res: { expCandy: { value: 0 } } });
  assert.equal(itemUsage.useExpCandy(7, "expCandy").success, false, "exp candy rejects zero stock");
}
{
  const { getExpGained, itemUsage } = makeHarness();
  assert.equal(itemUsage.useExpCandy(7, "expCandyL").success, true, "exp candy L usable");
  assert.equal(getExpGained(), 5000, "exp candy L grants 5000 exp");
}

// --- affection items ---
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useAffectionItem(7, "affectionTreat").success, true, "affection treat usable");
  assert.equal(state.mons.list[0].affection, 5, "affection treat +5");
}
{
  const { state, itemUsage } = makeHarness({
    state: { mons: { list: [{ id: 7, name: "满亲", affection: 100, iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }] } },
  });
  assert.equal(itemUsage.useAffectionItem(7, "affectionTreat").success, false, "affection capped at 100");
}
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useAffectionItem(7, "friendshipBracelet").success, true, "friendship bracelet usable");
  assert.equal(state.mons.list[0].affection, 100, "friendship bracelet sets max affection");
}

// --- mega stone ---
{
  const { state, itemUsage } = makeHarness();
  assert.equal(itemUsage.useMegaStone(7).success, true, "mega stone usable");
  assert.equal(state.mons.list[0].megaAuraRemainingSec, 3600, "mega stone adds 1h aura");
  assert.equal(state.res.megaStone.value, 0, "mega stone consumed");
}

{
  const { getExpGained, itemUsage } = makeHarness({ res: { expCandyXL: { value: 1 } } });
  assert.equal(itemUsage.useExpCandy(7, "expCandyXL").success, true, "exp candy XL usable");
  assert.equal(getExpGained(), 20000, "exp candy XL grants 20000 exp");
}
{
  const { itemUsage } = makeHarness();
  assert.equal(itemUsage.useExpCandy(7, "bogus").success, false, "exp candy rejects invalid type");
}
{
  const { itemUsage } = makeHarness();
  assert.equal(itemUsage.useAffectionItem(7, "bogus").success, false, "affection rejects invalid type");
}
{
  const { itemUsage } = makeHarness({ res: { megaStone: { value: 0 } } });
  assert.equal(itemUsage.useMegaStone(7).success, false, "mega stone rejects zero stock");
}
{
  const { itemUsage } = makeHarness();
  assert.equal(itemUsage.useBottleCap(7, "bottleCap", "nope").success, false, "silver crown rejects bad stat");
}
{
  const { itemUsage } = makeHarness();
  assert.equal(itemUsage.useBottleCap(999, "bottleCap", "hp").success, false, "bottle cap rejects missing mon");
}
{
  const { itemUsage } = makeHarness({ res: { bottleCap: { value: 0 } } });
  assert.equal(itemUsage.useBottleCap(7, "bottleCap", "hp").success, false, "bottle cap rejects zero stock");
}
{
  const { itemUsage } = makeHarness({ res: { goldBottleCap: { value: 0 } } });
  assert.equal(itemUsage.useBottleCap(7, "goldBottleCap").success, false, "gold crown rejects zero stock");
}

// --- lucky-egg multiplier wiring (source contract; lives in mon_stats) ---
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const monStatsSource = await readFile(new URL("../modules/systems/mon_stats.js", import.meta.url), "utf8");
const monsSource = await readFile(new URL("../modules/tabs/mons_tab.js", import.meta.url), "utf8");
assert.match(monStatsSource, /mon\.buffs\?\.luckyEgg.*Date\.now\(\)/, "lucky egg multiplier must check expiry");
assert.match(monStatsSource, /luckyEggOn \? 1\.5 : 1/, "lucky egg multiplier must be 1.5x");

// --- potion statBonus caps (mons_tab source contract) ---
assert.match(monsSource, /cur\s*>=\s*50/, "potions must reject stats already at +50");
assert.match(monsSource, /m\.statBonus\[key\]\s*=\s*Math\.min\(50,\s*cur \+ 5\)/, "potions must never exceed +50");
assert.match(monsSource, /hpPotion:\s*"hp"/, "potion map must wire hpPotion");
assert.match(monsSource, /atkPotion:\s*"atk"/, "potion map must wire atkPotion");
assert.match(monsSource, /defPotion:\s*"def"/, "potion map must wire defPotion");
assert.match(monsSource, /spaPotion:\s*"spa"/, "potion map must wire spaPotion");
assert.match(monsSource, /spdPotion:\s*"spd"/, "potion map must wire spdPotion");
assert.match(monsSource, /spePotion:\s*"spe"/, "potion map must wire spePotion");
assert.match(monsSource, /state\.res\[rid\]\.value = Math\.max\(0, have - 1\)/, "potions must consume resource");
assert.match(monsSource, /inExpedition/, "potions must block expedition mons");
assert.match(appSource, /tabRules\s*=\s*\{/, "tab unlock rules must exist in render");
assert.match(appSource, /pve:\s*unique >= 5/, "pve tab unlocks at 5 unique dex");
assert.match(appSource, /future:\s*unique >= 1/, "future tab unlocks at 1 unique dex");

console.log("items selfcheck passed");
