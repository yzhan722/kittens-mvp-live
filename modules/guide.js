// 新手引导系统
// 通过3步气泡引导新玩家了解核心操作

const GUIDE_KEY = "kittens_mvp_guide_done_v1";

const GUIDE_STEPS = [
  {
    id: "gather",
    title: "第1步：先采集资源",
    desc: "点击右侧「采集」按钮，获取树果。树果是制作一切的基础！",
    targetId: "btnGather",
    position: "right",
  },
  {
    id: "research",
    title: "第2步：解锁精灵球",
    desc: "点击「研究」Tab，找到「精灵球基础」科技并研究它。这是捕捉精灵的前提。",
    targetSelector: ".tab[data-tab='science']",
    position: "bottom",
  },
  {
    id: "capture",
    title: "第3步：制作并使用精灵球",
    desc: "解锁精灵球后，在「捕捉」Tab里制作精灵球，然后遭遇并捕捉你的第一只宝可梦！",
    targetSelector: ".tab[data-tab='capture']",
    position: "bottom",
  },
];

export function initGuideSystem({ getState }) {
  // 已完成引导则不展示
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
    try { localStorage.setItem(GUIDE_KEY, "1"); } catch {}
  }

  function removeHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove("guideHighlight");
      highlightedEl = null;
    }
  }

  function removeBubble() {
    if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; }
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    removeHighlight();
  }

  function getTarget(step) {
    if (step.targetId) return document.getElementById(step.targetId);
    if (step.targetSelector) return document.querySelector(step.targetSelector);
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

    // 高亮目标元素
    if (target) {
      target.classList.add("guideHighlight");
      highlightedEl = target;
    }

    // 创建半透明遮罩（仅阻止遮罩区域点击，目标元素可正常点击）
    overlayEl = document.createElement("div");
    overlayEl.className = "guideOverlay";
    document.body.appendChild(overlayEl);

    // 创建气泡
    bubbleEl = document.createElement("div");
    bubbleEl.className = "guideBubble";
    bubbleEl.innerHTML = `
      <div class="guideBubble__title">${step.title}</div>
      <div class="guideBubble__desc">${step.desc}</div>
      <div class="guideBubble__footer">
        <button class="guideBubble__btn" id="guideBtnSkip">跳过引导</button>
        <button class="guideBubble__btn guideBubble__btn--primary" id="guideBtnNext">${idx < GUIDE_STEPS.length - 1 ? "下一步" : "完成"}</button>
      </div>
    `;
    document.body.appendChild(bubbleEl);

    // 定位气泡（延迟一帧确保DOM已渲染）
    requestAnimationFrame(() => {
      if (!bubbleEl) return;
      positionBubble(bubbleEl, target, step.position);
    });

    bubbleEl.querySelector("#guideBtnNext").addEventListener("click", () => {
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

    let top, left;

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

    // 边界修正
    left = Math.max(margin, Math.min(left, vw - bw - margin));
    top  = Math.max(margin, Math.min(top,  vh - bh - margin));

    bubble.style.top  = `${Math.round(top)}px`;
    bubble.style.left = `${Math.round(left)}px`;
  }

  // 延迟500ms后启动，等待UI渲染完成
  setTimeout(() => showStep(0), 500);
}
