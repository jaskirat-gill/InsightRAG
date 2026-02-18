const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
}

class AuthService {
  private readonly API_URL = API_URL;

  // Store tokens in localStorage
  private setTokens(tokens: TokenResponse) {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Login
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await fetch(`${this.API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const tokens: TokenResponse = await response.json();
    this.setTokens(tokens);
    return tokens;
  }

  // Register
  async register(data: RegisterRequest): Promise<{ message: string }> {
    const response = await fetch(`${this.API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return await response.json();
  }

  // Get current user
  async getCurrentUser(): Promise<UserResponse> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${this.API_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshAccessToken();
        // Retry with new token
        return this.getCurrentUser();
      }
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  // Refresh token
  async refreshAccessToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await fetch(`${this.API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Session expired. Please login again.');
    }

    const tokens: TokenResponse = await response.json();
    this.setTokens(tokens);
  }

  // Logout
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${this.API_URL}/api/v1/auth/logout?refresh_token=${refreshToken}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.clearTokens();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Get auth header for API requests
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authService = new AuthService();