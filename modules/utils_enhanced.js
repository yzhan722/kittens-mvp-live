// 增强的工具函数库

// ========== 性能优化 ==========

/**
 * 防抖函数 - 延迟执行，只执行最后一次
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
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

/**
 * 节流函数 - 限制执行频率
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 请求动画帧节流
 * @param {Function} func - 要执行的函数
 * @returns {Function} 节流后的函数
 */
export function rafThrottle(func) {
  let rafId = null;
  return function executedFunction(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func(...args);
        rafId = null;
      });
    }
  };
}

// ========== 缓存机制 ==========

/**
 * 创建带缓存的函数
 * @param {Function} func - 要缓存的函数
 * @param {Function} keyGenerator - 生成缓存键的函数
 * @returns {Function} 带缓存的函数
 */
export function memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function memoized(...args) {
    const key = keyGenerator(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * 创建带过期时间的缓存
 * @param {number} ttl - 过期时间（毫秒）
 * @returns {Object} 缓存对象
 */
export function createCache(ttl = 60000) {
  const cache = new Map();
  
  return {
    get(key) {
      const item = cache.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    set(key, value) {
      cache.set(key, {
        value,
        expiry: Date.now() + ttl,
      });
    },
    
    has(key) {
      return this.get(key) !== null;
    },
    
    clear() {
      cache.clear();
    },
  };
}

// ========== DOM 操作优化 ==========

/**
 * 批量 DOM 更新
 * @param {Function} callback - 更新函数
 */
export function batchDOMUpdate(callback) {
  requestAnimationFrame(() => {
    callback();
  });
}

/**
 * 创建元素（优化版）
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象
 * @param {Array|string} children - 子元素或文本
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  // 设置属性
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // 添加子元素
  if (typeof children === 'string') {
    element.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

// ========== 数据验证 ==========

/**
 * 验证器工厂
 */
export const validators = {
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isString: (value) => typeof value === 'string',
  isEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isInRange: (min, max) => (value) => value >= min && value <= max,
  isLength: (min, max) => (value) => value.length >= min && value.length <= max,
  isNotEmpty: (value) => value !== null && value !== undefined && value !== '',
};

/**
 * 验证对象
 * @param {Object} data - 要验证的数据
 * @param {Object} schema - 验证规则
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validate(data, schema) {
  const errors = [];
  
  Object.entries(schema).forEach(([key, rules]) => {
    const value = data[key];
    
    rules.forEach(rule => {
      if (typeof rule === 'function') {
        if (!rule(value)) {
          errors.push(`${key} validation failed`);
        }
      } else if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message || `${key} validation failed`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========== 异步操作 ==========

/**
 * 重试函数
 * @param {Function} func - 要重试的异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @returns {Promise} 结果
 */
export async function retry(func, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

/**
 * 超时包装
 * @param {Promise} promise - 要包装的 Promise
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} 结果
 */
export function withTimeout(promise, timeout = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeout)
    ),
  ]);
}

// ========== 数组操作 ==========

/**
 * 数组分块
 * @param {Array} array - 要分块的数组
 * @param {number} size - 块大小
 * @returns {Array} 分块后的数组
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组去重
 * @param {Array} array - 要去重的数组
 * @param {Function} keyFn - 生成唯一键的函数
 * @returns {Array} 去重后的数组
 */
export function uniqueBy(array, keyFn = (item) => item) {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ========== 对象操作 ==========

/**
 * 深度克隆
 * @param {*} obj - 要克隆的对象
 * @returns {*} 克隆后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

/**
 * 深度合并
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
export function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// ========== 错误处理 ==========

/**
 * 安全执行函数
 * @param {Function} func - 要执行的函数
 * @param {*} fallback - 失败时的返回值
 * @returns {*} 结果或 fallback
 */
export function tryCatch(func, fallback = null) {
  try {
    return func();
  } catch (error) {
    console.error('tryCatch error:', error);
    return fallback;
  }
}

/**
 * 异步安全执行
 * @param {Function} func - 要执行的异步函数
 * @param {*} fallback - 失败时的返回值
 * @returns {Promise} 结果或 fallback
 */
export async function tryCatchAsync(func, fallback = null) {
  try {
    return await func();
  } catch (error) {
    console.error('tryCatchAsync error:', error);
    return fallback;
  }
}

// ========== 本地存储优化 ==========

/**
 * 安全的本地存储操作
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },
};
