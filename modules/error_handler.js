// 统一错误处理中心

/**
 * 错误类型
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * 自定义错误类
 */
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.timestamp = Date.now();
  }
}

/**
 * 创建错误处理器
 * @param {Object} options - 配置选项
 * @returns {Object} 错误处理器
 */
export function createErrorHandler(options = {}) {
  const {
    onError = null,
    showToast = true,
    logErrors = true,
  } = options;

  const errorLog = [];

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  function handle(error, context = {}) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      type: error.type || ErrorTypes.UNKNOWN,
      details: error.details || {},
      context,
      timestamp: Date.now(),
      stack: error.stack,
    };

    // 记录错误
    if (logErrors) {
      console.error('[ErrorHandler]', errorInfo);
      errorLog.push(errorInfo);
      
      // 限制日志大小
      if (errorLog.length > 100) {
        errorLog.shift();
      }
    }

    // 显示用户友好的错误提示
    if (showToast) {
      showErrorToast(errorInfo);
    }

    // 调用自定义错误处理函数
    if (onError) {
      onError(errorInfo);
    }

    return errorInfo;
  }

  /**
   * 显示错误提示
   * @param {Object} errorInfo - 错误信息
   */
  function showErrorToast(errorInfo) {
    const message = getUserFriendlyMessage(errorInfo);
    
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 获取用户友好的错误消息
   * @param {Object} errorInfo - 错误信息
   * @returns {string} 用户友好的消息
   */
  function getUserFriendlyMessage(errorInfo) {
    const { type, message } = errorInfo;

    const messages = {
      [ErrorTypes.NETWORK]: '网络连接失败，请检查网络设置',
      [ErrorTypes.VALIDATION]: '输入数据有误，请检查后重试',
      [ErrorTypes.AUTH]: '登录已过期，请重新登录',
      [ErrorTypes.NOT_FOUND]: '请求的资源不存在',
      [ErrorTypes.SERVER]: '服务器错误，请稍后重试',
      [ErrorTypes.UNKNOWN]: '发生未知错误，请稍后重试',
    };

    return messages[type] || message || messages[ErrorTypes.UNKNOWN];
  }

  /**
   * 包装异步函数，自动处理错误
   * @param {Function} func - 异步函数
   * @param {Object} context - 上下文信息
   * @returns {Function} 包装后的函数
   */
  function wrap(func, context = {}) {
    return async (...args) => {
      try {
        return await func(...args);
      } catch (error) {
        handle(error, { ...context, args });
        throw error;
      }
    };
  }

  /**
   * 获取错误日志
   * @param {number} limit - 限制数量
   * @returns {Array} 错误日志
   */
  function getErrorLog(limit = 50) {
    return errorLog.slice(-limit);
  }

  /**
   * 清除错误日志
   */
  function clearErrorLog() {
    errorLog.length = 0;
  }

  return {
    handle,
    wrap,
    getErrorLog,
    clearErrorLog,
    ErrorTypes,
    AppError,
  };
}

/**
 * 全局错误处理器（单例）
 */
let globalErrorHandler = null;

export function getGlobalErrorHandler() {
  if (!globalErrorHandler) {
    globalErrorHandler = createErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * 设置全局错误监听
 */
export function setupGlobalErrorHandling() {
  const handler = getGlobalErrorHandler();

  // 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    handler.handle(new AppError(
      event.reason?.message || 'Unhandled promise rejection',
      ErrorTypes.UNKNOWN,
      { reason: event.reason }
    ));
  });

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    handler.handle(new AppError(
      event.message || 'Global error',
      ErrorTypes.UNKNOWN,
      { 
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    ));
  });
}
