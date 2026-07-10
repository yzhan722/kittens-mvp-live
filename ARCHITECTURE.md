# 宝可梦挂机 — 代码架构说明

> 版本：v0.39.1 · 最后更新：2026-07-09

## 整体架构

本项目是一个纯前端挂机游戏（Vanilla JS ES Modules），线上后端为 Cloudflare Pages + D1 + Workers。

```
浏览器
  └── main.js          加载器（SW注册 + 动态import app.js）
        └── app.js     游戏主入口（~3500行，组装与串联）
              ├── modules/systems/    纯函数系统（effects/production/expedition/server_buffs）
              ├── modules/render/     渲染层（只写 DOM，不改 state）
              ├── modules/tabs/       交互层（事件处理，调用 app.js 注入的函数）
              ├── modules/app/        带副作用的子系统（ticker / capture_system）
              └── modules/*.js        数据/工具/服务（state/defs/cloud等）

线上 Cloudflare
  └── /api/*           Workers API（auth/save/leaderboard/social 等）
```

### 后端源码位置（重要）

**本工作树（`kittens-mvp-live`）不含 `functions/` 目录。**  
不可从本树直接重部署 Pages Functions。线上 API 仍由已部署的 Workers 提供；本地仅有 gitignored 的 `.workers-pool/` 缓存片段，不是完整后端源。

若需改 API：先恢复/检出后端仓（或历史 `functions/`），再部署。前端可继续对线上 `https://game.pokeauto.online/` 联调。

## 关键文件说明

### app.js（核心，~3500行）

游戏的「组装层」：状态、SECTION 分区逻辑、模块实例化与依赖注入、`boot()`。

SECTION 注释划分维护窗口；详见 `.cursor/rules/kittens-collab.mdc`。

### modules/systems/（纯函数）

| 文件 | 内容 |
|------|------|
| `effects.js` | computeTechEffects / getBuildingCost 等 |
| `production.js` | 产能上限、容器、finalizeProductionRates |
| `expedition.js` | 远征战力/类型倍率 |
| `server_buffs.js` | 全服 Buff 常量与查询 |

无 DOM、无网络。可用 `node scripts/selfcheck.mjs` 做冒烟。

### modules/app/（有副作用）

| 文件 | 内容 |
|------|------|
| `ticker.js` | 跑马灯（DOM + 可选网络） |
| `capture_system.js` | 捕捉区域/池辅助 |

### modules/render/ · modules/tabs/

渲染只写 DOM；tabs 只绑事件并调用注入的 app 函数。

## 数据流

```
用户点击 → modules/tabs → app.js 函数 → state → render() → modules/render → DOM
每秒 Tick → modules/tick → computeDerived() → 资源增长 → render()
```

## 存档系统

```
本地：kittens_mvp_save_v1（+ _bak）· Base64 JSON
云：/api/save/get|put · 登录后同步 · 单档约 512KB
加载：主本地 → 备份 → 新建
```

## 密钥与卫生

- `.env` / `.env.local` / `wrangler.toml` 已在 `.gitignore`（含 Cloudflare token 时勿提交）
- `.kittens/`、`.workers-pool/` 已 ignore
- **若 token 曾出现在聊天/共享目录：请在 Cloudflare 控制台手动轮换**（Agent 不自动改密钥）

## 多窗口协作

见 `.cursor/rules/kittens-collab.mdc`。纯计算优先进 `modules/systems/`；改 `app.js` 前确认 SECTION 窗口无冲突。

## 版本号管理

以下 4 处须同步为同一版本（当前 **0.39.1**）：

- `index.html`：`<title>` + CSS/JS 的 `?v=`
- `main.js`：`CURRENT_VERSION`
- `sw.js`：`CACHE_VERSION`
- `modules/config.js`：`VERSION`

`app.js` 内 ES module import 的 `?v=` 亦应对齐当前版本（缓存戳）。

## 本地自检

```bash
node scripts/selfcheck.mjs
node --check app.js
```
