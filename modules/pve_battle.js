// PvE 战斗模拟引擎 — 自动回合制
import { clamp } from "./utils.js";
import { getStarBonusMul } from "./stars.js";
import { getTypeMul, calcTypeMul, TYPE_KEYS } from "./type_chart.js";

export const PVE_MAX_ROUNDS = 500;

/**
 * 属性对关卡的适配分：进攻克制 + 防御抗性 − 防御弱点
 * @param {string[]} monTypes
 * @param {string|null} stageType
 */
export function typeMatchScore(monTypes, stageType) {
  const types = Array.isArray(monTypes) ? monTypes.filter((t) => typeof t === "string") : [];
  let se = false;
  let resist = false;
  let weak = false;
  if (stageType) {
    for (const t of types) {
      if (getTypeMul(t, stageType) > 1) se = true;
      const incoming = getTypeMul(stageType, t);
      if (incoming > 1) weak = true;
      else if (incoming > 0 && incoming < 1) resist = true;
      else if (incoming === 0) resist = true;
    }
  }
  let score = 0;
  if (se) score += 100;
  if (resist) score += 45;
  if (weak) score -= 70;
  if (se && resist) score += 35;
  if (se && weak) score -= 25; // 互克陷阱（如幽灵馆带幽灵）
  return { se, resist, weak, score };
}

/** 推荐属性：优先「能打又抗」 */
export function recommendedTypes(stageType, limit = 3) {
  if (!stageType) return [];
  const n = Math.max(1, Math.min(6, Math.floor(limit) || 3));
  return TYPE_KEYS.map((t) => ({ t, ...typeMatchScore([t], stageType) }))
    .filter((x) => x.se)
    .sort((a, b) => b.score - a.score || a.t.localeCompare(b.t))
    .slice(0, n)
    .map((x) => x.t);
}

/**
 * 为敌人生成 stats（与玩家成长公式对等，使战斗有真实挑战性）
 */
function makeEnemyStats(enemy, stageType) {
  const lvl = clamp(enemy.lvl ?? 1, 1, 100);
  const tierBonus = enemy.stars >= 3 ? 42 : enemy.stars >= 2 ? 26 : enemy.stars >= 1 ? 12 : 0;
  const dexBase = enemy.dex ?? 1;
  const specialTypes = new Set(["fire", "water", "electric", "grass", "ice", "psychic", "dragon", "fairy"]);
  const specialLean = specialTypes.has(stageType);
  const baseHp = 50 + (dexBase % 45) + tierBonus;
  const baseAtk = 45 + (dexBase % 40) + tierBonus;
  const baseSpa = 43 + ((dexBase * 7) % 42) + tierBonus;
  const baseDef = 40 + (dexBase % 35) + tierBonus;
  const baseSpd = 38 + ((dexBase * 5) % 36) + tierBonus;
  const baseSpe = 42 + (dexBase % 38) + tierBonus;
  const starMul = getStarBonusMul(enemy.stars ?? 0);
  // 略缓于旧版 0.035，减轻终盘血牛拖回合
  const lvlMul = (1 + (lvl - 1) * 0.032) * starMul;
  return {
    hp: Math.max(1, Math.floor(baseHp * lvlMul)),
    atk: Math.max(1, Math.floor((baseAtk + (specialLean ? -3 : 5)) * lvlMul)),
    spa: Math.max(1, Math.floor((baseSpa + (specialLean ? 5 : -3)) * lvlMul)),
    def: Math.max(1, Math.floor((baseDef + (specialLean ? -2 : 3)) * lvlMul)),
    spd: Math.max(1, Math.floor((baseSpd + (specialLean ? 3 : -2)) * lvlMul)),
    spe: Math.max(1, Math.floor(baseSpe * lvlMul)),
  };
}

/**
 * 计算单次攻击伤害（物/特分路 + 关卡压迫 + 保底伤害避免磨皮假负）
 */
export function calcDamage(attacker, defender, stageType, opts = {}) {
  const isSpecial = (attacker.spa ?? 0) >= (attacker.atk ?? 0);
  const atkStat = Math.max(1, isSpecial ? (attacker.spa ?? attacker.atk ?? 1) : (attacker.atk ?? 1));
  const defStat = Math.max(1, isSpecial ? (defender.spd ?? defender.def ?? 1) : (defender.def ?? 1));
  const typeMul = calcTypeMul(attacker.types ?? [], defender.types ?? []);
  if (typeMul === 0) return { damage: 1, typeMul: 0, immune: true, pressureMul: 1, category: isSpecial ? "special" : "physical" };

  let pressureMul = 1;
  if (attacker.side === "enemy" && defender.side === "player" && stageType) {
    let weak = false;
    let resist = false;
    for (const t of defender.types ?? []) {
      const m = getTypeMul(stageType, t);
      if (m > 1) weak = true;
      else if (m < 1) resist = true;
    }
    pressureMul = weak ? 1.4 : resist ? 0.7 : 1;
  }

  const power = atkStat * 1.75;
  const raw = Math.floor((power * typeMul * pressureMul) / defStat * (0.85 + Math.random() * 0.3));
  // 保底：至少造成 atk/20 的推进伤害，但保留物/特分路差异（加法而非 max 抹平）
  const progress = Math.max(0, Math.floor(atkStat / 20));
  const playerDamageMul =
    attacker.side === "player" && typeof opts?.playerDamageMul === "number" && Number.isFinite(opts.playerDamageMul)
      ? Math.max(0, opts.playerDamageMul)
      : 1;
  return {
    damage: Math.max(1, Math.floor((raw + progress) * playerDamageMul)),
    typeMul,
    immune: false,
    pressureMul,
    category: isSpecial ? "special" : "physical",
  };
}

function sideHpPct(units) {
  const max = units.reduce((s, u) => s + (u.maxHp || 0), 0);
  const cur = units.reduce((s, u) => s + Math.max(0, u.hp || 0), 0);
  return max > 0 ? cur / max : 0;
}

/**
 * 模拟一场 PvE 战斗
 * @returns {{ win, stars, rounds, log, teamHpPct, superEffectiveHits, endReason, enemyHpPct }}
 */
export function simulateBattle(team, enemies, stageType, opts = {}) {
  const log = [];
  const playerDamageMul =
    typeof opts?.playerDamageMul === "number" && Number.isFinite(opts.playerDamageMul)
      ? Math.max(0, opts.playerDamageMul)
      : 1;

  const playerUnits = team.map((m, i) => ({
    side: "player",
    idx: i,
    name: m.name,
    types: Array.isArray(m.types) ? m.types : [],
    maxHp: m.stats.hp,
    hp: m.stats.hp,
    atk: m.stats.atk,
    spa: m.stats.spa ?? m.stats.atk,
    def: m.stats.def,
    spd: m.stats.spd ?? m.stats.def,
    spe: m.stats.spe,
  }));

  const enemyUnits = enemies.map((e, i) => {
    const s = makeEnemyStats(e, stageType);
    const eTypes =
      Array.isArray(e.types) && e.types.length
        ? e.types.filter((t) => typeof t === "string").slice(0, 2)
        : [stageType || "normal"];
    return {
      side: "enemy",
      idx: i,
      name: e.name || `敌人${i + 1}`,
      types: eTypes,
      maxHp: s.hp,
      hp: s.hp,
      atk: s.atk,
      spa: s.spa,
      def: s.def,
      spd: s.spd,
      spe: s.spe,
    };
  });

  let pIdx = 0;
  let eIdx = 0;
  let rounds = 0;
  const totalPlayerHp = playerUnits.reduce((s, u) => s + u.maxHp, 0);
  let superEffectiveHits = 0;

  if (!playerUnits.length) {
    return {
      win: false,
      stars: 0,
      rounds: 0,
      log: ["— 没有出战精灵 —"],
      teamHpPct: 0,
      enemyHpPct: 1,
      superEffectiveHits: 0,
      endReason: "empty",
    };
  }

  log.push(`— 战斗开始 —`);
  log.push(`派出 ${playerUnits[pIdx].name}！`);
  log.push(`对手派出 ${enemyUnits[eIdx].name}！`);

  while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < PVE_MAX_ROUNDS) {
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
    const first = pFirst ? p : e;
    const second = pFirst ? e : p;
    if (Math.max(p.spe, e.spe) >= Math.min(p.spe, e.spe) * 1.1) {
      log.push(`R${rounds}: ${first.name} 先手！`);
    }

    const hit1 = calcDamage(first, second, stageType, { playerDamageMul });
    second.hp = Math.max(0, second.hp - hit1.damage);
    if (first.side === "player" && hit1.typeMul > 1) superEffectiveHits += 1;
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

    const hit2 = calcDamage(second, first, stageType, { playerDamageMul });
    first.hp = Math.max(0, first.hp - hit2.damage);
    if (second.side === "player" && hit2.typeMul > 1) superEffectiveHits += 1;
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

  const remainingHp = playerUnits.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const teamHpPct = totalPlayerHp > 0 ? remainingHp / totalPlayerHp : 0;
  const enemyHpPct = sideHpPct(enemyUnits);

  let win = eIdx >= enemyUnits.length;
  let endReason = win ? "clear" : pIdx >= playerUnits.length ? "wipe" : "ongoing";
  let stars = 0;

  if (!win && rounds >= PVE_MAX_ROUNDS && pIdx < playerUnits.length && eIdx < enemyUnits.length) {
    if (teamHpPct > enemyHpPct) {
      win = true;
      endReason = "decision";
      stars = 1;
      log.push(`— 超时判定：我方剩余生命更优（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%），险胜！—`);
    } else {
      endReason = "timeout";
      log.push(`— 超时判定：未能压过对手生命（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%）—`);
    }
  }

  if (win && endReason === "clear") {
    if (teamHpPct > 0.7) stars = 3;
    else if (teamHpPct > 0.3) stars = 2;
    else stars = 1;
  }

  if (win && endReason === "clear") log.push(`— 战斗胜利！（${stars}星）—`);
  else if (win && endReason === "decision") log.push(`— 战斗胜利！（判定 ${stars}星）—`);
  else log.push(`— 战斗失败 —`);

  return { win, stars, rounds, log, teamHpPct, enemyHpPct, superEffectiveHits, endReason };
}
