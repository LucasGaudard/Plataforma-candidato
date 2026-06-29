export const Role = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  LEADER: 'LEADER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const SupporterStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  INVALID: 'INVALID',
} as const;

export type SupporterStatus = (typeof SupporterStatus)[keyof typeof SupporterStatus];

export const WhatsappStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  OPT_OUT: 'OPT_OUT',
} as const;

export type WhatsappStatus = (typeof WhatsappStatus)[keyof typeof WhatsappStatus];

export const PostCategory = {
  VIDEO: 'VIDEO',
  LIVE: 'LIVE',
  COMUNICADO: 'COMUNICADO',
  EVENTO: 'EVENTO',
  GERAL: 'GERAL',
} as const;

export type PostCategory = (typeof PostCategory)[keyof typeof PostCategory];

export const NotificationType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  EVENT: 'EVENT',
  POST: 'POST',
  LIVE: 'LIVE',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  role: Role;
  whatsappStatus?: WhatsappStatus;
  leaderSlug: string | null;
  leaderId: string | null;
  coordinatorId: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  neighborhood?: string;
  leaderSlug?: string;
}

export interface PostPublic {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  category: PostCategory;
  publishedAt: string;
  published: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  category: PostCategory;
  publishedAt?: string;
  published?: boolean;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

export interface EventPublic {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  published: boolean;
  authorName: string;
  createdAt: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  published?: boolean;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

export interface LivePublic {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  youtubeUrl: string;
  published: boolean;
  scheduledAt: string | null;
  authorName: string;
  createdAt: string;
}

export interface CreateLiveRequest {
  title: string;
  description: string;
  thumbnailUrl?: string;
  youtubeUrl: string;
  scheduledAt?: string;
  published?: boolean;
}

export interface UpdateLiveRequest extends Partial<CreateLiveRequest> {}

export interface NotificationPublic {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: NotificationType;
  link: string | null;
  createdAt: string;
}

export interface LeaderRankingItem {
  leaderId: string;
  leaderName: string;
  leaderSlug: string;
  count: number;
  rank: number;
  recentCount: number;
}

export interface RegistrationGrowthItem {
  date: string;
  count: number;
}

export interface AdminDashboard {
  totalLeaders: number;
  totalSupporters: number;
  totalPending: number;
  totalVerified: number;
  totalInvalid: number;
  totalPosts: number;
  totalEvents: number;
  totalLives: number;
  recentRegistrations: number;
  supportersByLeader: Array<{
    leaderId: string;
    leaderName: string;
    leaderSlug: string;
    count: number;
  }>;
  leaderRanking: LeaderRankingItem[];
  registrationGrowth: RegistrationGrowthItem[];
}

export interface LeaderDashboard {
  totalSupporters: number;
  totalPending: number;
  totalVerified: number;
  totalInvalid: number;
  leaderSlug: string;
  referralLink: string;
  recentSupporters: number;
  supporters: UserPublic[];
  supportersMeta: PaginationMeta;
}

export interface LeaderSupportersQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  state?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}

export interface CoordinatorLeaderItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  leaderSlug: string | null;
  supporterCount: number;
  createdAt: string;
}

export interface CoordinatorDashboard {
  totalLeaders: number;
  totalSupporters: number;
  totalPending: number;
  totalVerified: number;
  totalInvalid: number;
  averageSupportersPerLeader: number;
}

export interface CreateLeaderRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  neighborhood?: string;
}

export interface UpdateLeaderRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
}

export interface CoordinatorLeadersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateSupporterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state: string;
  neighborhood?: string;
}

export interface SupportersQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  leaderId?: string;
  coordinatorId?: string;
}

export interface CommunicationFilters {
  verifiedOnly?: boolean;
  coordinatorId?: string;
  leaderId?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
}

export interface RecipientCountResponse {
  count: number;
}

export interface SupporterListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  status: SupporterStatus;
  whatsappStatus: WhatsappStatus;
  createdAt: string;
  leaderName?: string;
  coordinatorName?: string;
}

export interface AdminCoordinatorItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  active: boolean;
  leadersCount: number;
  supportersCount: number;
  createdAt: string;
}

export interface CreateCoordinatorRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  neighborhood?: string;
}

export interface UpdateCoordinatorRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
}

export interface AdminLeaderItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  active: boolean;
  supportersCount: number;
  coordinatorId: string;
  coordinatorName: string;
  leaderSlug?: string;
  createdAt: string;
}

export interface AdminCreateLeaderRequest extends CreateLeaderRequest {
  coordinatorId: string;
}
