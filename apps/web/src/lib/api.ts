import type {
  AdminDashboard,
  AuthResponse,
  CommunicationFilters,
  CoordinatorDashboard,
  CoordinatorSupportersQuery,
  CoordinatorSupportersResponse,
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
  PublicCampaignSummary,
  RegisterRequest,
  RecipientCountResponse,
  SupporterListItem,
  AdminCoordinatorItem,
  AdminLeaderItem,
  CreateCoordinatorRequest,
  UpdateCoordinatorRequest,
  AdminCreateLeaderRequest,
  UpdateLeaderRequest,
  SupporterStatus,
  SupportersQuery,
  UpdateEventRequest,
  UpdateLiveRequest,
  UpdatePostRequest,
  AuthenticatedUserPublic,
  WhatsappConfigStatus,
  TestConnectionResponse,
  TestMessageRequest,
  TestMessageResponse,
  WhatsappTemplatesResponse,
  CampaignStatus,
  SuperAdminDashboard,
  SuperAdminCampaignListItem,
  SuperAdminCampaignDetail,
  CreateSuperAdminCampaignRequest,
  UpdateSuperAdminCampaignRequest,
  SuperAdminCampaignAdminInput,
  CampaignContent,
  ManualWhatsappConfig,
  ManualWhatsappQueueFilters,
  ManualWhatsappQueueResponse,
  CreateManualCommunicationSessionRequest,
  ManualCommunicationFilters,
  ManualCommunicationOptions,
  ManualCommunicationPreview,
  ManualCommunicationSession,
  UpdateManualWhatsappConfigRequest,
  DeleteManagedUserResponse,
  DeleteSupporterResponse,
} from '@platform/types';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type if there is a body to send
    if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
      const dependencySummary = Array.isArray(data.dependencies)
        ? data.dependencies.map((item: { label: string; count: number }) => `${item.count} ${item.label}`).join(', ')
        : '';
      const error = new Error(
        `${data.message || 'Erro na requisição'}${dependencySummary ? ` Vínculos: ${dependencySummary}.` : ''}`,
      ) as Error & {
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

  register(campaignSlug: string, body: RegisterRequest) {
    return this.request<AuthResponse>(`/auth/register/${encodeURIComponent(campaignSlug)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  me() {
    return this.request<AuthenticatedUserPublic>('/auth/me');
  }

  getCampaignContent() {
    return this.request<CampaignContent>('/campaign/content');
  }

  updateCampaignContent(body: Partial<CampaignContent>) {
    return this.request<CampaignContent>('/campaign/content', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  getSuperAdminDashboard() {
    return this.request<SuperAdminDashboard>('/super-admin/dashboard');
  }

  getSuperAdminCampaigns(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: CampaignStatus;
    sort?: 'createdAt' | 'name';
    order?: 'asc' | 'desc';
  } = {}) {
    return this.request<PaginatedResponse<SuperAdminCampaignListItem>>(
      `/super-admin/campaigns${this.qs(params)}`,
    );
  }

  createSuperAdminCampaign(body: CreateSuperAdminCampaignRequest) {
    return this.request<{ campaign: SuperAdminCampaignDetail; admin: { id: string; email: string } | null }>(
      '/super-admin/campaigns',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  getSuperAdminCampaign(id: string) {
    return this.request<SuperAdminCampaignDetail>(`/super-admin/campaigns/${id}`);
  }

  updateSuperAdminCampaign(id: string, body: UpdateSuperAdminCampaignRequest) {
    return this.request<SuperAdminCampaignDetail>(`/super-admin/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  updateSuperAdminCampaignStatus(id: string, status: CampaignStatus) {
    return this.request<{ id: string; status: CampaignStatus }>(
      `/super-admin/campaigns/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  }

  createSuperAdminCampaignAdmin(id: string, body: SuperAdminCampaignAdminInput) {
    return this.request<{ id: string; email: string; firstName: string; lastName: string }>(
      `/super-admin/campaigns/${id}/admins`,
      { method: 'POST', body: JSON.stringify(body) },
    );
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

  getManualWhatsappConfig() {
    return this.request<ManualWhatsappConfig>('/campaign/manual-whatsapp');
  }

  getManualWhatsappQueue(filters: ManualWhatsappQueueFilters = {}) {
    return this.request<ManualWhatsappQueueResponse>(
      `/campaign/manual-whatsapp/queue${this.qs(filters as Record<string, string | number | undefined>)}`,
    );
  }

  updateManualWhatsappConfig(body: UpdateManualWhatsappConfigRequest) {
    return this.request<ManualWhatsappConfig>('/campaign/manual-whatsapp', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  markManualWhatsappInitialMessageSent(id: string) {
    return this.request<{ sentAt: string }>(
      `/campaign/supporters/${encodeURIComponent(id)}/manual-whatsapp-sent`,
      { method: 'PATCH', body: JSON.stringify({}) },
    );
  }

  getManualCommunicationOptions() {
    return this.request<ManualCommunicationOptions>('/campaign/manual-communications/options');
  }

  previewManualCommunication(filters: ManualCommunicationFilters) {
    return this.request<ManualCommunicationPreview>('/campaign/manual-communications/preview', {
      method: 'POST', body: JSON.stringify({ filters }),
    });
  }

  createManualCommunication(body: CreateManualCommunicationSessionRequest) {
    return this.request<ManualCommunicationSession>('/campaign/manual-communications', {
      method: 'POST', body: JSON.stringify(body),
    });
  }

  getManualCommunicationSessions() {
    return this.request<ManualCommunicationSession[]>('/campaign/manual-communications');
  }

  getManualCommunicationSession(id: string) {
    return this.request<ManualCommunicationSession>(`/campaign/manual-communications/${encodeURIComponent(id)}`);
  }

  updateManualCommunicationStatus(id: string, status: 'ACTIVE' | 'PAUSED') {
    return this.request<{ status: 'ACTIVE' | 'PAUSED' }>(`/campaign/manual-communications/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    });
  }

  updateManualCommunicationRecipient(sessionId: string, recipientId: string, action: 'SENT' | 'SKIPPED' | 'OPT_OUT') {
    return this.request<{ status: string }>(`/campaign/manual-communications/${encodeURIComponent(sessionId)}/recipients/${encodeURIComponent(recipientId)}`, {
      method: 'PATCH', body: JSON.stringify({ action }),
    });
  }

  deleteAdminSupporter(id: string) {
    return this.request<DeleteSupporterResponse>(`/admin/supporters/${id}`, { method: 'DELETE' });
  }

  getAdminRecipientCount(filters: CommunicationFilters) {
    return this.request<RecipientCountResponse>(
      `/admin/communication/recipients/count${this.qs(filters as Record<string, string | number | undefined>)}`
    );
  }

  // Admin: Coordinators
  getAdminCoordinators(query?: { page?: number; limit?: number; search?: string }) {
    return this.request<{ data: AdminCoordinatorItem[]; meta: { totalPages: number; total: number } }>(
      `/admin/coordinators${this.qs(query as Record<string, string | number | undefined>)}`
    );
  }

  createAdminCoordinator(data: CreateCoordinatorRequest) {
    return this.request<{ id: string }>('/admin/coordinators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAdminCoordinator(id: string, data: UpdateCoordinatorRequest) {
    return this.request<{ success: boolean }>(`/admin/coordinators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deactivateAdminCoordinator(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/coordinators/${id}/deactivate`, {
      method: 'PATCH',
    });
  }

  deleteAdminCoordinator(id: string) {
    return this.request<DeleteManagedUserResponse>(`/admin/coordinators/${id}`, { method: 'DELETE' });
  }

  // Admin: Leaders
  getAdminLeaders(query?: { page?: number; limit?: number; search?: string; coordinatorId?: string }) {
    return this.request<{ data: AdminLeaderItem[]; meta: { totalPages: number; total: number } }>(
      `/admin/leaders${this.qs(query as Record<string, string | number | undefined>)}`
    );
  }

  createAdminLeader(data: AdminCreateLeaderRequest) {
    return this.request<{ id: string }>('/admin/leaders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAdminLeader(id: string, data: UpdateLeaderRequest) {
    return this.request<{ success: boolean }>(`/admin/leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deactivateAdminLeader(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/leaders/${id}/deactivate`, {
      method: 'PATCH',
    });
  }

  deleteAdminLeader(id: string) {
    return this.request<DeleteManagedUserResponse>(`/admin/leaders/${id}`, { method: 'DELETE' });
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

  deleteLeaderSupporter(id: string) {
    return this.request<DeleteSupporterResponse>(`/leader/supporters/${id}`, { method: 'DELETE' });
  }

  getLeaderRecipientCount(filters: CommunicationFilters) {
    return this.request<RecipientCountResponse>(
      `/leader/communication/recipients/count${this.qs(filters as Record<string, string | number | undefined>)}`
    );
  }

  getPublicCampaign(campaignSlug: string) {
    return this.request<PublicCampaignSummary>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}`,
    );
  }

  getLeaderBySlug(campaignSlug: string, leaderSlug: string) {
    return this.request<{ id: string; firstName: string; lastName: string; leaderSlug: string }>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/leaders/${encodeURIComponent(leaderSlug)}`,
    );
  }

  createSupporter(campaignSlug: string, leaderSlug: string, body: CreateSupporterRequest) {
    return this.request<{ success: boolean; id: string }>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/leaders/${encodeURIComponent(leaderSlug)}/supporters`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  // Posts
  getPosts(campaignSlug: string, params: { page?: number; limit?: number; category?: PostCategory } = {}) {
    return this.request<PaginatedResponse<PostPublic>>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/posts${this.qs({ page: params.page, limit: params.limit, category: params.category })}`,
    );
  }

  getPost(campaignSlug: string, id: string) {
    return this.request<PostPublic>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/posts/${encodeURIComponent(id)}`,
    );
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
  getEvents(campaignSlug: string, params: { page?: number; limit?: number } = {}) {
    return this.request<PaginatedResponse<EventPublic>>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/events${this.qs({ page: params.page, limit: params.limit })}`,
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
  getLives(campaignSlug: string, params: { page?: number; limit?: number } = {}) {
    return this.request<PaginatedResponse<LivePublic>>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/lives${this.qs({ page: params.page, limit: params.limit })}`,
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

  getCoordinatorSupporters(query: CoordinatorSupportersQuery & SupportersQuery = {}) {
    return this.request<CoordinatorSupportersResponse>(
      `/coordinator/supporters${this.qs(query as Record<string, string | number | undefined>)}`,
    );
  }

  updateCoordinatorSupporterStatus(id: string, status: SupporterStatus) {
    return this.request<{ success: boolean; status: SupporterStatus }>(`/coordinator/supporters/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  deleteCoordinatorSupporter(id: string) {
    return this.request<DeleteSupporterResponse>(`/coordinator/supporters/${id}`, { method: 'DELETE' });
  }

  getCoordinatorRecipientCount(filters: CommunicationFilters) {
    return this.request<RecipientCountResponse>(
      `/coordinator/communication/recipients/count${this.qs(filters as Record<string, string | number | undefined>)}`
    );
  }

  getWhatsappConfigStatus() {
    return this.request<WhatsappConfigStatus>('/campaign/whatsapp/config');
  }

  getCoordinatorBySlug(campaignSlug: string, coordinatorSlug: string) {
    return this.request<{ id: string; firstName: string; lastName: string; coordinatorSlug: string }>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/coordinators/${encodeURIComponent(coordinatorSlug)}`,
    );
  }

  createCoordinatorSupporter(campaignSlug: string, coordinatorSlug: string, body: CreateSupporterRequest) {
    return this.request<{ success: boolean; id: string }>(
      `/public/campaigns/${encodeURIComponent(campaignSlug)}/coordinators/${encodeURIComponent(coordinatorSlug)}/supporters`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  disableSuperAdminCampaignWhatsapp(id: string) {
    return this.request<{ success: boolean }>(`/super-admin/campaigns/${id}/whatsapp`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });
  }

  clearSuperAdminCampaignWhatsapp(id: string) {
    return this.request<void>(`/super-admin/campaigns/${id}/whatsapp`, { method: 'DELETE' });
  }

  updateWhatsappConfig(data: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber: string;
    accessToken?: string;
    apiVersion: string;
    enabled: boolean;
  }) {
    return this.request<WhatsappConfigStatus>('/campaign/whatsapp/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  testWhatsappConnection() {
    return this.request<TestConnectionResponse>('/campaign/whatsapp/test-connection', { method: 'POST' });
  }

  testWhatsappMessage(data: TestMessageRequest) {
    return this.request<TestMessageResponse>('/campaign/whatsapp/test-message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  subscribeWhatsappWebhook() {
    return this.request<{ success: boolean; message: string }>('/campaign/whatsapp/subscribe-webhook', { method: 'POST' });
  }

  getWhatsappTemplates() {
    return this.request<WhatsappTemplatesResponse>('/campaign/whatsapp/templates');
  }
}

export const api = new ApiClient();
