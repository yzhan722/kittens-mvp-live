// 每日任务渲染模块
export function createRenderDailyTasks({ elDailyTasks, ui, fmt }) {
  let currentTasksState = null;

  function render(tasksState) {
    currentTasksState = tasksState;
    if (!elDailyTasks) return;

    const { tasks, claimed, canClaim, isAllCompleted } = tasksState;

    // 进度条
    const completedCount = tasks.filter((t) => t.completed).length;
    const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    let html = `
      <div class="daily-tasks-header">
        <div class="daily-tasks-title">
          <span>每日任务</span>
        </div>
        <div class="daily-tasks-progress">
          <div class="daily-tasks-progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        <div class="daily-tasks-info">${completedCount}/${tasks.length} 完成</div>
      </div>
      <div class="daily-tasks-list">
    `;

    for (const task of tasks) {
      const taskProgress = task.target > 0 ? (task.current / task.target) * 100 : 0;
      const isDone = task.completed;

      html += `
        <div class="daily-task-item ${isDone ? "completed" : ""}">
          <div class="daily-task-icon">[${task.icon || "task"}]</div>
          <div class="daily-task-content">
            <div class="daily-task-label">${task.label}</div>
            <div class="daily-task-progress">
              <div class="daily-task-progress-bar" style="width: ${taskProgress}%"></div>
              <span class="daily-task-count">${task.current}/${task.target}</span>
            </div>
          </div>
          <div class="daily-task-status">
            ${isDone ? '<span class="badge badge--green">OK</span>' : ""}
          </div>
        </div>
      `;
    }

    html += `
      </div>
      <div class="daily-tasks-footer">
        <button id="dailyTasksClaim" class="btn btn--full ${canClaim ? "btn--green" : "btn--disabled"}" ${!canClaim ? "disabled" : ""}>
          ${claimed ? "已领取" : canClaim ? "领取奖励" : isAllCompleted ? "全部完成" : "完成更多任务"}
        </button>
      </div>
    `;

    elDailyTasks.innerHTML = html;

    // 绑定领取按钮事件
    const claimBtn = elDailyTasks.querySelector("#dailyTasksClaim");
    if (claimBtn) {
      claimBtn.onclick = async () => {
        if (!canClaim) return;
        try {
          const res = await ui.fetch("/api/daily_tasks/claim", { method: "POST" });
          if (res.ok) {
            render(await getTasksState());
          } else if (res.error === "ALREADY_CLAIMED") {
            alert("已经领取过今天的任务奖励了");
          } else {
            alert("领取失败");
          }
        } catch (e) {
          console.error(e);
          alert("领取失败：" + e.message);
        }
      };
    }
  }

  // 获取任务状态（调用 API）
  async function getTasksState() {
    try {
      const res = await ui.fetch("/api/daily_tasks", { method: "GET" });
      return res;
    } catch (e) {
      console.error("Failed to load tasks:", e);
      return null;
    }
  }

  // 刷新任务状态
  async function refresh() {
    const state = await getTasksState();
    if (state) render(state);
  }

  return { render, refresh, getTasksState };
}
