// 道具使用系统
export function createItemUsage({ state, addRes, addLog, addExpToMon, render }) {
  
  // 使用经验糖果
  function useExpCandy(monId, itemType) {
    const mon = state.mons.list.find(m => m.id === monId);
    if (!mon) return { success: false, message: "精灵不存在" };

    const expValues = {
      expCandy: 1000,
      expCandyL: 5000,
      expCandyXL: 20000,
    };

    const expGain = expValues[itemType] || 0;
    if (expGain <= 0) return { success: false, message: "无效的道具类型" };

    const itemCount = state.res[itemType]?.value || 0;
    if (itemCount < 1) return { success: false, message: "道具数量不足" };

    state.res[itemType].value = Math.max(0, itemCount - 1);
    addExpToMon(mon, expGain);
    
    const itemNames = {
      expCandy: "经验糖果",
      expCandyL: "经验糖果L",
      expCandyXL: "经验糖果XL",
    };

    addLog(`使用${itemNames[itemType]}：${mon.name} 获得 ${expGain} 经验`);
    return { success: true, message: `${mon.name} 获得了 ${expGain} 经验！` };
  }

  // 使用亲密度道具
  function useAffectionItem(monId, itemType) {
    const mon = state.mons.list.find(m => m.id === monId);
    if (!mon) return { success: false, message: "精灵不存在" };

    const affectionValues = {
      affectionTreat: 5,
      friendshipBracelet: 100,
    };

    const affectionGain = affectionValues[itemType];
    if (!affectionGain) return { success: false, message: "无效的道具类型" };

    const itemCount = state.res[itemType]?.value || 0;
    if (itemCount < 1) return { success: false, message: "道具数量不足" };

    const currentAffection = typeof mon.affection === "number" ? mon.affection : 0;
    const maxAffection = 100;

    if (currentAffection >= maxAffection) {
      return { success: false, message: "亲密度已达到最大值" };
    }

    state.res[itemType].value = Math.max(0, itemCount - 1);
    
    if (itemType === "friendshipBracelet") {
      mon.affection = maxAffection;
    } else {
      mon.affection = Math.min(maxAffection, currentAffection + affectionGain);
    }

    const itemNames = {
      affectionTreat: "亲密点心",
      friendshipBracelet: "友谊手环",
    };

    addLog(`使用${itemNames[itemType]}：${mon.name} 亲密度 +${affectionGain}`);
    return { success: true, message: `${mon.name} 的亲密度提升了！` };
  }

  // 使用王冠（提升个体值）
  function useBottleCap(monId, itemType, statType) {
    const mon = state.mons.list.find(m => m.id === monId);
    if (!mon) return { success: false, message: "精灵不存在" };

    const itemCount = state.res[itemType]?.value || 0;
    if (itemCount < 1) return { success: false, message: "道具数量不足" };

    // 修复：精灵实例使用 iv 而不是 ivs
    if (!mon.iv || typeof mon.iv !== "object") {
      mon.iv = { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 };
    }

    if (itemType === "goldBottleCap") {
      // 金色王冠：全部个体值提升到31
      mon.iv = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      state.res[itemType].value = Math.max(0, itemCount - 1);
      addLog(`使用金色王冠：${mon.name} 所有个体值提升至31（6V）`);
      return { success: true, message: `${mon.name} 的所有个体值已达到完美！` };
    } else if (itemType === "bottleCap") {
      // 银色王冠：单项个体值提升到31
      if (!statType) return { success: false, message: "请选择要提升的属性" };
      
      const statNames = {
        hp: "HP",
        atk: "攻击",
        def: "防御",
        spa: "特攻",
        spd: "特防",
        spe: "速度",
      };

      if (!statNames[statType]) return { success: false, message: "无效的属性类型" };
      if (mon.iv[statType] >= 31) return { success: false, message: "该属性个体值已达到最大值" };

      mon.iv[statType] = 31;
      state.res[itemType].value = Math.max(0, itemCount - 1);
      addLog(`使用银色王冠：${mon.name} ${statNames[statType]}个体值提升至31`);
      return { success: true, message: `${mon.name} 的${statNames[statType]}个体值已达到完美！` };
    }

    return { success: false, message: "无效的道具类型" };
  }

  // 使用幸运蛋（经验加成）
  function useLuckyEgg(monId) {
    const mon = state.mons.list.find(m => m.id === monId);
    if (!mon) return { success: false, message: "精灵不存在" };

    const itemCount = state.res.luckyEgg?.value || 0;
    if (itemCount < 1) return { success: false, message: "道具数量不足" };

    state.res.luckyEgg.value = Math.max(0, itemCount - 1);

    // 添加1小时的经验加成buff
    if (!mon.buffs) mon.buffs = {};
    const currentTime = Date.now();
    const duration = 3600000; // 1小时
    mon.buffs.luckyEgg = currentTime + duration;

    addLog(`使用幸运蛋：${mon.name} 获得1小时经验加成（1.5倍）`);
    return { success: true, message: `${mon.name} 获得了经验加成效果！` };
  }

  return {
    useExpCandy,
    useAffectionItem,
    useBottleCap,
    useLuckyEgg,
  };
}
