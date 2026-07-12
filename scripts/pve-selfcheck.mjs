#!/usr/bin/env node
import {
  calcDamage,
  simulateBattle,
  recommendedTypes,
  typeMatchScore,
  PVE_MAX_ROUNDS,
} from "../modules/pve_battle.js";
import { PVE_CHAPTERS } from "../modules/pve_defs.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const realRandom = Math.random;
Math.random = () => 0.5;

try {
  const enemy = { side: "enemy", name: "雷压", types: ["electric"], atk: 90, spa: 90, def: 40, spd: 40, spe: 30 };
  const wrongDef = { side: "player", name: "高战水队", types: ["water"], atk: 80, spa: 80, def: 50, spd: 50 };
  const seDef = { side: "player", name: "地面克制队", types: ["ground"], atk: 60, spa: 60, def: 50, spd: 50 };
  const wrongHit = calcDamage(enemy, wrongDef, "electric");
  const seHit = calcDamage(enemy, seDef, "electric");
  assert(wrongHit.damage > seHit.damage, "wrong-type team takes more stage pressure damage");

  const wrongTeam = [{
    name: "高战水队",
    types: ["water"],
    stats: { hp: 280, atk: 70, def: 50, spa: 70, spd: 50, spe: 45 },
  }];
  const seTeam = [{
    name: "地面克制队",
    types: ["ground"],
    stats: { hp: 240, atk: 55, def: 50, spa: 55, spd: 50, spe: 45 },
  }];
  const enemies = [{ dex: 26, name: "雷丘", lvl: 35, stars: 1 }];
  const wrongResult = simulateBattle(wrongTeam, enemies, "electric");
  const seResult = simulateBattle(seTeam, enemies, "electric");
  assert(seResult.teamHpPct > wrongResult.teamHpPct, "SE team preserves more HP than higher-power wrong type");
  assert(seResult.superEffectiveHits > wrongResult.superEffectiveHits, "SE team lands more super-effective hits");

  const specialAttacker = { side: "player", name: "特攻手", types: ["water"], atk: 40, spa: 100 };
  const physicalAttacker = { side: "player", name: "物攻手", types: ["normal"], atk: 100, spa: 40 };
  const physWall = { side: "enemy", name: "物防墙", types: ["normal"], def: 120, spd: 40 };
  const specWall = { side: "enemy", name: "特防墙", types: ["normal"], def: 40, spd: 120 };
  assert(calcDamage(specialAttacker, physWall).damage > calcDamage(specialAttacker, specWall).damage, "special attacker checks spd");
  assert(calcDamage(physicalAttacker, specWall).damage > calcDamage(physicalAttacker, physWall).damage, "physical attacker checks def");

  // Recommend dual-role: ghost stage should prefer dark over ghost
  const ghostRec = recommendedTypes("ghost", 3);
  assert(ghostRec[0] === "dark", `ghost stage top recommend is dark, got ${ghostRec[0]}`);
  assert(typeMatchScore(["dark"], "ghost").score > typeMatchScore(["ghost"], "ghost").score, "dark scores above ghost vs ghost stage");

  // Progress damage: high atk should exceed low atk vs same wall
  const high = calcDamage(
    { side: "player", types: ["ground"], atk: 120, spa: 40, def: 50, spd: 50 },
    { side: "enemy", types: ["electric"], atk: 50, spa: 50, def: 50, spd: 50 },
    "electric"
  );
  const low = calcDamage(
    { side: "player", types: ["ground"], atk: 40, spa: 20, def: 50, spd: 50 },
    { side: "enemy", types: ["electric"], atk: 50, spa: 50, def: 50, spd: 50 },
    "electric"
  );
  assert(high.damage > low.damage, "higher atk deals more damage");

  const baselineHit = calcDamage(
    { side: "player", types: ["normal"], atk: 80, spa: 40 },
    { side: "enemy", types: ["normal"], def: 60, spd: 60 },
    "normal"
  );
  const boostedHit = calcDamage(
    { side: "player", types: ["normal"], atk: 80, spa: 40 },
    { side: "enemy", types: ["normal"], def: 60, spd: 60 },
    "normal",
    { playerDamageMul: 1.5 }
  );
  assert(boostedHit.damage > baselineHit.damage, "playerDamageMul increases player damage");

  // Timeout decision: fat enemies + strong remaining HP → decision win not false loss
  const stallTeam = Array.from({ length: 6 }, (_, i) => ({
    name: `stall${i}`,
    types: ["fairy"],
    stats: { hp: 800, atk: 8, def: 80, spa: 8, spd: 80, spe: 40 },
  }));
  const fatEnemies = [
    { dex: 149, name: "快龙", lvl: 50, stars: 2 },
    { dex: 148, name: "哈克龙", lvl: 40, stars: 1 },
  ];
  const stall = simulateBattle(stallTeam, fatEnemies, "dragon");
  assert(stall.rounds >= PVE_MAX_ROUNDS || stall.win, "stall fight hits cap or finishes");
  if (stall.rounds >= PVE_MAX_ROUNDS) {
    assert(stall.endReason === "decision" || stall.endReason === "timeout", "timeout sets endReason");
    if (stall.teamHpPct > stall.enemyHpPct) {
      assert(stall.win === true && stall.stars === 1, "HP-advantage timeout is 1★ decision win");
    }
  }

  // 2-8 exists and dragonite not ★3 anymore
  const dragon = PVE_CHAPTERS[1].stages.find((s) => s.id === "2-8");
  assert(dragon && dragon.enemies.some((e) => e.dex === 149 && e.stars === 2), "2-8 dragonite stars nerfed to 2");
} finally {
  Math.random = realRandom;
}

if (failed) {
  console.error(`pve-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("pve-selfcheck: OK");
