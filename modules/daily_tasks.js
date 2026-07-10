// 每日任务系统
export function createDailyTasks({ state, addRes, addLog }) {
  const TASKS_KEY = "kittens_mvp_daily_tasks_v1";

  // 任务类型定义
  const TASK_TYPES = {
    // 资源收集
    gatherCatnip: { id: "gatherCatnip", label: "采集猫薄荷", target: 100, reward: { catnip: 50 }, icon: "catnip" },
    gatherWood: { id: "gatherWood", label: "收集木材", target: 20, reward: { wood: 20 }, icon: "wood" },
    gatherMinerals: { id: "gatherMinerals", label: "挖掘矿物", target: 10, reward: { minerals: 15 }, icon: "gem" },
    
    // 精灵相关
    catchPokemon: { id: "catchPokemon", label: "捕捉精灵", target: 3, reward: { pokeball: 5 }, icon: "catch" },
    evolvePokemon: { id: "evolvePokemon", label: "进化精灵", target: 1, reward: { evolutionStone: 2 }, icon: "evo" },
    starPokemon: { id: "starPokemon", label: "精灵升星", target: 1, reward: { rareCandy: 1 }, icon: "star" },
    
    // 建造相关
    buildField: { id: "buildField", label: "建造农田", target: 1, reward: { catnip: 100 }, icon: "field" },
    buildHut: { id: "buildHut", label: "建造小屋", target: 1, reward: { wood: 50 }, icon: "hut" },
    
    // 战斗相关
    pveWin: { id: "pveWin", label: "PvE 获胜", target: 2, reward: { futurecoin: 10 }, icon: "sword" },
    pveAttempts: { id: "pveAttempts", label: "PvE 挑战", target: 5, reward: { futurecoin: 5 }, icon: "target" },
    
    // 制作相关
    craftPokeball: { id: "craftPokeball", label: "制作精灵球", target: 3, reward: { pokeball: 3 }, icon: "ball" },
    craftBerry: { id: "craftBerry", label: "制作大berries", target: 5, reward: { bigBerry: 5 }, icon: "berry" },
    
    // 科研相关
    research: { id: "research", label: "完成研究", target: 1, reward: { futurecoin: 15 }, icon: "lab" },
    
    // 通用
    clickGather: { id: "clickGather", label: "手动采集", target: 20, reward: { catnip: 30 }, icon: "hand" },
    login: { id: "login", label: "每日登录", target: 1, reward: { futurecoin: 5 }, icon: "cal" },
  };

  // 每日任务池（随机抽取）
  const DAILY_POOL = [
    "gatherCatnip", "gatherWood", "gatherMinerals",
    "catchPokemon", "evolvePokemon", "starPokemon",
    "buildField", "buildHut",
    "pveWin", "pveAttempts",
    "craftPokeball", "craftBerry",
    "research", "clickGather", "login"
  ];

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function ensureTasksState() {
    if (!state.dailyTasks || typeof state.dailyTasks !== "object") {
      state.dailyTasks = {
        lastResetDate: "",
        tasks: [],
        claimed: false,
      };
    }
  }

  // 生成每日任务
  function generateDailyTasks() {
    const today = getTodayStr();
    ensureTasksState();

    if (state.dailyTasks.lastResetDate === today && state.dailyTasks.tasks.length > 0) {
      return; // 今天的任务已生成
    }

    // 随机抽取 5 个任务
    const shuffled = [...DAILY_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    state.dailyTasks.tasks = selected.map((typeId) => {
      const def = TASK_TYPES[typeId];
      return {
        id: `${today}_${typeId}`,
        type: typeId,
        current: 0,
        target: def.target,
        completed: false,
      };
    });

    state.dailyTasks.lastResetDate = today;
    state.dailyTasks.claimed = false;
  }

  // 更新任务进度
  function updateTaskProgress(typeId, amount = 1) {
    ensureTasksState();
    generateDailyTasks(); // 确保任务已生成
    const today = getTodayStr();
    if (state.dailyTasks.lastResetDate !== today) return; // 旧任务不更新

    const task = state.dailyTasks.tasks.find((t) => t.type === typeId);
    if (task && !task.completed) {
      task.current = Math.min(task.current + amount, task.target);
      if (task.current >= task.target) {
        task.completed = true;
      }
    }
  }

  // 检查是否可以领取
  function canClaim() {
    ensureTasksState();
    generateDailyTasks();
    return !state.dailyTasks.claimed && state.dailyTasks.tasks.some((t) => t.completed);
  }

  // 检查是否全部完成
  function isAllCompleted() {
    ensureTasksState();
    return state.dailyTasks.tasks.length > 0 && state.dailyTasks.tasks.every((t) => t.completed);
  }

  // 领取奖励
  function claimRewards() {
    ensureTasksState();
    generateDailyTasks();

    if (state.dailyTasks.claimed) {
      return { ok: false, error: "ALREADY_CLAIMED" };
    }

    const completedTasks = state.dailyTasks.tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      return { ok: false, error: "NO_COMPLETED_TASKS" };
    }

    // 发放奖励
    let totalFuturecoin = 0;
    for (const task of completedTasks) {
      const def = TASK_TYPES[task.type];
      if (def.reward) {
        if (def.reward.futurecoin) {
          totalFuturecoin += def.reward.futurecoin;
        }
        if (def.reward.catnip) {
          addRes("catnip", def.reward.catnip);
        }
        if (def.reward.wood) {
          addRes("wood", def.reward.wood);
        }
        if (def.reward.minerals) {
          addRes("minerals", def.reward.minerals);
        }
        if (def.reward.pokeball) {
          addRes("pokeball", def.reward.pokeball);
        }
        if (def.reward.evolutionStone) {
          addRes("evolutionStone", def.reward.evolutionStone);
        }
        if (def.reward.rareCandy) {
          addRes("rareCandy", def.reward.rareCandy);
        }
        if (def.reward.bigBerry) {
          addRes("bigBerry", def.reward.bigBerry);
        }
      }
    }

    if (totalFuturecoin > 0) {
      addRes("futurecoin", totalFuturecoin);
    }

    state.dailyTasks.claimed = true;
    addLog(`每日任务奖励: 未来币 +${totalFuturecoin}`);

    return { ok: true, futurecoin: totalFuturecoin };
  }

  // 获取任务状态（用于 UI）
  function getTasksState() {
    ensureTasksState();
    generateDailyTasks();

    return {
      lastResetDate: state.dailyTasks.lastResetDate,
      tasks: state.dailyTasks.tasks.map((t) => {
        const def = TASK_TYPES[t.type];
        return {
          id: t.id,
          type: t.type,
          label: def?.label || t.type,
          icon: def?.icon || "task",
          current: t.current,
          target: t.target,
          completed: t.completed,
          reward: def?.reward || {},
        };
      }),
      claimed: state.dailyTasks.claimed,
      canClaim: canClaim(),
      isAllCompleted: isAllCompleted(),
    };
  }

  // 外部调用：触发任务进度更新
  function onEvent(eventType, data = {}) {
    switch (eventType) {
      case "gather":
        if (data.resource === "catnip") updateTaskProgress("gatherCatnip", data.amount || 1);
        if (data.resource === "wood") updateTaskProgress("gatherWood", data.amount || 1);
        if (data.resource === "minerals") updateTaskProgress("gatherMinerals", data.amount || 1);
        break;
      case "catch":
        updateTaskProgress("catchPokemon");
        break;
      case "evolve":
        updateTaskProgress("evolvePokemon");
        break;
      case "star":
        updateTaskProgress("starPokemon");
        break;
      case "build":
        if (data.building === "field") updateTaskProgress("buildField");
        if (data.building === "hut") updateTaskProgress("buildHut");
        break;
      case "pveWin":
        updateTaskProgress("pveWin");
        break;
      case "pveAttempt":
        updateTaskProgress("pveAttempts");
        break;
      case "craft":
        if (data.item === "pokeball") updateTaskProgress("craftPokeball");
        if (data.item === "bigBerry") updateTaskProgress("craftBerry");
        break;
      case "research":
        updateTaskProgress("research");
        break;
      case "clickGather":
        updateTaskProgress("clickGather");
        break;
      case "login":
        updateTaskProgress("login");
        break;
    }
  }

  return {
    ensureTasksState,
    generateDailyTasks,
    updateTaskProgress,
    canClaim,
    isAllCompleted,
    claimRewards,
    getTasksState,
    onEvent,
    TASK_TYPES,
  };
}
