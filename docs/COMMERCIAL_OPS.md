# Commercial Ops — 上线前短清单

> v0.40.1 · 非代码；与 `ARCHITECTURE.md` 互补

## CI / 质量门

- [ ] `node scripts/selfcheck.mjs` 绿
- [ ] `node scripts/api-contract-selfcheck.mjs` 绿
- [ ] `node scripts/items-selfcheck.mjs` 绿（幸运蛋 / 王冠 / 药剂契约）
- [ ] `node scripts/analytics-selfcheck.mjs` 绿
- [ ] `node scripts/daily_tasks-selfcheck.mjs` 绿
- [ ] `node scripts/e2e-smoke.mjs` 绿（关键文件 + analytics/daily_tasks/era 子自检）
- [ ] `node scripts/playwright-smoke.mjs`：安装 Playwright 时真跑；未安装只会明确 `SKIP`
- [ ] GitHub Actions `selfcheck` workflow 全步骤过

## D1 迁移

- [ ] 增量 migration（`migrations/*.sql`、`scripts/migrations/*.sql`），**禁止**未授权全量 `d1_schema.sql`
- [ ] 本地逐个验证：
  - `npx wrangler d1 execute kittens-mvp --local --file scripts/migrations/2026-07-12-rate-limits.sql`
  - `npx wrangler d1 execute kittens-mvp --local --file scripts/migrations/2026-07-13-iap-orders.sql`
- [ ] 本地验证通过后，先备份/确认 D1 环境，再将同一命令改为 `--remote` 执行
- [ ] Prod 执行后查询 `rate_limits`、`iap_orders` 表存在；记录执行时间与操作者
- [ ] 当前状态：上述两个 Prod migration **尚未确认 apply**

## IAP / 赞助（诚实桩）

- [ ] `modules/iap_stub.js`：`purchase()` 无 `window.KITTENS_IAP_PROVIDER` 时返回 `{ ok:false, reason:'provider_unconfigured' }`，**不得**伪造支付成功
- [ ] `GET /api/iap/catalog` 公开只读目录
- [ ] `POST /api/iap/webhook`：未配置 `IAP_WEBHOOK_SECRET` 时拒绝；配置后验签并写 `pending` 台账
- [ ] 设置页「支持开发者」展示赞助 QR + 目录「即将上线」列表
- [ ] 真商户接入：配置 provider、履约 worker 与退款/幂等流程后再开 `iap_enabled`

## 写接口鉴权

- [ ] `/api/social/*`、`/api/friends/*`、`/api/daily_tasks*` 等写路径需 `requireUser`（见 `api-contract-selfcheck.mjs`）
- [ ] 限流写端点（buff 购买、boss、score、events）需 `checkRateLimit`

## 版本与缓存

- [ ] `index.html` / `main.js` / `sw.js` / `modules/config.js` 四处版本一致
- [ ] 发版后 spot-check：`lastKnownVersion` 触发清缓存

## API 退役确认

- [ ] 前端无 `/api/daily_tasks` 调用（任务在 `modules/daily_tasks.js` 本地）
- [ ] `/api/daily_tasks*` 仍返回 410（勿误删路由）

## 鉴权面

- [ ] `/api/social/*` 与 `/api/friends/*` 均需 Bearer（`requireUser`）
- [ ] 未登录社交 Tab 有明确空态/引导登录

## 部署

- [ ] `wrangler pages deploy` 含 `functions/`
- [ ] `GET /api/health` 返回当前版本
- [ ] D1 变更走增量 migration，**禁止**未授权全量 `d1_schema.sql`
