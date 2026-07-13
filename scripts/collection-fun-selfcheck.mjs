import assert from "node:assert/strict";
import {
  noteSeasonRelic,
  noteShinySpecies,
  resolveSeasonRelicDef,
  rollSeasonRelic,
  seasonRelicLines,
  shinyGalleryEntries,
  shinyUniqueCount,
  syncShinyGalleryFromMons,
} from "../modules/systems/collection_fun.js";

{
  const def = resolveSeasonRelicDef("s2");
  assert.equal(def.id, "vial_sigil", "s2 relic");
  const miss = rollSeasonRelic("s1", () => 0.99);
  assert.equal(miss, null, "high roll miss");
  const hit = rollSeasonRelic("s1", () => 0);
  assert.ok(hit && hit.item === "rareCandy", "low roll hit");
  const state = { meta: {} };
  const noted = noteSeasonRelic(state, hit);
  assert.equal(noted.count, 1, "relic count");
  assert.equal(seasonRelicLines(state).length, 1, "relic lines");
}

{
  const state = { dex: { caught: {} }, meta: {} };
  const mile1 = noteShinySpecies(state, { id: "bulba", dex: 1, name: "妙蛙种子" });
  assert.equal(mile1?.item, "rareCandy", "first shiny milestone");
  assert.equal(shinyUniqueCount(state), 1, "unique 1");
  const again = noteShinySpecies(state, { id: "bulba", dex: 1, name: "妙蛙种子" });
  assert.equal(again, null, "dup no mile");
  noteShinySpecies(state, { id: "ivy", dex: 2, name: "妙蛙草" });
  const mile3 = noteShinySpecies(state, { id: "venu", dex: 3, name: "妙蛙花" });
  assert.equal(mile3?.item, "expCandy", "third shiny milestone");
  assert.equal(shinyGalleryEntries(state, 2).length, 2, "gallery limit");
}

{
  const state = {
    dex: { caught: {}, shiny: {} },
    mons: { list: [{ pid: "pika", dex: 25, name: "皮卡丘", isShiny: true }] },
  };
  const n = syncShinyGalleryFromMons(state);
  assert.equal(n, 1, "sync added");
  assert.equal(shinyUniqueCount(state), 1, "synced unique");
  assert.equal(state.meta?.shinyMilestones?.s1, undefined, "silent sync no mile");
}

console.log("collection-fun-selfcheck: ok");
