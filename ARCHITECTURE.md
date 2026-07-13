# 宝可梦挂机 — 代码架构说明

> 版本：v0.40.1 · 最后更新：2026-07-12

## 整体架构

纯前端挂机游戏（Vanilla JS ES Modules）+ Cloudflare Pages Functions + D1。

```
浏览器
  └── main.js（版本检测 / 加载重试）
        └── app.js（组装 + boot）
              ├── modules/systems/    纯函数
              ├── modules/render/ · tabs/ · app/
              └── fetch /api/*  ──►  functions/api/*  ──►  D1 (binding DB)
```

### 入口与启动流程

1. **main.js**：比对 `CURRENT_VERSION`（localStorage `lastKnownVersion`）；版本变化时清 SW 缓存并刷新。动态 `import` `type_zh.js` → `app.js`，失败最多 5 次指数退避重试。
2. **app.js `boot()`**：`load()` 本地存档 → 离线 tick 结算 → 每日登录奖励 → 云存档 token 则 `doCloudSyncNow()` → 初始化好友/社交/引导/红点 → `render()` → 默认 `activateTab("bonfire")` → 500ms `tick` 循环 + 3s 自动存。

### Tab 阶段性解锁（`app.js` `render()` 内 `updateTabVisibility`）

| Tab | 可见条件 |
|-----|----------|
| capture, dex, social, leaderboard, science, bonfire, help, options | 始终 |
| mons, functions, items | `unlocks.pokeball` **或** 已有精灵 |
| future | 图鉴唯一捕获 ≥ 1 |
| pve | 图鉴唯一捕获 ≥ 5 |

`data-unlocked="0"` 的 Tab 由 `tabController.refreshTabChrome()` 灰显。

## 后端（本树可重部署）

源码目录：[`functions/api/`](functions/api/)（Cloudflare Pages Functions）。

| 区域 | 路径 |
|------|------|
| 健康检查 | `GET /api/health` |
| 鉴权 | `POST /api/auth/{register,login,logout}` |
| 云存档 | `GET /api/save/meta` · `GET|PUT /api/save?slot=`（乐观锁：PUT 若客户端 `updatedAt` < 库内 → 409） |

### 存档槽约定

| slot | 用途 |
|------|------|
| 0 | 自动存（`kittens_mvp_save_v1`） |
| 1 | 可选手动键（`kittens_mvp_save_slot_1`，当前 UI 未暴露，仍参与云同步） |
| 2–3 | API 预留，前端未接线 |

- 本机：localStorage + `_bak`；切后台/关页会 `keepalive` 推 slot0
- Session：Bearer，TTL **90 天**（按 `sessions.created_at`，过期删会话）
- 选项页：导出/导入 JSON 文件（灾难恢复）

| 排行榜 | `POST /api/score/submit` · `GET /api/leaderboard/:board` |
| 跑马灯 | `GET /api/events/pull` · `POST /api/events/push` |
| 全服 Buff | `GET /api/server/buffs` · `POST /api/server/buffs/buy` |
| Boss | `GET /api/server/boss/bully` · `POST .../attack|claim` |
| 好友 | `/api/friends/{list,request,accept,gift}`（`requireUser`） |
| 社交 | `/api/social/{messages,pvp-*,achievements,friend-profile}`（**全部 `requireUser`**；actor=session uid） |
| 每日任务 | 客户端本地进度 + 登录后 `GET/POST /api/daily_tasks*`（Bearer，防重复领取）；离线仍可玩 |

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
node scripts/items-selfcheck.mjs
```

部署：`deploy.ps1`（`wrangler pages deploy .`，会带上 `functions/`）。  
`wrangler.toml` / `.env.local` 仍 gitignore。

前端仓：https://github.com/yzhan722/kittens-mvp-live

CI：`.github/workflows/selfcheck.yml`（push/PR 跑三个 selfcheck：frontend · api-contract · items）。

## 前端要点

- `app.js` 组装层；`ui.fetch` 带 Bearer，供云存档与社交 API 使用
- 道具使用：`modules/item_usage.js`（幸运蛋/王冠/糖果等）；药剂强化在 `modules/tabs/mons_tab.js`（`statBonus` 单项上限 +50）
- 版本四处同步：`index.html` / `main.js` / `sw.js` / `modules/config.js`
- 协作：`.cursor/rules/kittens-collab.mdc`

## 密钥

- `.env*` 已 ignore；本项目当前选择不轮换 token（2026-07-11）
