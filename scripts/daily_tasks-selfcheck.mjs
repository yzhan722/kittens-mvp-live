#!/usr/bin/env node
import {
  clampDate,
  validateTasksPayload,
  yesterdayOf,
} from "../functions/api/daily_tasks/index.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(clampDate("2026-07-12") === "2026-07-12", "clamp date ok");
assert(clampDate("bad") === null, "clamp date bad");
assert(yesterdayOf("2026-07-12") === "2026-07-11", "yesterday");
assert(
  validateTasksPayload([{ type: "login", current: 1, target: 1, completed: true }]) === true,
  "valid tasks"
);
assert(
  validateTasksPayload([{ type: "login", current: 0, target: 1, completed: true }]) === false,
  "cheat completed without progress"
);
assert(validateTasksPayload([]) === false, "empty tasks");

if (failed) {
  console.error(`daily_tasks-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("daily_tasks-selfcheck: OK");
