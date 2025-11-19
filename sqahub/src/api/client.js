// Cliente API para comunicação com o backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8547';

class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.token = this.getToken();
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
      this.token = token;
    } else {
      localStorage.removeItem('auth_token');
      this.token = null;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      // Tentar fazer parse do JSON, mas tratar caso a resposta esteja vazia
      let data = null;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse JSON:', text);
            throw {
              status: response.status,
              message: 'Invalid JSON response from server',
              data: null,
            };
          }
        }
      }

      if (!response.ok) {
        throw {
          status: response.status,
          message: data?.error || data?.message || `Request failed with status ${response.status}`,
          data,
        };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error',
        data: null,
      };
    }
  }

  // Auth methods
  auth = {
    login: async (email, password) => {
      const data = await this.request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    },

    register: async (email, password, name) => {
      const data = await this.request('/api/auth/register', {
        method: 'POST',
        body: { email, password, name },
      });
      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    },

    me: async () => {
      const data = await this.request('/api/auth/me');
      return data.user;
    },

    logout: () => {
      this.setToken(null);
    },
  };

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  // PUT request
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  // PATCH request
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
