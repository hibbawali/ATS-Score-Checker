// API service for communicating with Django backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Get authentication token from localStorage
  getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  // Set authentication token in localStorage
  setAuthToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  // Remove authentication token
  removeAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Get refresh token
  getRefreshToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  // Set refresh token
  setRefreshToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 - try to refresh token
      if (response.status === 401 && token) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          config.headers.Authorization = `Bearer ${this.getAuthToken()}`;
          return await fetch(url, config);
        } else {
          // Refresh failed, redirect to login
          this.removeAuthToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          throw new Error('Authentication failed');
        }
      }

      return response;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthToken(data.access);
        return true;
      } else {
        this.removeAuthToken();
        return false;
      }
    } catch (error) {
      this.removeAuthToken();
      return false;
    }
  }

  // Authentication endpoints
  async register(userData) {
    const response = await this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        this.setAuthToken(data.access_token);
        this.setRefreshToken(data.refresh_token);
      }
      return data;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
  }

  async login(credentials) {
    const response = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        this.setAuthToken(data.access_token);
        this.setRefreshToken(data.refresh_token);
      }
      return data;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    
    try {
      await this.request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('Logout API call failed:', error);
    }
    
    this.removeAuthToken();
  }

  async getCurrentUser() {
    const response = await this.request('/auth/me/');
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Failed to get current user');
    }
  }

  // Resume endpoints (placeholder for future implementation)
  async uploadResume(formData) {
    // This will be implemented when we integrate with existing resume upload logic
    throw new Error('Resume upload not yet implemented in Django backend');
  }

  async getResumeHistory() {
    const response = await this.request('/resume/history/');
    return response.json();
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

// Export singleton instance
export default new ApiService();