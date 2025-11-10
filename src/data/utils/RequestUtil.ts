/**
 * HTTP请求工具类，使用fetch实现，支持过滤和配置
 */
export class RequestUtil {
  private defaultOptions: RequestInit;
  private filters: Array<(url: string, options: RequestInit) => void> = [];

  constructor(options: RequestInit = {}) {
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
  }

  /**
   * 添加请求过滤器，用于拦截和修改请求
   */
  addFilter(filter: (url: string, options: RequestInit) => void): void {
    this.filters.push(filter);
  }

  /**
   * 执行HTTP请求
   */
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };

    // 应用所有过滤器
    this.filters.forEach(filter => {
      filter(url, mergedOptions);
    });

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }
}