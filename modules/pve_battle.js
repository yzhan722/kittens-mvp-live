// PvE 战斗模拟引擎 — 自动回合制
import { clamp } from "./utils.js";
import { getStarBonusMul } from "./stars.js";
import { getTypeMul, calcTypeMul } from "./type_chart.js";

/**
 * 为敌人生成 stats（与玩家成长公式对等，使战斗有真实挑战性）
 */
function makeEnemyStats(enemy) {
  const lvl = clamp(enemy.lvl ?? 1, 1, 100);
  const tierBonus = enemy.stars >= 3 ? 42 : enemy.stars >= 2 ? 26 : enemy.stars >= 1 ? 12 : 0;
  const dexBase = enemy.dex ?? 1;
  // 基础值范围与主流宝可梦相当（45~95区间）
  const baseHp  = 50 + (dexBase % 45) + tierBonus;
  const baseAtk = 45 + (dexBase % 40) + tierBonus;
  const baseDef = 40 + (dexBase % 35) + tierBonus;
  const baseSpe = 42 + (dexBase % 38) + tierBonus;
  const starMul = getStarBonusMul(enemy.stars ?? 0);
  // 敌人成长率略高于玩家基础（0.035 vs 0.03），使高等级敌人有威胁感
  const lvlMul = (1 + (lvl - 1) * 0.035) * starMul;
  return {
    hp:  Math.max(1, Math.floor(baseHp  * lvlMul)),
    atk: Math.max(1, Math.floor(baseAtk * lvlMul)),
    def: Math.max(1, Math.floor(baseDef * lvlMul)),
    spe: Math.max(1, Math.floor(baseSpe * lvlMul)),
  };
}

/**
 * 计算单次攻击伤害
 * 攻击方自动选 atk/spa 较高值（物攻/特攻取优）
 * 支持属性叠乘，随机浮动 ±15%
 */
function calcDamage(attacker, defender) {
  const atkStat = Math.max(attacker.atk ?? 1, attacker.spa ?? 1);
  const defStat = Math.max(1, defender.def ?? 1);
  const typeMul = calcTypeMul(attacker.types ?? [], defender.types ?? []);
  if (typeMul === 0) return { damage: 1, typeMul: 0, immune: true };
  const raw = Math.floor((atkStat * typeMul) / defStat * (0.85 + Math.random() * 0.30));
  return { damage: Math.max(1, raw), typeMul, immune: false };
}

/**
 * 模拟一场 PvE 战斗
 * @param {Array} team    玩家精灵数组 { name, types, stats: {hp,atk,def,spa,spd,spe} }
 * @param {Array} enemies 敌人数组 { dex, name, lvl, stars }
 * @param {string} stageType 关卡属性（敌人属性）
 * @returns {{ win, stars, rounds, log, teamHpPct }}
 */
export function simulateBattle(team, enemies, stageType) {
  const MAX_ROUNDS = 500;
  const log = [];

  const playerUnits = team.map((m, i) => ({
    side: "player",
    idx: i,
    name: m.name,
    types: Array.isArray(m.types) ? m.types : [],
    maxHp: m.stats.hp,
    hp:    m.stats.hp,
    atk:   m.stats.atk,
    spa:   m.stats.spa ?? m.stats.atk, // 特攻 fallback 到物攻
    def:   m.stats.def,
    spe:   m.stats.spe,
  }));

  const enemyUnits = enemies.map((e, i) => {
    const s = makeEnemyStats(e);
    const eType = stageType || "normal";
    return {
      side:  "enemy",
      idx:   i,
      name:  e.name || `敌人${i + 1}`,
      types: [eType],
      maxHp: s.hp,
      hp:    s.hp,
      atk:   s.atk,
      spa:   s.atk, // 敌人物攻=特攻（简化）
      def:   s.def,
      spe:   s.spe,
    };
  });

  let pIdx = 0;
  let eIdx = 0;
  let rounds = 0;
  const totalPlayerHp = playerUnits.reduce((s, u) => s + u.maxHp, 0);

  log.push(`— 战斗开始 —`);
  log.push(`派出 ${playerUnits[pIdx].name}！`);
  log.push(`对手派出 ${enemyUnits[eIdx].name}！`);

  while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < MAX_ROUNDS) {
    rounds++;
    const p = playerUnits[pIdx];
    const e = enemyUnits[eIdx];

    if (p.hp <= 0) {
      pIdx++;
      if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      continue;
    }
    if (e.hp <= 0) {
      eIdx++;
      if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      continue;
    }

    const pFirst = p.spe >= e.spe;
    const first  = pFirst ? p : e;
    const second = pFirst ? e : p;

    // 第一击
    const hit1 = calcDamage(first, second);
    second.hp = Math.max(0, second.hp - hit1.damage);
    const eff1 = hit1.immune ? "（无效）" : hit1.typeMul > 1 ? "（效果拔群）" : hit1.typeMul < 1 ? "（效果不佳）" : "";
    log.push(`R${rounds}: ${first.name} → ${second.name} ${hit1.damage}伤害${eff1} (${second.hp}/${second.maxHp})`);

    if (second.hp <= 0) {
      log.push(`${second.name} 倒下了！`);
      if (second.side === "enemy") {
        eIdx++;
        if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      } else {
        pIdx++;
        if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      }
      continue;
    }

    // 第二击
    const hit2 = calcDamage(second, first);
    first.hp = Math.max(0, first.hp - hit2.damage);
    const eff2 = hit2.immune ? "（无效）" : hit2.typeMul > 1 ? "（效果拔群）" : hit2.typeMul < 1 ? "（效果不佳）" : "";
    log.push(`R${rounds}: ${second.name} → ${first.name} ${hit2.damage}伤害${eff2} (${first.hp}/${first.maxHp})`);

    if (first.hp <= 0) {
      log.push(`${first.name} 倒下了！`);
      if (first.side === "enemy") {
        eIdx++;
        if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      } else {
        pIdx++;
        if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      }
    }
  }

  const win = eIdx >= enemyUnits.length;
  const remainingHp = playerUnits.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const teamHpPct = totalPlayerHp > 0 ? remainingHp / totalPlayerHp : 0;

  let stars = 0;
  if (win) {
    if (teamHpPct > 0.7) stars = 3;
    else if (teamHpPct > 0.3) stars = 2;
    else stars = 1;
  }

  log.push(win ? `— 战斗胜利！（${stars}星）—` : `— 战斗失败 —`);
  return { win, stars, rounds, log, teamHpPct };
}
