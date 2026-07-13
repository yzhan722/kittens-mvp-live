// 每日任务渲染模块
export function createRenderDailyTasks({ elDailyTasks, fmt, dailyTasks }) {
  let currentTasksState = null;

  function render(tasksState) {
    currentTasksState = tasksState;
    if (!elDailyTasks) return;

    const { tasks, claimed, canClaim, isAllCompleted, signin } = tasksState;

    const completedCount = tasks.filter((t) => t.completed).length;
    const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    let signinHint = "";
    if (signin) {
      const NAME = {
        futurecoin: "未来币",
        catnip: "树果",
        wood: "球果",
        minerals: "碎片",
        pokeball: "精灵球",
        evolutionStone: "进化石",
        rareCandy: "稀有糖果",
        evolutionEnergy: "进化能量",
      };
      const next = signin.nextRewards || {};
      const parts = Object.entries(next)
        .filter(([k]) => k !== "day")
        .map(([k, v]) => `${NAME[k] || k}+${v}`);
      const streak = Number(signin.consecutiveDays) || 0;
      if (signin.canSignin) {
        signinHint = `<div class="daily-tasks-signin muted">领取时附带连续登录第 ${streak + 1} 天奖励${parts.length ? `（${parts.join(" · ")}）` : ""}</div>`;
      } else {
        signinHint = `<div class="daily-tasks-signin muted">今日连续登录奖励已发放 · 连续 ${streak} 天</div>`;
      }
    }

    let html = `
      <div class="daily-tasks-header">
        <div class="daily-tasks-title">每日任务</div>
        <div class="daily-tasks-info">${completedCount}/${tasks.length} 完成</div>
      </div>
      ${signinHint}
      <div class="daily-tasks-track" aria-hidden="true">
        <div class="daily-tasks-track__fill" style="width: ${progressPercent}%"></div>
      </div>
      <div class="list daily-tasks-list">
    `;

    for (const task of tasks) {
      const taskProgress = task.target > 0 ? Math.min(100, (task.current / task.target) * 100) : 0;
      const isDone = task.completed;

      html += `
        <div class="row daily-task-item${isDone ? " is-done" : ""}">
          <div class="row__left">
            <div class="row__title">${task.label}</div>
            <div class="daily-task-track" aria-hidden="true">
              <div class="daily-task-track__fill" style="width: ${taskProgress}%"></div>
            </div>
          </div>
          <div class="row__right">
            <span class="muted">${task.current}/${task.target}</span>
            ${isDone ? '<span class="badge badge--ok">完成</span>' : ""}
          </div>
        </div>
      `;
    }

    html += `
      </div>
      <div class="daily-tasks-footer">
        <button id="dailyTasksClaim" class="btn btn--primary" type="button" ${!canClaim ? "disabled" : ""}>
          ${claimed ? "已领取" : canClaim ? "领取奖励" : isAllCompleted ? "全部完成" : "完成更多任务"}
        </button>
      </div>
    `;

    elDailyTasks.innerHTML = html;

    const claimBtn = elDailyTasks.querySelector("#dailyTasksClaim");
    if (claimBtn) {
      claimBtn.onclick = async () => {
        if (!canClaim) return;
        const res = await dailyTasks.claimRewards();
        if (res.ok) render(dailyTasks.getTasksState());
        else if (res.error === "ALREADY_CLAIMED") alert("已经领取过今天的任务奖励了");
        else if (res.error === "SYNC_FAILED") alert(`领取失败：${res.message || "请检查网络后重试"}`);
        else alert("领取失败");
      };
    }
  }

  function getTasksState() {
    return dailyTasks.getTasksState();
  }

  function refresh() {
    render(getTasksState());
  }

  return { render, refresh, getTasksState };
}
