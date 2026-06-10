export const Role = {
  ADMIN: 'ADMIN',
  LEADER: 'LEADER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

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

export interface AdminDashboard {
  totalLeaders: number;
  totalSupporters: number;
  supportersByLeader: Array<{
    leaderId: string;
    leaderName: string;
    leaderSlug: string;
    count: number;
  }>;
}

export interface LeaderDashboard {
  totalSupporters: number;
  leaderSlug: string;
  referralLink: string;
  supporters: UserPublic[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}
