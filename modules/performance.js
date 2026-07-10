// 性能监控和优化工具

// devMode 开关：localStorage.setItem('devMode', 'true') 开启性能日志
const isDevMode = () => {
  try { return localStorage.getItem('devMode') === 'true'; } catch { return false; }
};

// 防抖函数
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 请求动画帧节流
export function rafThrottle(func) {
  let rafId = null;
  return function executedFunction(...args) {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
}

// 性能计时器
export function createPerformanceTimer() {
  const timings = new Map();

  return {
    start(label) {
      timings.set(label, performance.now());
    },

    end(label) {
      const start = timings.get(label);
      if (start === undefined) return 0;
      const duration = performance.now() - start;
      timings.delete(label);
      return duration;
    },

    measure(label, func) {
      this.start(label);
      const result = func();
      const duration = this.end(label);
      if (isDevMode()) console.debug(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      return result;
    },

    async measureAsync(label, func) {
      this.start(label);
      const result = await func();
      const duration = this.end(label);
      if (isDevMode()) console.debug(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      return result;
    },
  };
}

// 批量 DOM 更新
export function batchDOMUpdates(updates) {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

// 内存优化：对象池
export function createObjectPool(factory, reset, initialSize = 10) {
  const pool = [];
  
  // 预创建对象
  for (let i = 0; i < initialSize; i++) {
    pool.push(factory());
  }

  return {
    acquire() {
      return pool.length > 0 ? pool.pop() : factory();
    },

    release(obj) {
      reset(obj);
      pool.push(obj);
    },

    clear() {
      pool.length = 0;
    },

    get size() {
      return pool.length;
    },
  };
}

// 渲染调度器
export function createRenderScheduler() {
  let pendingRenders = new Set();
  let rafId = null;

  function flush() {
    const renders = Array.from(pendingRenders);
    pendingRenders.clear();
    rafId = null;

    renders.forEach((render) => {
      try {
        render();
      } catch (e) {
        console.error('Render error:', e);
      }
    });
  }

  return {
    schedule(renderFunc) {
      pendingRenders.add(renderFunc);
      
      if (rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    },

    cancel(renderFunc) {
      pendingRenders.delete(renderFunc);
    },

    flush() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        flush();
      }
    },
  };
}
