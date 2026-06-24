import type {
  AdminDashboard,
  AuthResponse,
  CoordinatorDashboard,
  CoordinatorLeaderItem,
  CoordinatorLeadersQuery,
  CreateEventRequest,
  CreateLeaderRequest,
  CreateLiveRequest,
  CreatePostRequest,
  CreateSupporterRequest,
  EventPublic,
  LeaderDashboard,
  LeaderSupportersQuery,
  LivePublic,
  LoginRequest,
  NotificationPublic,
  PaginatedResponse,
  PostCategory,
  PostPublic,
  RegisterRequest,
  SupporterListItem,
  SupporterStatus,
  SupportersQuery,
  UpdateEventRequest,
  UpdateLeaderRequest,
  UpdateLiveRequest,
  UpdatePostRequest,
  UserPublic,
} from '@platform/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    if (response.status === 204) {
      return undefined as T;
    }

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

  private qs(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
  }

  // Auth
  login(body: LoginRequest) {
    return this.request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  }

  register(body: RegisterRequest) {
    return this.request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  }

  me() {
    return this.request<UserPublic>('/auth/me');
  }

  // Admin
  getAdminDashboard() {
    return this.request<AdminDashboard>('/admin/dashboard');
  }

  getAdminPosts() {
    return this.request<PostPublic[]>('/admin/posts');
  }

  getAdminEvents() {
    return this.request<EventPublic[]>('/admin/events');
  }

  getAdminLives() {
    return this.request<LivePublic[]>('/admin/lives');
  }

  getAdminSupporters(query: SupportersQuery = {}) {
    return this.request<PaginatedResponse<SupporterListItem>>(
      `/admin/supporters${this.qs(query as Record<string, string | number | undefined>)}`,
    );
  }

  updateAdminSupporterStatus(id: string, status: SupporterStatus) {
    return this.request<{ success: boolean; status: SupporterStatus }>(`/admin/supporters/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Leader
  getLeaderDashboard() {
    return this.request<LeaderDashboard>('/leader/dashboard');
  }

  getLeaderSupporters(query: SupportersQuery = {}) {
    return this.request<PaginatedResponse<SupporterListItem>>(
      `/leader/supporters${this.qs(query as Record<string, string | number | undefined>)}`,
    );
  }

  updateLeaderSupporterStatus(id: string, status: SupporterStatus) {
    return this.request<{ success: boolean; status: SupporterStatus }>(`/leader/supporters/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  getLeaderBySlug(slug: string) {
    return this.request<{ id: string; firstName: string; lastName: string; leaderSlug: string }>(
      `/leader/${slug}`,
    );
  }

  createSupporter(slug: string, body: CreateSupporterRequest) {
    return this.request<{ success: boolean; id: string }>(`/leader/${slug}/supporters`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Posts
  getPosts(params: { page?: number; limit?: number; category?: PostCategory } = {}) {
    return this.request<PaginatedResponse<PostPublic>>(
      `/posts${this.qs({ page: params.page, limit: params.limit, category: params.category })}`,
    );
  }

  getPost(id: string) {
    return this.request<PostPublic>(`/posts/${id}`);
  }

  createPost(body: CreatePostRequest) {
    return this.request<PostPublic>('/posts', { method: 'POST', body: JSON.stringify(body) });
  }

  updatePost(id: string, body: UpdatePostRequest) {
    return this.request<PostPublic>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  deletePost(id: string) {
    return this.request<void>(`/posts/${id}`, { method: 'DELETE' });
  }

  // Events
  getEvents(params: { page?: number; limit?: number } = {}) {
    return this.request<PaginatedResponse<EventPublic>>(
      `/events${this.qs({ page: params.page, limit: params.limit })}`,
    );
  }

  createEvent(body: CreateEventRequest) {
    return this.request<EventPublic>('/events', { method: 'POST', body: JSON.stringify(body) });
  }

  updateEvent(id: string, body: UpdateEventRequest) {
    return this.request<EventPublic>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  deleteEvent(id: string) {
    return this.request<void>(`/events/${id}`, { method: 'DELETE' });
  }

  // Lives
  getLives(params: { page?: number; limit?: number } = {}) {
    return this.request<PaginatedResponse<LivePublic>>(
      `/lives${this.qs({ page: params.page, limit: params.limit })}`,
    );
  }

  createLive(body: CreateLiveRequest) {
    return this.request<LivePublic>('/lives', { method: 'POST', body: JSON.stringify(body) });
  }

  updateLive(id: string, body: UpdateLiveRequest) {
    return this.request<LivePublic>(`/lives/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  deleteLive(id: string) {
    return this.request<void>(`/lives/${id}`, { method: 'DELETE' });
  }

  // Notifications
  getNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    return this.request<PaginatedResponse<NotificationPublic> & { unreadCount: number }>(
      `/notifications${this.qs({
        page: params.page,
        limit: params.limit,
        unreadOnly: params.unreadOnly ? 'true' : undefined,
      })}`,
    );
  }

  markNotificationRead(id: string) {
    return this.request<NotificationPublic>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
  }

  // Coordinator
  getCoordinatorDashboard() {
    return this.request<CoordinatorDashboard>('/coordinator/dashboard');
  }

  getCoordinatorLeaders(query: CoordinatorLeadersQuery = {}) {
    return this.request<PaginatedResponse<CoordinatorLeaderItem>>(
      `/coordinator/leaders${this.qs({
        page: query.page,
        limit: query.limit,
        search: query.search,
      })}`,
    );
  }

  createCoordinatorLeader(body: CreateLeaderRequest) {
    return this.request<CoordinatorLeaderItem>('/coordinator/leaders', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  updateCoordinatorLeader(id: string, body: UpdateLeaderRequest) {
    return this.request<CoordinatorLeaderItem>(`/coordinator/leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  deactivateCoordinatorLeader(id: string) {
    return this.request<{ success: boolean }>(`/coordinator/leaders/${id}/deactivate`, {
      method: 'PATCH',
    });
  }

  getCoordinatorSupporters(query: SupportersQuery = {}) {
    return this.request<PaginatedResponse<SupporterListItem>>(
      `/coordinator/supporters${this.qs(query as Record<string, string | number | undefined>)}`,
    );
  }

  updateCoordinatorSupporterStatus(id: string, status: SupporterStatus) {
    return this.request<{ success: boolean; status: SupporterStatus }>(`/coordinator/supporters/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new ApiClient();
