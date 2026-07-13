# Player Fun Loop Plan — 一次性推进

> Date: 2026-07-13  
> Source: `kittens-player-tab-eval-2026-07-13`（玩家视角全标签评估）  
> Mode: **马拉松一次推完** · 不做中间停顿 · 不 commit 除非你要求

## Goal

把「我会再打开这一页吗」的短板抬过门槛，而不是堆商业/架构债。

## Scoring system（验收硬闸）

### Rubric per tab（玩家爽感 0–10）

| 维度 | 权重 | 问什么 |
|------|------|--------|
| **Loop clarity** | 25% | 打开页 5 秒内知道该点什么 |
| **Session dopamine** | 30% | 本次会话有可感知反馈（数字/文案/演出） |
| **Return reason** | 25% | 离线/挂机回来有「发生了什么」 |
| **Dead-end free** | 20% | 未登录/未解锁时仍有可做的事或诚实引导 |

**加权分** = 0.25·clarity + 0.30·dopamine + 0.25·return + 0.20·deadend

### Gate（不过不得标「完成」）

| 闸门 | 条件 |
|------|------|
| **G1 Core** | 捕捉保持 ≥8.0；篝火/研究/精灵 ≥6.5 |
| **G2 Shortboard** | 功能 ≥6.5；挑战 ≥7.0；社交 ≥5.5 |
| **G3 Meta** | 道具 ≥5.0；图鉴 ≥5.5；整体 13 标签均分 ≥7.0 |
| **G4 Verify** | selfcheck + gameplay-fun + pve + expedition + player-sim 6h 全绿 |
| **G5 Honesty** | 真·10 仍为 0；分数不得虚报；stillOpen 写清 |

Baseline（玩家评估）：功能 5.0 · 挑战 6.5 · 社交 4.0 · 道具 4.0 · 图鉴 5.0 · 均分 ~5.9（全标签）/ 核心 ~6.7

## Slices（按序一次做完）

### S1 — 功能页：回来有故事 `target: 功能 5.0→6.8`
- 训练完成摘要（本会话/离线获得经验汇总）
- 远征完成已有奇遇卡；补「进行中」预告文案 + 完成后 welcome-back 一行
- 功能页顶栏：下次可领 / 进行中倒计时一行摘要

### S2 — 挑战：练习模式 + 内容 `target: 挑战 6.5→7.5`
- **练习模式**：不扣每日次数，无奖励或半奖，失败不伤日限
- 扩展第 3 章（丰缘试炼，4–6 关）或至少 +4 关
- 练习入口文案清晰

### S3 — 社交：未登录也可玩 `target: 社交 4.0→6.0`
- 离线 NPC 对战（本地 simulate，写进 pvpRecent / 赛季统计）
- 未登录空态改为「先打训练家」+ 云登录仍可选

### S4 — 图鉴/道具/篝火微补 `target: 图鉴 5.5 · 道具 5.0 · 篝火 7.3`
- 图鉴：未捕获条目「去捕捉」跳转捕捉页
- 道具：失败用 hint/log 替代 alert；空态一句玩法提示
- 篝火：面板显示采集状态摘要（电荷/回充）避免空页

### S5 — 评分验收
- 跑全量自检 + player-sim 6h
- 写 `PLAYER_FUN_SCORECARD.md` + canvas（加权分 + gate 过/不过）

## Non-goals

- 不上线 / 不 Prod D1 / 不真商户
- 不拆 app.js 大块（除非实现必需）
- 不 inflate 分数

## Stop

仅当 G4 验证两轮仍失败，或触及 blocked-external。
