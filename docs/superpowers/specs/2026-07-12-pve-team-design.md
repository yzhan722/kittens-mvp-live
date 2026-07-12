# PvE Team Composition — Design Spec

**Date:** 2026-07-12  
**Status:** Ready for loop implementation  
**Depends on:** `modules/pve_battle.js`, `modules/pve_defs.js`, `modules/tabs/pve_tab.js`  
**Roadmap:** `2026-07-12-dual-track-roadmap.md` slices ② + ④

## Goal

Players must **choose types and roles**, not only「一键最强」by raw power. Wrong-type power stacks should struggle; right types + phys/special matchups should win more cleanly.

## Non-goals

- Slot/position rules (later)
- Manual turn combat UI
- New PvP rules (unless shared helpers are reused later)
- Era-gated chapters (light `pveHint` only, optional)

---

## Current baseline

- `calcTypeMul` already exists; enemies all share single `stage.type`.
- Damage picks `max(atk, spa)` vs `def` only — **special defense ignored**; roles collapsed.
- Speed already decides first hit.
- UI shows stage type badge + team power sum; auto-pick = highest power.

---

## Slice ② — Type pressure hard

### Battle

1. Amplify type impact for PvE only (keep chart; adjust application):
   - SE (`>1`): damage × **1.25 extra** on top of chart (or raise SE path so felt gap widens) — prefer: `effectiveMul = typeMul ** 1.0` already; instead apply **player damage taken** from enemy: if player is weak to stage type, enemy damage ×1.35; if resistant, ×0.65.
   - Clearer approach **locked:**
     - Outgoing: keep `calcTypeMul(attacker.types, defender.types)`.
     - **Stage pressure:** if stage has `type`, enemies deal ×1.4 to targets weak to that type, ×0.7 to resists (in addition to normal type mul on each hit).
2. **推荐克制提示** on stage panel: list 1–3 types that are SE vs `stage.type` (from type chart inverse).
3. **一键最强 → 一键克制优先：** auto-fill prefers mons with SE vs stage type, then power as tie-break. Keep a secondary「纯战力」button if cheap; else replace auto with 克制优先 and label it clearly.

### Stage data (light)

- Keep single `type` per stage MVP.
- Optional later: `types: []` on individual enemies — out of slice ② unless trivial.

### Success

- Same high-power wrong-type team clears fewer mid/late stages than a lower-power SE team (assert via battle selfcheck fixtures).
- UI shows 推荐属性 before fight.

---

## Slice ④ — Phys / Special / Speed

### Damage model change

```js
// Pick category by attacker: if spa >= atk → special hit else physical
const isSpecial = (attacker.spa ?? 0) >= (attacker.atk ?? 0);
const atkStat = isSpecial ? (attacker.spa ?? attacker.atk) : attacker.atk;
const defStat = isSpecial ? (defender.spd ?? defender.def) : defender.def;
```

- Enemies: give distinct `atk`/`spa`/`def`/`spd` in `makeEnemyStats` (derive from dex + stage type flavor: e.g. special-leaning types get higher spa).
- Player units already have spa/spd from real stats — pass them through (verify `pve_tab` mapping).

### Speed

- Keep spe first-strike.
- Log: `先手！` when speed differs by ≥10%; optional priority note in result summary: `先手次数`.

### UI

- Team modal: show 物/特 lean badge (物 or 特) from atk vs spa.
- Battle result: count 效果拔群 hits; if 0 and loss, tip「试试推荐属性」。

### Success

- Selfcheck: special attacker vs high-def low-spd target deals more than vs high-spd wall (and vice versa for physical).
- Auto team still works but type-first from slice ②.

---

## Shared / light era interface

- Optional: show `era.pveHint` string under challenge header if present on current era def — no combat effect in this loop.

## Self-review

- [x] Slot rules later
- [x] Type chart module reused, not forked into a second chart
- [x] Amplification is PvE-scoped (don't break expedition/PVP unexpectedly — share helpers carefully)
- [x] Commit/deploy out of scope
