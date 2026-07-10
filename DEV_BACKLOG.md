# Dev Backlog — 重构后加固

> 模式：**长跑到队列空**（`.cursor/rules/kittens-dev-loop.mdc`）  
> 来源：2026-07-09 全项目扫描建议

**图例：** `@window:A|B|C|D` · `size:S|M|L` · `tag:infra|extract|hygiene|docs|test|security`

---

## 进行中

（空）

---

## 待做（按优先级）

（可执行队列已空）

---

## 等你拍板

- [ ] **FIX-D01** 是否执行「首提 commit」与「轮换 Cloudflare token」`tag:decision`

---

## 已完成

| ID | 摘要 | 完成日 |
|----|------|--------|
| REF-001…D01 | 重构向队列 | 2026-07-09 |
| FIX-001 | ARCHITECTURE 标明本树无 `functions/`，不可从本仓重部署 API | 2026-07-09 |
| FIX-002 | `.env*` / `.kittens/` / `.workers-pool/` 已 ignore；文档含 token 轮换提醒 | 2026-07-09 |
| FIX-003 | `git init`（未 commit） | 2026-07-09 |
| FIX-004 | CAPTURE_AWARD 缩至 ~124 行；删重复 `elFutureShop` 监听；接线迁 `TAB_AND_RENDER_WIRE` | 2026-07-09 |
| FIX-005 | 删除未接线孤儿 `modules/app/{boss_bully,research,server_buffs}.js` | 2026-07-09 |
| FIX-006 | ARCHITECTURE 对齐 v0.39.1；`app.js` import `?v=` 统一 0.39.1 | 2026-07-09 |
| FIX-007 | `scripts/selfcheck.mjs` exit 0 | 2026-07-09 |
| FIX-008 | 清理根目录噪音；`.kittens/` ignore | 2026-07-09 |

---

## Loop 启动 Prompt

```text
执行 kittens 加固长跑：
读 DEV_BACKLOG.md，连续完成所有可执行 FIX-xxx，直到队列空或 blocked。
不 deploy；不 commit（除非我说 commit）；不轮换真实 token。
```
