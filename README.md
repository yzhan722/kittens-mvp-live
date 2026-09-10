# kittens-mvp-live

宝可梦放置冒险（idle）前端 + Cloudflare Pages Functions。

## 跑起来

- 静态页：直接开 `index.html`，或 Pages 部署本仓根目录
- 自检：`node scripts/selfcheck.mjs` · `node scripts/e2e-smoke.mjs`
- 留存快照：`node scripts/retention-baseline.mjs`
- 线上巡检：
  - `node scripts/live-health-smoke.mjs`
  - `node scripts/pvp-live-e2e.mjs`（双号 invite→accept→result）
  - `node scripts/iap-ledger-selfcheck.mjs`（台账诚实桩；真商户需配置 `IAP_WEBHOOK_SECRET`）
- D1 迁移：`node scripts/apply-d1-migrations.mjs`（Prod 加 `--remote`，配置见 `scripts/wrangler.d1.toml`）
- 部署：`.\deploy.ps1`（需 `.env.local` Cloudflare 凭证）

## 文档

- 架构：`ARCHITECTURE.md`
- 上线清单：`docs/COMMERCIAL_OPS.md`
- IAP 决策：`docs/IAP_DECISION.md`
- 乐趣记分：`PLAYER_FUN_SCORECARD.md`
- v0.41.2 发版说明：`docs/ops/RELEASE_v0.41.2.md`

## 进度跟踪（不要只写 markdown）

下一轮冲刺以 GitHub 为准，不要把未完成项只勾在 backlog 里当「队列空」。

- 生产标签：[v0.41.2](https://github.com/yzhan722/kittens-mvp-live/releases/tag/v0.41.2)（`master` `7ce8d4d`，live `game.pokeauto.online` health 0.41.2）
- Milestone：[v0.41.2](https://github.com/yzhan722/kittens-mvp-live/milestone/1)
- 本分支代码：v0.41.6（[PR #5](https://github.com/yzhan722/kittens-mvp-live/pull/5)），待部署见 [#2](https://github.com/yzhan722/kittens-mvp-live/issues/2)
- `feat/era-chronicle` 已删：[#9](https://github.com/yzhan722/kittens-mvp-live/issues/9)

## 版本

以 `index.html` / `main.js` / `sw.js` / `modules/config.js` 的 `v0.x.y` 为准，四处保持一致。生产标签是 0.41.2；本仓 `restart/p1-p13` 代码是 0.41.6。
