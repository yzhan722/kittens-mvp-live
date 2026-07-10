// 状态管理辅助工具
// 提供统一的状态更新和 dirty flag 管理

export function createStateManager() {
  const dirtyFlags = new Set();
  const listeners = new Map();

  return {
    // 标记为脏
    markDirty(flag, resetPage = false) {
      dirtyFlags.add(flag);
      
      // 特殊处理：重置分页
      if (resetPage) {
        if (flag === 'dex') this.resetDexPage();
        if (flag === 'mons') this.resetMonPage();
      }
      
      // 触发监听器
      const callback = listeners.get(flag);
      if (callback) callback();
    },

    // 检查是否脏
    isDirty(flag) {
      return dirtyFlags.has(flag);
    },

    // 清除脏标记
    clearDirty(flag) {
      dirtyFlags.delete(flag);
    },

    // 清除所有脏标记
    clearAllDirty() {
      dirtyFlags.clear();
    },

    // 注册监听器
    onDirty(flag, callback) {
      listeners.set(flag, callback);
    },

    // 批量标记
    markMultiple(flags) {
      flags.forEach(flag => this.markDirty(flag));
    },

    // 便捷方法
    resetDexPage() {
      // 由外部 UI 对象提供
    },

    resetMonPage() {
      // 由外部 UI 对象提供
    },
  };
}

// Dirty flag 常量
export const DIRTY_FLAGS = {
  DEX: 'dex',
  CAPTURE: 'capture',
  MONS: 'mons',
  FUNCTIONS: 'functions',
  LEADERBOARD: 'leaderboard',
  FUTURE: 'future',
  HELP: 'help',
  OVERLAYS: 'overlays',
  SERVER_BUFFS: 'serverBuffs',
};
