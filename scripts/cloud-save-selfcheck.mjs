#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const saveApi = readFileSync(join(root, "functions/api/save/index.js"), "utf8");
const cloud = readFileSync(join(root, "modules/cloud_save.js"), "utf8");
const app = readFileSync(join(root, "app.js"), "utf8");

assert.ok(saveApi.includes("status: 409"), "optimistic lock 409");
assert.ok(saveApi.includes("remoteAt > updatedAt"), "stale client refused");
assert.ok(cloud.includes("handleConflict") || cloud.includes("conflict:true"), "client conflict path");
assert.ok(app.includes("exportSaveJson") && app.includes("importSaveJsonFile"), "json export/import");
assert.ok(app.includes("kittens_mvp_save_slot_1") || app.includes("SAVE_SLOT_KEY"), "slot1 key");
assert.ok(app.includes("btnSaveSlot1") || readFileSync(join(root, "index.html"), "utf8").includes("btnSaveSlot1"), "slot1 UI");

console.log("cloud-save-selfcheck: ok");
