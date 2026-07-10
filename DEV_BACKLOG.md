# Dev Backlog — functions/ 重建

> 模式：长跑到队列空 · 计划：重建 functions（全量 + 清库）

---

## 进行中

（空）

---

## 待做

（可执行 BE 队列已空）

---

## 等你拍板

- [ ] **BE-D01** 允许 wipe 远程 D1 并执行 `wrangler d1 execute ... --file=./d1_schema.sql` `tag:decision`
- [ ] **BE-D02** 允许 `deploy.ps1` 上线新 `functions/` `tag:decision`
- [ ] **FIX-D01b** 是否轮换 Cloudflare token `tag:decision`

---

## 已完成

| ID | 摘要 | 完成日 |
|----|------|--------|
| BE-001 | scaffold `_*.js` + `/api/health` | 2026-07-10 |
| BE-002 | schema v2 + `scripts/d1_reset.sql`；旧 migrations 归档 | 2026-07-10 |
| BE-003 | auth + save | 2026-07-10 |
| BE-004 | score + 9 leaderboards + events | 2026-07-10 |
| BE-005 | server buffs + boss | 2026-07-10 |
| BE-006 | friends + social | 2026-07-10 |
| BE-007 | daily_tasks API + `ui.fetch` + `#dailyTasks` DOM | 2026-07-10 |
| BE-008 | docs + api-contract-selfcheck（本地 pages dev 冒烟待你环境） | 2026-07-10 |
| INF-D01 | 关闭：后端在本树 `functions/` 重建 | 2026-07-10 |

---

## Loop Prompt

```text
读 DEV_BACKLOG：仅在你确认 wipe/deploy 后执行 BE-D01/D02。
不自动 deploy；不自动 wipe D1。
```
