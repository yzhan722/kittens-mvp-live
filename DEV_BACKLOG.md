# Dev Backlog — 存档加固

> 模式：长跑到队列空 · 2026-07-11

---

## 进行中

- [ ] **SAVE-006** selfcheck + deploy + commit/push `size:S`

---

## 待做

（空）

---

## 已完成

| ID | 摘要 | 完成日 |
|----|------|--------|
| SAVE-001 | PUT `/api/save` 乐观锁 → 409 | 2026-07-11 |
| SAVE-002 | Session TTL 90d（created_at） | 2026-07-11 |
| SAVE-003 | visibility/pagehide keepalive 推 slot0 | 2026-07-11 |
| SAVE-004 | 槽位 0+1 文档化；2–3 预留 | 2026-07-11 |
| SAVE-005 | 同步失败提示 + 导出/导入 JSON | 2026-07-11 |

---

## Loop Prompt

```text
SAVE-006：允许 deploy + commit + push。不 wipe D1。不轮换 token。
```
