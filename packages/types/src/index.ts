export const Role = {
  ADMIN: 'ADMIN',
  LEADER: 'LEADER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

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
  role: Role;
  leaderSlug: string | null;
  leaderId: string | null;
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
