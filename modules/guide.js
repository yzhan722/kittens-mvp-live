// 新手引导：前 30 分钟核心路径（采集→球→捕捉→看世界→云账号）

const GUIDE_KEY = "kittens_mvp_guide_done_v1";
const HANDOFF_CATCH_KEY = "kittens_mvp_handoff_catch_v1";
const HANDOFF_WORLD_KEY = "kittens_mvp_handoff_world_v1";

const GUIDE_STEPS = [
  {
    id: "gather",
    title: "第1步：先采集树果",
    desc: "点顶栏【采集】换树果。树果是研究与建造的燃料。",
    targetId: "btnGather",
    position: "right",
  },
  {
    id: "research",
    title: "第2步：研究精灵球基础",
    desc: "打开「研究」，点「精灵球基础」（便宜又快）。完成后送 5 个球。",
    targetSelector: ".tab[data-tab='science']",
    position: "bottom",
  },
  {
    id: "capture",
    title: "第3步：去捕捉第一只",
    desc: "打开「捕捉」，有球就能抓。先抓一只，队伍与图鉴会亮起来。",
    targetSelector: ".tab[data-tab='capture']",
    position: "bottom",
  },
  {
    id: "world",
    title: "第4步：看一眼排行榜",
    desc: "「更多」→「排行榜」：有 NPC 训练家垫榜，感受世界在动。",
    targetSelector: ".tab[data-tab='leaderboard'], .tab--more",
    position: "bottom",
  },
  {
    id: "cloud",
    title: "第5步：可选云账号",
    desc: "「设置」注册云账号：换设备不丢档，还能加好友约战。现在不做也能继续玩。",
    targetSelector: ".tab[data-tab='options'], .tab--more",
    position: "bottom",
  },
];

export function initGuideSystem({ getState, activateTab, addLog } = {}) {
  try {
    if (localStorage.getItem(GUIDE_KEY) === "1") return;
  } catch {
    return;
  }

  let currentStep = 0;
  let bubbleEl = null;
  let overlayEl = null;
  let highlightedEl = null;

  function markDone() {
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {}
  }

  function removeHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove("guideHighlight");
      highlightedEl = null;
    }
  }

  function removeBubble() {
    if (bubbleEl) {
      bubbleEl.remove();
      bubbleEl = null;
    }
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    removeHighlight();
  }

  function getTarget(step) {
    if (step.targetId) return document.getElementById(step.targetId);
    if (step.targetSelector) {
      const parts = String(step.targetSelector)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sel of parts) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      }
      return document.querySelector(parts[0] || step.targetSelector);
    }
    return null;
  }

  function showStep(idx) {
    removeBubble();
    if (idx >= GUIDE_STEPS.length) {
      markDone();
      return;
    }

    const step = GUIDE_STEPS[idx];
    const target = getTarget(step);

    if (target) {
      target.classList.add("guideHighlight");
      highlightedEl = target;
    }

    overlayEl = document.createElement("div");
    overlayEl.className = "guideOverlay";
    document.body.appendChild(overlayEl);

    bubbleEl = document.createElement("div");
    bubbleEl.className = "guideBubble";
    bubbleEl.innerHTML = `
      <div class="guideBubble__title">${step.title}</div>
      <div class="guideBubble__desc">${step.desc}</div>
      <div class="guideBubble__footer">
        <button class="guideBubble__btn" id="guideBtnSkip" type="button">跳过引导</button>
        <button class="guideBubble__btn guideBubble__btn--primary" id="guideBtnNext" type="button">${
          idx < GUIDE_STEPS.length - 1 ? "下一步" : "完成"
        }</button>
      </div>
    `;
    document.body.appendChild(bubbleEl);

    requestAnimationFrame(() => {
      if (!bubbleEl) return;
      positionBubble(bubbleEl, target, step.position);
    });

    bubbleEl.querySelector("#guideBtnNext").addEventListener("click", () => {
      if (typeof activateTab === "function") {
        if (step.id === "research") activateTab("science");
        else if (step.id === "capture") activateTab("capture");
        else if (step.id === "world") activateTab("leaderboard");
        else if (step.id === "cloud") activateTab("options");
      }
      currentStep += 1;
      showStep(currentStep);
    });
    bubbleEl.querySelector("#guideBtnSkip").addEventListener("click", () => {
      removeBubble();
      markDone();
    });
  }

  function positionBubble(bubble, target, position) {
    const margin = 12;
    const bw = bubble.offsetWidth || 280;
    const bh = bubble.offsetHeight || 120;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top;
    let left;

    if (target) {
      const r = target.getBoundingClientRect();
      if (position === "bottom") {
        top = r.bottom + margin;
        left = r.left + r.width / 2 - bw / 2;
      } else if (position === "right") {
        top = r.top + r.height / 2 - bh / 2;
        left = r.right + margin;
      } else if (position === "top") {
        top = r.top - bh - margin;
        left = r.left + r.width / 2 - bw / 2;
      } else {
        top = r.bottom + margin;
        left = r.left;
      }
    } else {
      top = vh / 2 - bh / 2;
      left = vw / 2 - bw / 2;
    }

    left = Math.max(margin, Math.min(left, vw - bw - margin));
    top = Math.max(margin, Math.min(top, vh - bh - margin));

    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.left = `${Math.round(left)}px`;
  }

  setTimeout(() => showStep(0), 500);
}

/** One-shot soft handoffs for the first 30 minutes. */
export function maybeNewbieHandoff({ state, activateTab, addLog, pushTickerEvent, hint } = {}) {
  if (!state || typeof state !== "object") return;

  try {
    // After starter balls: nudge capture once
    if (state.meta?.starterBallsGranted && localStorage.getItem(HANDOFF_CATCH_KEY) !== "1") {
      const balls = Math.floor(state.res?.pokeball?.value || 0);
      if (balls >= 1 && (state.catchCount || 0) === 0) {
        localStorage.setItem(HANDOFF_CATCH_KEY, "1");
        if (typeof addLog === "function") addLog("新手提示：球已到手 → 打开「捕捉」抓第一只。", true);
        if (typeof hint === "function") hint("去「捕捉」抓第一只精灵！", 4000);
        try {
          if (typeof window.showToast === "function") window.showToast("球已到手 → 去捕捉", "ok", 4000);
        } catch {}
        if (typeof pushTickerEvent === "function") pushTickerEvent("guide", "新手：球已到手，去捕捉");
        if (typeof activateTab === "function") {
          setTimeout(() => {
            try {
              activateTab("capture");
            } catch {}
          }, 600);
        }
      }
    }

    // After first catch: peek world once
    if ((state.catchCount || 0) >= 1 && localStorage.getItem(HANDOFF_WORLD_KEY) !== "1") {
      localStorage.setItem(HANDOFF_WORLD_KEY, "1");
      if (typeof addLog === "function") {
        addLog("新手提示：第一只到手！去「排行榜」看 NPC，或「设置」注册云账号加好友。", true);
      }
      if (typeof hint === "function") hint("去排行榜看看世界，或设置里开云账号", 5000);
      try {
        if (typeof window.showToast === "function") window.showToast("第一只到手 → 去排行榜", "ok", 4500);
      } catch {}
      if (typeof pushTickerEvent === "function") pushTickerEvent("guide", "新手：第一只到手，去看排行榜");
      if (typeof activateTab === "function") {
        setTimeout(() => {
          try {
            activateTab("leaderboard");
          } catch {}
        }, 900);
      }
    }
  } catch {
    // ignore storage / UI failures
  }
}
