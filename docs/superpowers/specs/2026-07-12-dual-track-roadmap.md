# Dual-track Roadmap — Era Content + PvE Team

**Date:** 2026-07-12  
**Status:** Approved direction (Approach 1 + single loop push)  
**Delivery:** Four alternating slices in one continuous implementation loop. No auto commit/deploy unless user asks.

## Locked product choices

| Topic | Choice |
|-------|--------|
| Packaging | Two specs + this roadmap |
| Era MVP | D — theme encounters/copy + real mutators (events later) |
| PvE MVP | D — hard type play + phys/special/speed matter (slot rules later) |
| Slice order | C — ① era mutators → ② PvE types → ③ era theme → ④ PvE phys/spe |

## Specs

- `docs/superpowers/specs/2026-07-12-era-content-design.md`
- `docs/superpowers/specs/2026-07-12-pve-team-design.md`

## Slice checklist (loop order)

1. **Era mutators real** — replace MVP fallbacks; wire `encounterRefresh_fast`, real `pokeballGain_10`
2. **PvE type hard** — stage type pressure + UI tip; weaken pure-power auto team vs wrong types
3. **Era theme content** — per-era panel copy + encounter pool weight bias (regions unlock unchanged)
4. **PvE phys/spe** — damage uses atk vs spa correctly; speed already exists — amplify + log clarity

## Light interface (optional, MVP may no-op)

```js
// reserved on era def — not required for slices 1–4
pveHint?: string;          // shown on challenge tab when era active
pveCatchBonus?: number;    // unused MVP
```

## Non-goals (this loop)

- Era timed events
- PvE slot/position rules
- Prestige distortion
- New tabs
- Auto commit / deploy
- Fixing MEGA/skill-guard (separate P0 polish track)
