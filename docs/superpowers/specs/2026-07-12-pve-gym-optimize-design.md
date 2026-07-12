# PvE Gym Deep Optimize — Design (2026-07-12)

## Problems
1. 500-round chip timeout = false loss while player HP high
2. Recommended SE types can be defensively weak to stage (ghost/ghost)
3. Late gyms stall with low BST; damage floor too low
4. Weak feedback on why fight failed

## Changes
1. **Damage:** scale ×1.75 + min damage `max(1, floor(atkStat/12))` (immune still 1)
2. **Timeout:** if hit MAX_ROUNDS, compare remaining HP%; player higher → 1★ decision win; else timeout loss with log
3. **Recommend/auto:** score = SE + resist − weak; prefer dual-role
4. **UI:** team matchup line; fail tips by endReason; suggest enemy avg level
5. **Balance:** 2-8 快龙 stars 3→2; enemy lvlMul 0.035→0.032

No commit/deploy unless asked.
