// PVP 对战模块 — 统一使用共享属性克制表
import { getTypeMul, calcTypeMul } from "./type_chart.js";

export function createPvpBattle() {

  function simulateBattle(team1, team2, player1Name, player2Name) {
    const battleLog = [];
    const t1 = Array.isArray(team1) ? team1 : [];
    const t2 = Array.isArray(team2) ? team2 : [];

    if (t1.length === 0 || t2.length === 0) {
      battleLog.push("对战取消：至少一方队伍为空");
      return { winner: 0, battleLog, rounds: 0 };
    }

    const fighters1 = t1.map(mon => ({
      ...mon,
      currentHp: mon.hp || mon.stats?.hp || 100,
      maxHp: mon.hp || mon.stats?.hp || 100,
      types: Array.isArray(mon.types) ? mon.types : [],
      name: mon.name || "未知",
      owner: player1Name,
    }));

    const fighters2 = t2.map(mon => ({
      ...mon,
      currentHp: mon.hp || mon.stats?.hp || 100,
      maxHp: mon.hp || mon.stats?.hp || 100,
      types: Array.isArray(mon.types) ? mon.types : [],
      name: mon.name || "未知",
      owner: player2Name,
    }));

    let idx1 = 0;
    let idx2 = 0;
    let round = 0;
    const maxRounds = 200;

    battleLog.push(`${player1Name} VS ${player2Name}`);
    battleLog.push(`${player1Name} 派出 ${fighters1[idx1].name}！`);
    battleLog.push(`${player2Name} 派出 ${fighters2[idx2].name}！`);

    while (idx1 < fighters1.length && idx2 < fighters2.length && round < maxRounds) {
      round++;

      const mon1 = fighters1[idx1];
      const mon2 = fighters2[idx2];

      if (mon1.currentHp <= 0) {
        idx1++;
        if (idx1 < fighters1.length) {
          battleLog.push(`${player1Name} 派出 ${fighters1[idx1].name}！`);
        }
        continue;
      }

      if (mon2.currentHp <= 0) {
        idx2++;
        if (idx2 < fighters2.length) {
          battleLog.push(`${player2Name} 派出 ${fighters2[idx2].name}！`);
        }
        continue;
      }

      const speed1 = mon1.speed || mon1.stats?.spe || 50;
      const speed2 = mon2.speed || mon2.stats?.spe || 50;
      const roundBonus = Math.floor(round / 10) * 0.1;

      if (speed1 >= speed2) {
        doAttack(mon1, mon2, battleLog, roundBonus);
        if (mon2.currentHp > 0) {
          doAttack(mon2, mon1, battleLog, roundBonus);
        } else {
          battleLog.push(`${mon2.name} 倒下了！`);
        }
      } else {
        doAttack(mon2, mon1, battleLog, roundBonus);
        if (mon1.currentHp > 0) {
          doAttack(mon1, mon2, battleLog, roundBonus);
        } else {
          battleLog.push(`${mon1.name} 倒下了！`);
        }
      }

      if (mon1.currentHp <= 0 && !battleLog[battleLog.length - 1].includes(`${mon1.name} 倒下`)) {
        battleLog.push(`${mon1.name} 倒下了！`);
      }
      if (mon2.currentHp <= 0 && !battleLog[battleLog.length - 1].includes(`${mon2.name} 倒下`)) {
        battleLog.push(`${mon2.name} 倒下了！`);
      }
    }

    let winner = null;
    const alive1 = fighters1.filter(f => f.currentHp > 0).length;
    const alive2 = fighters2.filter(f => f.currentHp > 0).length;
    if (alive1 > 0 && alive2 <= 0) {
      battleLog.push(`${player1Name} 获胜！`);
      winner = 1;
    } else if (alive2 > 0 && alive1 <= 0) {
      battleLog.push(`${player2Name} 获胜！`);
      winner = 2;
    } else {
      const cur1 = fighters1[Math.min(idx1, fighters1.length - 1)];
      const cur2 = fighters2[Math.min(idx2, fighters2.length - 1)];
      const hp1Pct = (cur1?.currentHp ?? 0) / Math.max(1, cur1?.maxHp ?? cur1?.hp ?? 1);
      const hp2Pct = (cur2?.currentHp ?? 0) / Math.max(1, cur2?.maxHp ?? cur2?.hp ?? 1);
      if (hp1Pct > hp2Pct) {
        battleLog.push(`战斗超时，${player1Name} 血量优势获胜！`);
        winner = 1;
      } else if (hp2Pct > hp1Pct) {
        battleLog.push(`战斗超时，${player2Name} 血量优势获胜！`);
        winner = 2;
      } else {
        battleLog.push("战斗超时，平局！");
        winner = 0;
      }
    }

    return { winner, battleLog, rounds: round };
  }

  function doAttack(attacker, defender, log, roundBonus) {
    const damage = calculateDamage(attacker, defender, roundBonus);
    defender.currentHp -= damage.value;
    const mulText = damage.mul > 1 ? "（效果拔群）" : damage.mul === 0 ? "（免疫）" : "";
    log.push(`${attacker.name} 攻击 ${defender.name}，造成 ${damage.value} 伤害${mulText}！（剩余 HP: ${Math.max(0, defender.currentHp)}）`);
  }

  function calculateDamage(attacker, defender, roundBonus) {
    const attack = attacker.attack || attacker.stats?.atk || 50;
    const defense = defender.defense || defender.stats?.def || 50;
    const level = attacker.level || attacker.lvl || 1;

    const baseDamage = Math.max(1, Math.floor((attack * level / 50) - (defense / 4)));
    const damageWithBonus = Math.floor(baseDamage * (1 + roundBonus));

    // 使用共享的 calcTypeMul（统一 2x 效果拔群）
    const typeMul = calcTypeMul(attacker.types, defender.types);

    if (typeMul === 0) return { value: 1, mul: 0 };

    let damage = Math.floor(damageWithBonus * typeMul);
    damage = Math.floor(damage * (0.85 + Math.random() * 0.15));

    return { value: Math.max(1, damage), mul: typeMul };
  }

  return { simulateBattle };
}
