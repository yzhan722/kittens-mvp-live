# Dev Backlog — v0.41.6

> 2026-09-10 · 诚实空服 + 运营门禁，不是再刷乐趣分

## 待做（发布后）

- 部署 0.41.6 后重跑 live-health-smoke / retention-baseline
- D1 `analytics_events` 分事件计数（需 wrangler）
- 生产双号 PvP 若本轮脚本失败则记 P0

## 已完成（本轮代码）

| ID | 摘要 |
|----|------|
| OPS-010 | 氛围假人默认关，空榜/空动态诚实 CTA |
| OPS-011 | 留存基线脚本 + 云存档/新手/重启契约自检入 CI |
| OPS-012 | 闪光分享卡（文案 + canvas 下载，失败回退复制） |
| OPS-013 | 新号下一目标指向捕捉；handoff 在 Node 同步可测 |
| OPS-014 | `hatchEgg` 抽到 `modules/systems/breeding.js` |
| OPS-015 | IAP 明确延期到 v0.42；文档对齐 0.41.6 |
