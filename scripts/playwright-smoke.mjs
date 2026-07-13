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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

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
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
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
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#btnGather", { timeout: 30000 });
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

  await page.locator("#tab-capture").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-capture");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  const captureEncounter = await page.locator("#captureActions .row__title", { hasText: "遭遇" }).count();
  const captureLocked = await page.locator("#captureActions", { hasText: "精灵球基础" }).count();
  if (captureEncounter < 1 && captureLocked < 1) {
    console.error("playwright-smoke: FAIL capture tab unexpected empty state");
    process.exit(1);
  }

  const pveTab = page.locator("#tab-pve");
  const pveVisible = await pveTab.isVisible().catch(() => false);
  if (pveVisible) {
    await pveTab.click();
    await page.waitForFunction(
      () => {
        const p = document.getElementById("panel-pve");
        return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
      },
      null,
      { timeout: 15000 }
    );
    const pveTitle = await page.locator("#pveList .row__title").first().innerText().catch(() => "");
    if (!pveTitle.includes("PvE") && !pveTitle.includes("挑战")) {
      console.error("playwright-smoke: FAIL pve tab missing challenge list:", pveTitle);
      process.exit(1);
    }
  } else {
    console.log("playwright-smoke: pve tab locked (fresh save) — capture path OK");
  }

  console.log("playwright-smoke: OK");
} finally {
  await browser.close();
  server.close();
}
