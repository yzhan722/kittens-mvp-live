# kittens-mvp-live

宝可梦放置冒险（idle）前端 + Cloudflare Pages Functions。

## 跑起来

- 静态页：直接开 `index.html`，或 Pages 部署本仓根目录
- 自检：`node scripts/selfcheck.mjs` · `node scripts/e2e-smoke.mjs`
- 线上巡检：
  - `node scripts/live-health-smoke.mjs`
  - `node scripts/pvp-live-e2e.mjs`（双号 invite→accept→result）
  - `node scripts/iap-ledger-selfcheck.mjs`（台账诚实桩；真商户需配置 `IAP_WEBHOOK_SECRET`）
- D1 迁移：`node scripts/apply-d1-migrations.mjs`（Prod 加 `--remote`，配置见 `scripts/wrangler.d1.toml`）
- 部署：`.\deploy.ps1`（需 `.env.local` Cloudflare 凭证）

## 文档

- 架构：`ARCHITECTURE.md`
- 上线清单：`docs/COMMERCIAL_OPS.md`
- 乐趣记分：`PLAYER_FUN_SCORECARD.md`

## 版本

以 `index.html` / `main.js` / `sw.js` / `modules/config.js` 的 `v0.x.y` 为准，四处保持一致。
