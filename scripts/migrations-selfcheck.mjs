#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const expected = [
  {
    file: "scripts/migrations/2026-07-12-rate-limits.sql",
    table: "rate_limits",
    column: "window_start",
  },
  {
    file: "scripts/migrations/2026-07-13-iap-orders.sql",
    table: "iap_orders",
    column: "status",
  },
];

for (const item of expected) {
  const full = path.join(root, item.file);
  assert(existsSync(full), `missing ${item.file}`);
  const sql = readFileSync(full, "utf8");
  assert(/CREATE TABLE IF NOT EXISTS/i.test(sql), `${item.file} has CREATE TABLE`);
  assert(sql.includes(item.table), `${item.file} mentions ${item.table}`);
  assert(sql.includes(item.column), `${item.file} mentions ${item.column}`);
}

if (failed) {
  console.error(`migrations-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("migrations-selfcheck: OK");
