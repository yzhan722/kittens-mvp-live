#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IAP_CATALOG,
  donateQrPath,
  getCatalog,
  purchase,
} from "../modules/iap_stub.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const criticalFiles = [
  "index.html",
  "app.js",
  "main.js",
  "modules/iap_stub.js",
  "functions/api/iap/catalog.js",
  "functions/api/iap/webhook.js",
  "functions/api/iap/grant.js",
  "modules/app/capture_award.js",
  "modules/analytics.js",
  "modules/daily_tasks.js",
  "modules/systems/era.js",
  "functions/api/health.js",
  "migrations/007_daily_tasks_progress.sql",
];

for (const rel of criticalFiles) {
  assert(existsSync(path.join(root, rel)), `missing ${rel}`);
}

assert(IAP_CATALOG.length === 4, "iap catalog has 4 SKUs");
assert(IAP_CATALOG.some((i) => i.sku === "monthly_card_cny"), "monthly_card_cny SKU");
assert(getCatalog().every((i) => i.purchasable === false), "catalog not purchasable");
assert(purchase("monthly_card_cny").reason === "provider_unconfigured", "honest purchase stub");
assert(purchase("nope").reason === "unknown_sku", "unknown sku");
assert(donateQrPath().includes("donate_qr"), "donate qr path");

const childChecks = [
  "analytics-selfcheck.mjs",
  "daily_tasks-selfcheck.mjs",
  "era-selfcheck.mjs",
  "migrations-selfcheck.mjs",
  "save-stress-selfcheck.mjs",
  "apply-d1-migrations.mjs",
  "pvp-flow-selfcheck.mjs",
  "playwright-smoke.mjs",
];
for (const script of childChecks) {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", script)], {
    stdio: "inherit",
  });
  if (r.status !== 0) failed += 1;
}

if (failed) {
  console.error(`e2e-smoke: ${failed} failed`);
  process.exit(1);
}
console.log("e2e-smoke: OK");
