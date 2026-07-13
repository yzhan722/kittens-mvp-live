#!/usr/bin/env node
/**
 * Browser smoke via local static server + Playwright.
 * SKIP exit 0 when playwright is not installed (local dev without npm ci).
 */
import { createRequire } from "node:module";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("playwright-smoke: SKIP (playwright not installed)");
  process.exit(0);
}

const indexPath = path.join(root, "index.html");
if (!existsSync(indexPath)) {
  console.error("playwright-smoke: FAIL missing index.html");
  process.exit(1);
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = (req.url || "/").split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(root, urlPath.replace(/^\//, "")));
    if (!file.startsWith(path.normalize(root)) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200);
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, base: `http://127.0.0.1:${addr.port}` });
    });
  });
}

const { server, base } = await startServer();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#mainStage, #topbarStatus", { timeout: 15000 });
  const title = await page.title();
  const status = await page.locator("#topbarStatus").innerText();
  if (!title.includes("宝可梦")) {
    console.error("playwright-smoke: FAIL unexpected title:", title);
    process.exit(1);
  }
  if (!status.includes("v0.40")) {
    console.error("playwright-smoke: FAIL unexpected topbar:", status);
    process.exit(1);
  }
  console.log("playwright-smoke: OK");
} finally {
  await browser.close();
  server.close();
}
