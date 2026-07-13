#!/usr/bin/env node
/** Large save serialize stress — 5000 mons round-trip. */
import assert from "node:assert/strict";
import { serializeState } from "../modules/state.js";

function makeMon(id) {
  return {
    id,
    pid: "pikachu",
    dex: 25,
    name: "皮卡丘",
    lvl: 5,
    exp: 0,
    stars: 0,
    nature: "hardy",
    isShiny: false,
    satiety: 100,
    affection: 0,
    busy: null,
  };
}

const mons = [];
for (let i = 1; i <= 5000; i += 1) mons.push(makeMon(i));

const state = {
  version: 1,
  res: { catnip: { value: 10, cap: 100 } },
  dex: { caught: { pikachu: 1 } },
  mons: { list: mons, nextId: 5001 },
  unlocks: {},
  buildings: {},
  tech: {},
};

const t0 = Date.now();
const payload = serializeState(state);
const raw = JSON.stringify(payload);
assert.ok(typeof raw === "string" && raw.length > 100_000, "serialized blob size");
const parsed = JSON.parse(raw);
assert.equal(parsed.mons.list.length, 5000, "mons count preserved");
const ms = Date.now() - t0;
assert.ok(ms < 5000, `serialize+parse under 5s (got ${ms}ms)`);

console.log(`save-stress-selfcheck: OK (${mons.length} mons, ${raw.length} bytes, ${ms}ms)`);
