# Dev Backlog — v0.41.6 代码 / v0.41.2 生产

> 2026-09-11 · 待做项以 GitHub Issue 为准，本文件只是索引。不要勾「队列空」。

## 待做（GitHub）

- [#2](https://github.com/yzhan722/kittens-mvp-live/issues/2) 部署 0.41.6 到 pokeauto.online，再重跑 live-health-smoke / retention-baseline
- [#3](https://github.com/yzhan722/kittens-mvp-live/issues/3) D1 `analytics_events` 分事件计数（需 wrangler）
- [#6](https://github.com/yzhan722/kittens-mvp-live/issues/6) 生产仍是 0.41.2 氛围假人；诚实空服要等 #2
- [#8](https://github.com/yzhan722/kittens-mvp-live/issues/8) 闪光馆全屏秀（分享卡已在 0.41.6，全屏秀非 blocker）

## 已完成（本轮代码）

| ID | 摘要 |
|----|------|
| OPS-010 | 氛围假人默认关，空榜/空动态诚实 CTA |
| OPS-011 | 留存基线脚本 + 云存档/新手/重启契约自检入 CI |
| OPS-012 | 闪光分享卡（文案 + canvas 下载，失败回退复制） |
| OPS-013 | 新号下一目标指向捕捉；handoff 在 Node 同步可测 |
| OPS-014 | `hatchEgg` 抽到 `modules/systems/breeding.js` |
| OPS-015 | IAP 明确延期到 v0.42；文档对齐 0.41.6 |
