#!/usr/bin/env node
/**
 * Apply pending D1 migrations via wrangler when available.
 * Usage:
 *   node scripts/apply-d1-migrations.mjs          # local D1
 *   node scripts/apply-d1-migrations.mjs --remote # production D1
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.argv.includes("--remote");
const DB = "kittens-mvp";
const CONFIG = path.join(root, "scripts", "wrangler.d1.toml");
const files = [
  "scripts/migrations/2026-07-12-rate-limits.sql",
  "scripts/migrations/2026-07-13-iap-orders.sql",
  "scripts/migrations/2026-07-12-analytics.sql",
];

for (const rel of files) {
  if (!existsSync(path.join(root, rel))) {
    console.error(`apply-d1-migrations: FAIL missing ${rel}`);
    process.exit(1);
  }
}

if (!existsSync(CONFIG)) {
  console.error(`apply-d1-migrations: FAIL missing ${CONFIG}`);
  process.exit(1);
}

const wrangler = spawnSync("npx", ["wrangler", "--version"], {
  stdio: "pipe",
  shell: true,
  cwd: root,
});
if (wrangler.status !== 0) {
  console.log("apply-d1-migrations: SKIP (wrangler not available)");
  for (const rel of files) {
    console.log(
      `  npx wrangler d1 execute ${DB} ${remote ? "--remote" : "--local"} --config scripts/wrangler.d1.toml --file ${rel}`
    );
  }
  process.exit(0);
}

for (const rel of files) {
  const full = path.join(root, rel);
  console.log(`apply-d1-migrations: ${remote ? "remote" : "local"} ${rel}`);
  const run = spawnSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      DB,
      remote ? "--remote" : "--local",
      "--config",
      CONFIG,
      "--file",
      full,
    ],
    { stdio: "inherit", shell: true, cwd: root }
  );
  if (run.status !== 0) {
    console.error(`apply-d1-migrations: FAIL ${rel}`);
    process.exit(run.status || 1);
  }
}

console.log("apply-d1-migrations: OK");
