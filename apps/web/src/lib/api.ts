import type {
  AdminDashboard,
  AuthResponse,
  LeaderDashboard,
  LoginRequest,
  RegisterRequest,
  UserPublic,
} from '@platform/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || 'Erro na requisição') as Error & {
        errors?: Record<string, string>;
        status?: number;
      };
      error.errors = data.errors;
      error.status = response.status;
      throw error;
    }

    return data as T;
  }

  login(body: LoginRequest) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  register(body: RegisterRequest) {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  me() {
    return this.request<UserPublic>('/auth/me');
  }

  getAdminDashboard() {
    return this.request<AdminDashboard>('/admin/dashboard');
  }

  getLeaderDashboard() {
    return this.request<LeaderDashboard>('/leader/dashboard');
  }

  getLeaderBySlug(slug: string) {
    return this.request<{
      id: string;
      firstName: string;
      lastName: string;
      leaderSlug: string;
    }>(`/leader/${slug}`);
  }
}

export const api = new ApiClient();
