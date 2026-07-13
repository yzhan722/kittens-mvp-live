# Era Chronicle（图鉴编年史）— Design Spec

**Date:** 2026-07-12  
**Status:** Draft for user review (not implemented)  
**Game:** kittens-mvp-live  
**Approach:** 方案 1 — 时代 = 规则层（不改地区 `unlockReq`）

## Goals

- Pokémon-themed progression from ancient → future (9 eras).
- Each era advances only via **quest gate** + player tap「迈入下一时代」.
- Each era applies **1–2 rule mutators** for freshness (MVP); skins/copy polish later.
- Save on advance: **full keep** (resources, buildings, mons, dex).
- Prestige (hard reset path) is **hooked but not built**.

## Non-goals (MVP)

- Binding capture-area unlocks to era.
- Soft/hard prestige reset on advance.
- Side quests issuance (field reserved only).
- Heavy art / BGM / new full tab if existing UI can host a panel.
- Auto commit / deploy.

## Locked decisions

| Topic | Choice |
|-------|--------|
| Freshness | Rules first (C); content skins later |
| Advance | Active button after quests (B) |
| On advance | Full keep (A) |
| Quests | Short main list + `kind` reserve for side (D) |
| Architecture | Overlay rule layer; regions stay dex-gated |
| Era count | 9 |
| Quest difficulty | **~≥1h dwell via activity targets only** (no clock quest) |

---

## Era ladder + mutators

Mutators **stack** (later eras keep earlier bonuses). Prefer existing `effects` multipliers. If a subsystem is missing, use the listed fallback.

| # | `id` | Name | Theme | Mutators (on entering this era) |
|---|------|------|-------|----------------------------------|
| 1 | `dawn` | 宝可梦出现之时 | First encounters | none (baseline) |
| 2 | `hamlet` | 秘传之里 | Berries, first partner | `berryYield +12%` |
| 3 | `fossil` | 化石苏醒 | Fossils / museum | `catchRate +6%`, `researchTime −8%` |
| 4 | `gym` | 道馆挑战纪 | Gyms / trainer | `pokeballGain +10%`, `encounterRefresh` slightly faster |
| 5 | `champion` | 冠军之路 | League / Elite Four | dex-linked small bonus **or** `pokeballCap +8%`; training/XP +10% if exists else same cap fallback |
| 6 | `mega` | Mega 进化潮 | Mega / Key Stone vibe | `buildingYield +10%`; affection/boost micro **or** `researchCost −8%` |
| 7 | `dynamax` | 极巨化旷野 | Galar / Dynamax | `fieldYield +10%`; slightly higher weight for “large” encounters if tagged, else catchRate +3% |
| 8 | `terastal` | 太晶祭典 | Paldea / Tera | `researchTime −10%`; type-advantage micro **or** `catchRate +4%` |
| 9 | `paradox` | 悖论时空 | Paradox / endgame | shiny micro-up; rare/legendary weight micro-up; `allYield +5%` (small cap) |

**Balance note:** keep numbers conservative; tune after playtest. Mutator ids live in defs so balance is data-only.

---

## Quests + advance flow

### Flow

1. Current era shows **2–3 main** quests.
2. All main quests `done` → enable「迈入下一时代」.
3. On click: `era.id` / `index` advance, apply new mutators, load next quest template, write one log line.
4. Full keep save.
5. Era 9: when mains complete, no further advance; show「已抵达悖论时空」; side slots unused.

### Pacing rule (locked)

**Target: ~≥1 hour dwell per era — enforced only by quest magnitudes, never by a timer quest.**

- **No** `era_time_min` / playtime hard gate. Players may advance the moment all activity mains are done.
- Size catch / gather / berry / research / building targets so a **normally active** player needs about an hour; rushing still hits resource/ball/research bottlenecks.
- Passive berry quests use early field rates (~0.15/s ≈ 540/h before mutators) as the idle spine where appropriate.
- Expected chronicle length: **~≥9 hours** of meaningful play across 9 eras (not AFK clock-watching).
- Offline: activity counters follow existing game rules (passive field production may count for `berry_earned`; catches/gathers do not invent themselves). No special “credit 60min offline” rule.

### Quest types (hook existing counters)

| `type` | Meaning |
|--------|---------|
| `catch_count` | Catches ≥ N |
| `dex_unique` | Unique dex ≥ N (absolute) |
| `gather_total` | Gather actions ≥ N |
| `research_done` | Completed research techs ≥ N (absolute) |
| `building_level` | Specific building level ≥ N |
| `building_levels_sum` | Sum of building levels ≥ N |
| `area_unlock` | Capture area unlocked |
| `berry_earned` | Berries gained ≥ N |
| `pokeball_earned` | Pokeballs gained ≥ N |

**Progress scope (MVP):**

- `catch_count`, `gather_total`, `berry_earned`, `pokeball_earned` → **era-scoped** (reset on advance).
- `dex_unique`, `research_done`, `building_*`, `area_unlock` → **absolute** snapshot checks.

### Quest difficulty (~1h via conditions)

Calibrate to ~1h mixed play. Binding constraints should be **balls / research time / berry income / building costs**, not a stopwatch.

| Era | Main quests (draft) |
|-----|---------------------|
| 宝可梦出现之时 | 采集 **400**；捕捉 **80**；本时代树果获得 **400** |
| 秘传之里 | 田地 ≥ **4**；本时代树果获得 **800**；图鉴 **25**；本时代捕捉 **100** |
| 化石苏醒 | 研究完成 **5**；本时代捕捉 **150**；图鉴 **45**；本时代球果获得 **200** |
| 道馆挑战纪 | 解锁城都 **或** 图鉴 **55**；本时代捕捉 **200**；本时代球果获得 **280**；建筑等级总和 ≥ **18** |
| 冠军之路 | 图鉴 **90**；研究 **8**；本时代捕捉 **240**；本时代树果获得 **1200** |
| Mega 进化潮 | 关键建筑 ≥ **5**；研究 **11**；图鉴 **130**；本时代捕捉 **260** |
| 极巨化旷野 | 解锁丰缘 **或** 图鉴 **110**；本时代采集 **500**；本时代捕捉 **300**；本时代树果获得 **1500** |
| 太晶祭典 | 研究 **14**；图鉴 **200**；建筑等级总和 ≥ **55**；本时代捕捉 **320** |
| 悖论时空 | 图鉴 **300**；本时代捕捉 **360**；研究 **16**；本时代球果获得 **400**（终局；不进阶，完成后显示已抵达） |

**Why these magnitudes (rough):**

- Early field ~0.15 berry/s → **400–800** berry ≈ **0.7–1.5h** idle spine; gather **400** and catch **80–100** need sustained ball crafting (~1 catch/min is optimistic early → closer to 1.5h+).
- Mid eras: catch **200–260**/era plus ball-earned gates keep grinders on ball economy ~1h+.
- Late: higher catch + research count + building sum so power spikes do not clear an era in minutes.

If live median dwell << 1h for active players → raise catch/berry/ball first. If >> 2h → lower those, **do not** add a clock.

### Quest record shape

```js
{
  id: "dawn_catch_80",
  kind: "main",       // reserve "side"
  type: "catch_count",
  target: 80,
  progress: 0,
  done: false,
  scope: "era",
}
```

---

## Data model

```js
era: {
  id: "dawn",
  index: 0,                 // 0..8
  mode: "chronicle",        // future: "distortion"
  quests: [ /* current */ ],
  questCounters: {},        // era-scoped bumps
  completedEraIds: [],
  mutatorsActive: [],       // stacked mutator ids
}
```

**Migration:** missing `era` → derive index (see Success criteria); do not wipe other progress. Recompute `mutatorsActive` from `completedEraIds` + current id on load. No `enteredAt` / `elapsedSec` required for MVP.

---

## Runtime modules (planned)

| Piece | Role |
|-------|------|
| `modules/defs_eras.js` | 9 eras, mutators, quest templates |
| `modules/systems/era.js` | `bumpQuest`, `canAdvance`, `advanceEra`, migration helper |
| `modules/systems/effects.js` | fold `mutatorsActive` into existing muls |
| Capture / gather / research call sites | thin `bump` hooks |
| UI | panel on Capture top (preferred) or compact block: name, quest list, advance button |

Do **not** change `CAPTURE_AREAS.unlockReq` in `modules/config.js`.

---

## Prestige / distortion (reference only — not MVP)

How C folds in later without rewriting chronicle:

| Hook | Use |
|------|-----|
| `era.mode` | `chronicle` vs `distortion` |
| `kind: "side"` | optional hard quests → permanent micro bonuses |
| mutator flag `prestigeOnly` | stronger bonuses only in distortion |
| `advanceEra({ resetSoft })` | MVP never passes true; distortion passes soft resource/building decay |

Product framing later: **「时空歪曲挑战」** beside main **「图鉴编年史」** — separate CTA, not the same button.

---

## UI (MVP)

- Capture page top (or adjacent): current era title, 2–3 mains with progress, advance button when ready.
- Log line on advance, e.g. `迈入了「化石苏醒」——化石宝可梦的气息变浓了。`
- Optional one-line era chip in help/resources — skip if clutter.
- No skin pack / BGM in MVP.

---

## Success criteria

- New player sees era 1 quests early; cannot skip eras.
- **No playtime/stopwatch quest**; ~1h dwell emerges from activity targets under normal play.
- Advancing changes at least one felt number (yield / catch / research time).
- Mid-game migrated saves land on a derived era and still face that era’s (raised) activity mains.
- No regression to region unlock curve.

**Migration preference (locked):** on first load without `era`, set `index` to the highest era whose **absolute prerequisites** (dex / building / research thresholds listed on the *previous* era’s advance requirements) are already satisfied; fill `completedEraIds` + `mutatorsActive`; generate current era-scoped mains at 0. Veterans skip empty early ceremonies but still grind the next mutator.

---

## Self-review

- [x] No TBD placeholders for core flow
- [x] Prestige clearly non-MVP
- [x] Dwell via condition sizing only — **no** `era_time_min` hard gate
- [x] Region unlock not dual-gated
- [x] Fallback mutators when subsystem missing
- [x] Commit/deploy out of scope unless user asks

## Open for implementation plan (not blocking spec)

1. Exact building ids for `building_level` quests.
2. Whether `encounterRefresh` is a real timer knob or deferred.
3. First playtest pass: measure median minutes/era; adjust catch/berry/ball targets only.
