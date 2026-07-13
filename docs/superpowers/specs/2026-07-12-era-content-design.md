# Era Contentization — Design Spec

**Date:** 2026-07-12  
**Status:** Ready for loop implementation  
**Depends on:** existing Era Chronicle (`defs_eras.js`, `systems/era.js`)  
**Roadmap:** `2026-07-12-dual-track-roadmap.md` slices ① + ③

## Goal

Make each era **feel different** in capture: mutators actually change numbers players notice, and each era has theme copy + encounter bias — without changing `CAPTURE_AREAS.unlockReq`.

## Non-goals

- Timed era events (later)
- Prestige / distortion
- Binding region unlocks to era
- Full art / BGM packs

---

## Slice ① — Mutators real

### Problems today

| Mutator | Issue |
|---------|--------|
| `pokeballGain_10` | MVP fallback → `catchChanceAdd: 0.02` |
| `encounterRefresh_fast` | `encounterCooldownMul` unused by any system |

### Changes

1. **`pokeballGain_10`:** On successful pokeball craft, with era mutator active: `+10%` chance to craft +1 extra ball (or every 10th craft free +1 — pick **+1 free every 10 crafts while mutator active**, tracked in `era.questCounters.pokeball_craft_bonus` or simple `pokeballMade % 10 === 0` while mutator in `mutatorsActive`). Prefer: when crafting `n` balls, grant `floor(n * 0.1)` bonus balls (min 0). Felt immediately.

2. **`encounterRefresh_fast`:** Wire to **高级搜索 / encounter charge regen** if such a timer exists; else apply as **−10% gather-to-next-encounter friction** by reducing the effective cost of advanced search charges OR speeding charge regen by 10%. If no charge timer exists, map to: `catchCooldown` between manual throws if any; else **document as**: increase auto-encounter / batch throw rate by reducing internal delay if present. **Minimum viable wire:** if `ui` or state has encounter charge max/regen, multiply regen by `1/0.9`. Grep `encPlus` / charge systems during implement.

3. **Verify already-real mutators** still stack: berry/field/building yields, catchChanceAdd, researchTimeMul, researchCostMul, shiny/rare, capPokeballMul, allYield.

4. **UI:** Era panel shows active mutator one-liners (Chinese), not just quests — so players see *why* numbers changed.

### Success

- Gym era: crafting 10 balls yields measurable bonus vs without mutator.
- `encounterRefresh_fast` affects a real player-visible rate OR is replaced with a real alternative before ship (no silent no-op).

---

## Slice ③ — Theme encounters + copy

### Per-era content fields (add to `ERA_DEFS`)

```js
{
  // existing fields...
  blurb: "短描述，显示在时代面板",
  themeTags: ["berry", "fossil"], // for weight bias
  encounterBias: {
    // optional multipliers on pool pick weights
    typeBoost?: Record<string, number>,  // e.g. { rock: 1.4, ground: 1.3 }
    tierBoost?: { rare?: number, epic?: number },
    dexRangeBoost?: { min: number, max: number, mul: number }, // soft preference inside current area pool only
  },
}
```

### Theme table (MVP copy)

| Era | blurb | Bias idea |
|-----|-------|-----------|
| dawn | 最初的相遇，草丛里充满未知。 | slight common/uncommon (tutorial-friendly) |
| hamlet | 秘传之里的树果香气招来草系与普通系。 | grass/normal +1.35 |
| fossil | 化石馆的尘土飞扬——岩石与地面更常见。 | rock/ground +1.4 |
| gym | 道馆试炼的气息：战斗型更活跃。 | fighting/electric/water rotate soft OR rare +1.15 |
| champion | 通往联盟之路，少见个体变多。 | uncommon+rare weight up |
| mega | 关键石共鸣——高成长线精灵权重微升。 | dex in evolved ranges soft OR rare +1.2 |
| dynamax | 旷野气压上升，大型个体更易现身。 | rare +1.25 |
| terastal | 太晶辉光下，属性鲜明的精灵更醒目。 | boost primary type diversity (mild rare+) |
| paradox | 时空错乱：稀有与闪光的缝隙被撕开。 | rare/epic + shiny already from mutators |

**Constraint:** Bias only reweights **current area pool** — never unlocks locked areas or out-of-pool dex.

### UI

- Era panel: title + blurb + mutator chips + quests + advance
- Capture area row: optional one-line「当前时代氛围：…」

### Success

- Switching era changes blurb and, in the same area, shifts encounter type/tier distribution measurably in selfcheck Monte Carlo (e.g. 1000 rolls).

---

## Migration

- Old saves: missing `blurb`/`encounterBias` → read from defs only (no save fields needed).
- Mutator behavior change is forward-only; no save wipe.

## Self-review

- [x] Regions unlock unchanged
- [x] Events explicitly later
- [x] No silent no-op mutators allowed at end of slice ①
- [x] Commit/deploy out of scope
