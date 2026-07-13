# DESIGN.md — 宝可梦放置冒险

> Source of truth for UI · Ember Camp Night · v0.40.1+
> Inferred from live product + design-review 2026-07-11；演进现有气质，不换皮成通用 AI 仪表盘。

## Product vibe

夜间篝火挂机：深炭底、琥珀标题、冷蓝远景。信息密度偏高，但 **主操作永远一眼可点**。

## Aesthetic

| Token | Value | Role |
|-------|-------|------|
| Background | `#070a10` → `#0b0f17` + 红/琥珀/蓝径向雾 | Atmosphere（保留，勿改成纯平紫） |
| Panel | `rgba(255,255,255,0.05)` + 1px border | Cards / shell |
| Primary | `#facc15`（琥珀） | Brand / active tab / CTA |
| OK / Ready | `#34d399` | Gather ready / positive |
| Danger | `#ef4444` | Release / errors |
| Text | `rgba(255,255,255,0.92)` / muted `0.62` | Body / secondary |

**禁止：** 紫靛渐变仪表盘、奶油衬线、报纸细线多栏、满屏 glow pill 堆叠。

## Typography

- Display / brand：`Rajdhani` 700（仅顶栏标题）
- UI：`Noto Sans SC` 400/500/700
- 字号阶梯：11 / 12 / 13 / 15 / 18（勿再发明中间值）

## Spacing & radius

- Space：4 / 8 / 12 / 16 / 24
- Radius：8（控件）/ 12（行）/ 14（面板）
- 行内主按钮与文字间距 ≥ 8px

## Layout

1. **Topbar（两簇）**：左身份（品牌 + 训练家）· 右操作簇（采集主 CTA + 资源筹码横排，容量条 + 分色）
2. **Shell**：左日志（可空但有空态）· 右主舞台
3. **Tabs**：≤5 主栏 +「更多」；active 用琥珀底 + **底边指示条**
4. **Rows**：左信息 · 右主操作；费用用 muted chip，勿抢 CTA

## Motion

- 150–200ms ease 用于 hover/active
- 采集就绪：轻呼吸（已有）即可，勿加弹跳
- 尊重 `prefers-reduced-motion`

## Accessibility floor

- 可交互元素有 `:focus-visible` 琥珀环
- 对比：正文 ≥ muted 0.62 on dark；主文案近白
- 触控目标 ≥ 36px（小按钮纵向 padding 补足）

## Component notes

- **Resource chip**：圆角 12；名称 12 / 数值 16 Rajdhani；速率 11 青绿；底缘容量条；树果琥珀 / 球果橙 / 碎片冰蓝
- **Gather CTA**：顶栏中区独立主按钮，min-height 40、min-width 132；就绪态青绿
- **Tab**：非 active 无边框；active 琥珀边 + 底指示条
- **Build CTA**：`btn--primary` 仅用于建造/确认类；次要用 ghost/small
- **Building section**：琥珀标题 + 渐变分隔线（`.building-section`）
- **Building level bar**：8px 轨、琥珀填充；满级青绿；由 `buildings.js` 直出
