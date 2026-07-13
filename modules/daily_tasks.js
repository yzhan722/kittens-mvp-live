// 每日任务系统
export function createDailyTasks({ state, addRes, addLog, dailySignin, apiFetch, hasAuth }) {
  const TASKS_KEY = "kittens_mvp_daily_tasks_v1";

  // 任务类型定义（仅保留已接线进度事件）
  const TASK_TYPES = {
    gatherCatnip: { id: "gatherCatnip", label: "采集树果", target: 100, reward: { catnip: 50 }, icon: "catnip" },
    catchPokemon: { id: "catchPokemon", label: "捕捉精灵", target: 3, reward: { pokeball: 5 }, icon: "catch" },
    evolvePokemon: { id: "evolvePokemon", label: "进化精灵", target: 1, reward: { evolutionStone: 2 }, icon: "evo" },
    pveWin: { id: "pveWin", label: "PvE 获胜", target: 2, reward: { futurecoin: 10 }, icon: "sword" },
    pveAttempts: { id: "pveAttempts", label: "PvE 挑战", target: 5, reward: { futurecoin: 5 }, icon: "target" },
    craftPokeball: { id: "craftPokeball", label: "制作精灵球", target: 3, reward: { pokeball: 3 }, icon: "ball" },
    craftBerry: { id: "craftBerry", label: "制作大树果", target: 5, reward: { bigBerry: 5 }, icon: "berry" },
    clickGather: { id: "clickGather", label: "手动采集", target: 20, reward: { catnip: 30 }, icon: "hand" },
    login: { id: "login", label: "每日登录", target: 1, reward: { futurecoin: 5 }, icon: "cal" },
  };

  const DAILY_POOL = [
    "gatherCatnip",
    "catchPokemon", "evolvePokemon",
    "pveWin", "pveAttempts",
    "craftPokeball", "craftBerry",
    "clickGather", "login"
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

  function taskPayload() {
    return state.dailyTasks.tasks.map((t) => ({
      type: t.type,
      current: t.current,
      target: t.target,
      completed: t.completed,
    }));
  }

  // ponytail: logged-in claim is server-gated once/day; task progress stays local until claim POST
  async function syncFromServer() {
    if (typeof apiFetch !== "function" || (typeof hasAuth === "function" && !hasAuth())) {
      return { ok: false, skipped: true };
    }
    ensureTasksState();
    generateDailyTasks();
    const today = getTodayStr();
    try {
      const data = await apiFetch(`/api/daily_tasks?date=${encodeURIComponent(today)}`);
      if (data?.date === today && data.claimed) {
        state.dailyTasks.claimed = true;
      }
      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }

  // 领取奖励
  async function claimRewards() {
    ensureTasksState();
    generateDailyTasks();

    if (state.dailyTasks.claimed) {
      return { ok: false, error: "ALREADY_CLAIMED" };
    }

    const completedTasks = state.dailyTasks.tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      return { ok: false, error: "NO_COMPLETED_TASKS" };
    }

    if (typeof apiFetch === "function" && (!hasAuth || hasAuth())) {
      try {
        await apiFetch("/api/daily_tasks/claim", {
          method: "POST",
          body: { date: getTodayStr(), tasks: taskPayload() },
        });
      } catch (e) {
        const code = e?.data?.error || e?.message || "";
        if (code === "ALREADY_CLAIMED") {
          state.dailyTasks.claimed = true;
          return { ok: false, error: "ALREADY_CLAIMED" };
        }
        return { ok: false, error: "SYNC_FAILED", message: String(code || "claim failed") };
      }
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

    // 连续登录奖励并入领取，去掉商店里重复的「每日签到」入口
    if (dailySignin && typeof dailySignin.canSignin === "function" && dailySignin.canSignin()) {
      dailySignin.signin();
    }

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
      signin: dailySignin && typeof dailySignin.getSigninInfo === "function" ? dailySignin.getSigninInfo() : null,
    };
  }

  // 外部调用：触发任务进度更新
  function onEvent(eventType, data = {}) {
    switch (eventType) {
      case "gather":
        if (data.resource === "catnip") updateTaskProgress("gatherCatnip", data.amount || 1);
        break;
      case "catch":
        updateTaskProgress("catchPokemon");
        break;
      case "evolve":
        updateTaskProgress("evolvePokemon");
        break;
      case "pveWin":
        updateTaskProgress("pveWin");
        break;
      case "pveAttempt":
        updateTaskProgress("pveAttempts");
        break;
      case "craft":
        if (data.item === "pokeball") updateTaskProgress("craftPokeball", data.amount || 1);
        if (data.item === "bigBerry") updateTaskProgress("craftBerry", data.amount || 1);
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
    syncFromServer,
    getTasksState,
    onEvent,
    TASK_TYPES,
  };
}
