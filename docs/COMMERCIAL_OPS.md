# Commercial Ops — 上线清单（三态）

> v0.41.6 · 2026-09-10  
> 状态：`已验证` = 本轮有证据 · `未做` = 仍缺 · `延期` = 明确不做直到条件满足

## CI / 质量门

| 项 | 状态 | 证据 |
|----|------|------|
| `node scripts/selfcheck.mjs` | 已验证 | 本地 2026-09-10 `selfcheck: OK`（含 cloud/newbie/restart） |
| `api-contract` / `items` / `analytics` / `daily_tasks` / `era` / `gameplay-fun` / `migrations` | 已验证 | 本轮均 OK |
| Playwright smoke | 已验证 | `playwright-smoke: OK` |
| Player sim 6h | 已验证 | `player-sim: 0 FAIL` seed=1 720 steps |
| GitHub Actions 全绿 | 未做 | 需推分支后看 run |

## D1 迁移

| 项 | 状态 | 证据 |
|----|------|------|
| analytics / rate_limits / iap_orders remote apply | 已验证 | COMMERCIAL_OPS 原文：2026-07-15 `--remote`，tables 21 |
| 全量 `d1_schema.sql` wipe | 延期 | 禁止未授权清库 |

## IAP / 赞助

| 项 | 状态 | 证据 |
|----|------|------|
| 诚实桩（未配置不得伪造成功） | 已验证 | `iap_stub.purchase` → `provider_unconfigured`；e2e-smoke |
| 真商户 + `IAP_WEBHOOK_SECRET` + 履约 | 延期 | 见 `docs/IAP_DECISION.md`：v0.42 前不做真支付 |
| 设置页赞助 QR | 已验证 | index 支持开发者区块 |

## 写接口鉴权

| 项 | 状态 | 证据 |
|----|------|------|
| social/friends requireUser | 已验证 | api-contract-selfcheck |
| 氛围假人默认关 | 已验证 | `featureFlags.atmosphereFakes: false` |

## 版本与缓存

| 项 | 状态 | 证据 |
|----|------|------|
| 四处版本一致 | 已验证 | `0.41.6`：index/main/sw/config + health |
| 发版后清缓存 | 未做 | 需部署后 spot-check `lastKnownVersion` |

## 部署

| 项 | 状态 | 证据 |
|----|------|------|
| 生产 `GET /api/health` | 已验证 | 2026-09-10 live-health-smoke OK，version 0.41.2（0.41.6 待发布） |
| live-health-smoke | 已验证 | health / ingest / events / dex / friends 全绿 |
| 双号 PvP e2e 生产 | 已验证 | `pvp-live-e2e: OK` inviteId=4 resultsSeen |
| 留存公开榜 | 已验证 | dex 真人 1 行、score 3；见 `docs/ops/RETENTION_BASELINE.md` |
| IAP 诚实桩（线上 catalog/webhook） | 已验证 | iap-ledger-selfcheck OK |

## 留存

| 项 | 状态 | 证据 |
|----|------|------|
| 公开榜真人基线 | 已验证 | dex 真人 1 行、score 3；`docs/ops/RETENTION_BASELINE.md` |
| D1 `analytics_events` 分事件计数 | 未做 | 需 wrangler 凭证 |
