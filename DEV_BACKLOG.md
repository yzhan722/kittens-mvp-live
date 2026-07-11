# Dev Backlog — 上线后加固

> 模式：长跑到队列空 · 2026-07-11
> 决策：不轮换 Cloudflare token（FIX-D01b 关闭）

---

## 进行中

- [ ] **POST-007** deploy 前端文案 + commit/push 本轮 `size:S`

---

## 待做

（空）

---

## 已完成（本轮）

| ID | 摘要 | 完成日 |
|----|------|--------|
| POST-001 | 关闭 FIX-D01b / GIT-D01；ANALYTICS 改控制台 | 2026-07-11 |
| POST-002 | （随 POST-007 一并 commit）deploy.ps1 修复 | 2026-07-11 |
| POST-003 | 帮助 v0.39.1；公告补后端重建/清库 | 2026-07-11 |
| POST-004 | `.github/workflows/selfcheck.yml` | 2026-07-11 |
| POST-005 | ARCHITECTURE 增量 migration 政策 | 2026-07-11 |
| POST-006 | `memory/QA验证-2026-07-11.md` FAIL=0 | 2026-07-11 |

---

## 已关闭 / 不做

- [x] **FIX-D01b** 不轮换 Cloudflare token（用户 2026-07-11）
- [x] **GIT-D01** 已 push `972e254..8015e58`
- [x] **ANALYTICS** Zone Analytics 缺权限 — 改用 Cloudflare 控制台

---

## BE 已完成（摘要）

| ID | 摘要 | 完成日 |
|----|------|--------|
| BE-001…008 | functions/ 全量 + schema v2 | 2026-07-10 |
| BE-D01/D02 | wipe D1 + deploy | 2026-07-10 |

---

## Loop Prompt

```text
队列应已空。若只剩 POST-007：允许 deploy + commit + push。不 wipe D1。不轮换 token。
```
