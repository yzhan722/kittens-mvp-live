// 统一的 API 客户端

import { retry, withTimeout } from './utils_enhanced.js';

/**
 * 创建 API 客户端
 * @param {Object} config - 配置对象
 * @returns {Object} API 客户端
 */
export function createApiClient(config = {}) {
  const {
    baseUrl = '',
    timeout = 10000,
    maxRetries = 3,
    headers = {},
  } = config;

  /**
   * 发送请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise} 响应数据
   */
  async function request(url, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers: customHeaders = {},
      retry: shouldRetry = false,
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...customHeaders,
      },
    };

    if (body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const fetchFn = async () => {
      const response = await fetch(fullUrl, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    };

    try {
      const promise = shouldRetry ? retry(fetchFn, maxRetries) : fetchFn();
      return await withTimeout(promise, timeout);
    } catch (error) {
      console.error(`API request failed: ${method} ${fullUrl}`, error);
      throw error;
    }
  }

  return {
    get(url, options = {}) {
      return request(url, { ...options, method: 'GET' });
    },

    post(url, body, options = {}) {
      return request(url, { ...options, method: 'POST', body });
    },

    put(url, body, options = {}) {
      return request(url, { ...options, method: 'PUT', body });
    },

    delete(url, options = {}) {
      return request(url, { ...options, method: 'DELETE' });
    },

    request,
  };
}

/**
 * 创建带缓存的 API 客户端
 * @param {Object} config - 配置对象
 * @returns {Object} API 客户端
 */
export function createCachedApiClient(config = {}) {
  const client = createApiClient(config);
  const cache = new Map();
  const { cacheTTL = 60000 } = config;

  function getCacheKey(url, options) {
    return `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
  }

  function isCacheValid(entry) {
    return Date.now() - entry.timestamp < cacheTTL;
  }

  return {
    ...client,

    async get(url, options = {}) {
      const cacheKey = getCacheKey(url, { ...options, method: 'GET' });
      const cached = cache.get(cacheKey);

      if (cached && isCacheValid(cached)) {
        return cached.data;
      }

      const data = await client.get(url, options);
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    },

    clearCache() {
      cache.clear();
    },

    removeCacheEntry(url, options = {}) {
      const cacheKey = getCacheKey(url, options);
      cache.delete(cacheKey);
    },
  };
}

/**
 * 请求拦截器
 */
export class RequestInterceptor {
  constructor() {
    this.interceptors = [];
  }

  use(interceptor) {
    this.interceptors.push(interceptor);
  }

  async execute(config) {
    let result = config;
    for (const interceptor of this.interceptors) {
      result = await interceptor(result);
    }
    return result;
  }
}

/**
 * 响应拦截器
 */
export class ResponseInterceptor {
  constructor() {
    this.interceptors = [];
  }

  use(interceptor) {
    this.interceptors.push(interceptor);
  }

  async execute(response) {
    let result = response;
    for (const interceptor of this.interceptors) {
      result = await interceptor(result);
    }
    return result;
  }
}
