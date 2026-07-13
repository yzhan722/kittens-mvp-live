# Dual-track Loop Plan (4 slices)

> Execute in order without pausing for user between slices. No commit/deploy unless asked.

**Specs:** era-content + pve-team + dual-track-roadmap (2026-07-12)

## Slice 1 — Era mutators real
- Fix `pokeballGain_10` → +10% bonus balls on craft
- Wire `encounterRefresh_fast` → `encounterCharges` / `encounterPlus` recharge ×0.9 in tick.js
- Era panel mutator chips
- Extend era-selfcheck

## Slice 2 — PvE type hard
- Stage pressure weak/resist on incoming damage
- Recommend types UI
- Auto team = type-first then power
- pve selfcheck fixtures

## Slice 3 — Era theme
- blurb + encounterBias on ERA_DEFS
- Apply bias in capture_tab weight pick
- Panel blurb

## Slice 4 — PvE phys/spe
- calcDamage uses atk/def vs spa/spd
- Enemy stats split
- UI badges + tip on loss
