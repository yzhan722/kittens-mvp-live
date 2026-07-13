#!/usr/bin/env node
/**
 * Optional browser smoke — honest SKIP when playwright is not installed.
 * ponytail: no package.json in repo; CI stays green without adding a dep.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("playwright-smoke: SKIP (playwright not installed — external blocker)");
  process.exit(0);
}

const indexPath = path.join(root, "index.html");
if (!existsSync(indexPath)) {
  console.error("playwright-smoke: FAIL missing index.html");
  process.exit(1);
}

const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`file://${indexPath.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#mainStage, #bootStatus", { timeout: 15000 });
  const title = await page.title();
  if (!title.includes("宝可梦")) {
    console.error("playwright-smoke: FAIL unexpected title:", title);
    process.exit(1);
  }
  console.log("playwright-smoke: OK");
} finally {
  await browser.close();
}
