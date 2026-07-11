# 宝可梦挂机 — 代码架构说明

> 版本：v0.39.1 · 最后更新：2026-07-10

## 整体架构

纯前端挂机游戏（Vanilla JS ES Modules）+ Cloudflare Pages Functions + D1。

```
浏览器
  └── main.js → app.js
        ├── modules/systems/    纯函数
        ├── modules/render/ · tabs/ · app/
        └── fetch /api/*  ──►  functions/api/*  ──►  D1 (binding DB)
```

## 后端（本树可重部署）

源码目录：[`functions/api/`](functions/api/)（Cloudflare Pages Functions）。

| 区域 | 路径 |
|------|------|
| 健康检查 | `GET /api/health` |
| 鉴权 | `POST /api/auth/{register,login,logout}` |
| 云存档 | `GET /api/save/meta` · `GET|PUT /api/save?slot=` |
| 排行榜 | `POST /api/score/submit` · `GET /api/leaderboard/:board` |
| 跑马灯 | `GET /api/events/pull` · `POST /api/events/push` |
| 全服 Buff | `GET /api/server/buffs` · `POST /api/server/buffs/buy` |
| Boss | `GET /api/server/boss/bully` · `POST .../attack|claim` |
| 好友 | `/api/friends/{list,request,accept,gift}` |
| 社交 | `/api/social/{messages,pvp-*,achievements,friend-profile}` |
| 每日任务 | `GET /api/daily_tasks` · `POST /api/daily_tasks/claim` |

共享模块：`_db.js` · `_auth.js` · `_uid.js` · `_buffs.js` · `_boss.js`。

### D1 Schema 与迁移政策

- 基线定义：[`d1_schema.sql`](d1_schema.sql)（含 `DROP` + `CREATE`，**仅灾难恢复 / 明确授权清库**）
- 重置副本：[`scripts/d1_reset.sql`](scripts/d1_reset.sql)
- **默认禁止远程 wipe。** 日常 schema 变更走增量 SQL（建议放 `migrations/`，只 `ALTER`/`CREATE IF NOT EXISTS`），先本地 `pages dev` 验证再 `wrangler d1 execute --remote --file=...`
- 全量 `d1_schema.sql` 清库须口头确认（会清空排行榜/存档/社交）

```bash
# 灾难恢复 / 已授权清库 ONLY
wrangler d1 execute kittens-mvp --remote --file=./d1_schema.sql
```

本地开发：

```bash
wrangler pages dev . --persist-to .wrangler/state --d1=DB
node scripts/api-contract-selfcheck.mjs
node scripts/selfcheck.mjs
```

部署：`deploy.ps1`（`wrangler pages deploy .`，会带上 `functions/`）。  
`wrangler.toml` / `.env.local` 仍 gitignore。

前端仓：https://github.com/yzhan722/kittens-mvp-live

CI：`.github/workflows/selfcheck.yml`（push/PR 跑两个 selfcheck）。

## 前端要点

- `app.js` 组装层；`ui.fetch` 带 Bearer，供每日任务等 API 使用
- 版本四处同步：`index.html` / `main.js` / `sw.js` / `modules/config.js`
- 协作：`.cursor/rules/kittens-collab.mdc`

## 密钥

- `.env*` 已 ignore；本项目当前选择不轮换 token（2026-07-11）
