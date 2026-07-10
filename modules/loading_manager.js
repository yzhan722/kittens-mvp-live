// 加载状态管理器

/**
 * 创建加载管理器
 * @returns {Object} 加载管理器
 */
export function createLoadingManager() {
  const loadingStates = new Map();
  const listeners = new Set();

  return {
    /**
     * 开始加载
     * @param {string} key - 加载键
     */
    start(key) {
      loadingStates.set(key, true);
      this.notify();
    },

    /**
     * 结束加载
     * @param {string} key - 加载键
     */
    stop(key) {
      loadingStates.delete(key);
      this.notify();
    },

    /**
     * 检查是否正在加载
     * @param {string} key - 加载键（可选）
     * @returns {boolean} 是否正在加载
     */
    isLoading(key = null) {
      if (key) {
        return loadingStates.has(key);
      }
      return loadingStates.size > 0;
    },

    /**
     * 获取所有加载状态
     * @returns {Array} 加载键数组
     */
    getLoadingKeys() {
      return Array.from(loadingStates.keys());
    },

    /**
     * 订阅状态变化
     * @param {Function} listener - 监听函数
     * @returns {Function} 取消订阅函数
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * 通知所有监听器
     */
    notify() {
      const isLoading = this.isLoading();
      const keys = this.getLoadingKeys();
      listeners.forEach(listener => listener(isLoading, keys));
    },

    /**
     * 包装异步函数，自动管理加载状态
     * @param {string} key - 加载键
     * @param {Function} func - 异步函数
     * @returns {Function} 包装后的函数
     */
    wrap(key, func) {
      return async (...args) => {
        this.start(key);
        try {
          return await func(...args);
        } finally {
          this.stop(key);
        }
      };
    },
  };
}

/**
 * 创建加载指示器
 * @param {Object} options - 配置选项
 * @returns {Object} 加载指示器
 */
export function createLoadingIndicator(options = {}) {
  const {
    container = document.body,
    className = 'loading-indicator',
    text = '加载中...',
  } = options;

  let indicator = null;

  return {
    show() {
      if (indicator) return;

      indicator = document.createElement('div');
      indicator.className = className;
      indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${text}</div>
      `;
      container.appendChild(indicator);
    },

    hide() {
      if (!indicator) return;

      indicator.remove();
      indicator = null;
    },

    isVisible() {
      return indicator !== null;
    },

    setText(newText) {
      if (!indicator) return;

      const textEl = indicator.querySelector('.loading-text');
      if (textEl) {
        textEl.textContent = newText;
      }
    },
  };
}

/**
 * 创建全局加载管理器（单例）
 */
let globalLoadingManager = null;

export function getGlobalLoadingManager() {
  if (!globalLoadingManager) {
    globalLoadingManager = createLoadingManager();
  }
  return globalLoadingManager;
}
