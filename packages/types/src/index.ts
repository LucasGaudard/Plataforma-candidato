export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  LEADER: 'LEADER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const CityZone = {
  WEST: 'WEST',
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  OTHER: 'OTHER',
} as const;

export type CityZone = (typeof CityZone)[keyof typeof CityZone];

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

export const CampaignStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export interface CampaignPublic {
  id: string;
  name: string;
  slug: string;
  candidateName: string;
  party: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  publicTitle: string | null;
  publicDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  whatsappNumber: string | null;
  status: CampaignStatus;
}

export interface CampaignProposalItem {
  title: string;
  description: string;
}

export interface CampaignContent {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroDescription: string | null;
  ctaTitle: string | null;
  ctaDescription: string | null;
  ctaButtonText: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  proposalTitle: string | null;
  proposalItems: CampaignProposalItem[] | null;
  areasTitle: string | null;
  areaItems: string[] | null;
  bannerImageUrl: string | null;
  footerText: string | null;
  showHero: boolean;
  showAbout: boolean;
  showProposals: boolean;
  showAreas: boolean;
  showContact: boolean;
}

export interface PublicCampaignSummary extends CampaignContent {
  name: string;
  slug: string;
  candidateName: string;
  party: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  publicTitle: string | null;
  publicDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
}

export const LGPD_CONSENT_VERSION = '2026-07-27-v1';

export const LGPD_CONSENT_TEXT =
  'Autorizo a utilização e o tratamento dos meus dados pessoais, de forma segura e transparente, em conformidade com a Lei Geral de Proteção de Dados (LGPD), para realização do meu cadastro e para o envio de informações, ações, eventos e demais comunicações da campanha por e-mail, telefone e WhatsApp. Declaro estar ciente de que posso revogar esta autorização a qualquer momento.';

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

export interface AuthenticatedUserPublic extends UserPublic {
  campaignId: string | null;
  campaign: CampaignPublic | null;
}

export interface AuthResponse {
  token: string;
  user: AuthenticatedUserPublic;
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
  zone?: CityZone;
  leaderSlug?: string;
  lgpdConsent: boolean;
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
  zone?: CityZone | null;
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
  coordinatorSlug: string;
  referralLink: string;
}

export const DEFAULT_WHATSAPP_INITIAL_MESSAGE =
  'Olá! Obrigado por se cadastrar e fazer parte da nossa rede de apoiadores. Em breve você receberá novidades e informações da campanha por aqui.';

export interface ManualWhatsappConfig {
  officialNumber: string | null;
  initialMessage: string;
}

export interface UpdateManualWhatsappConfigRequest {
  officialNumber: string | null;
  initialMessage: string;
}

export type ManualWhatsappQueueOrigin = 'DIRECT' | 'LEADER' | 'COORDINATOR';

export interface ManualWhatsappQueueItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  origin: ManualWhatsappQueueOrigin;
  originName: string | null;
  createdAt: string;
}

export interface ManualWhatsappQueueFilters {
  leaderId?: string;
  coordinatorId?: string;
  zone?: CityZone;
  neighborhood?: string;
}

export interface ManualWhatsappQueueResponse {
  items: ManualWhatsappQueueItem[];
  totalPending: number;
  totalSent: number;
  filters: {
    leaders: Array<{ id: string; name: string }>;
    coordinators: Array<{ id: string; name: string }>;
    neighborhoods: string[];
  };
}

export interface ManualCommunicationFilters {
  status?: SupporterStatus;
  zone?: CityZone;
  neighborhood?: string;
  city?: string;
  coordinatorId?: string;
  leaderId?: string;
  registeredFrom?: string;
  registeredTo?: string;
}

export interface ManualCommunicationPreview {
  totalFound: number;
  eligible: number;
  excludedOptOut: number;
  invalidPhone: number;
}

export interface ManualCommunicationEligibleItem {
  id: string;
  name: string;
  phone: string;
  city: string;
  neighborhood: string | null;
  zone: CityZone | null;
  coordinatorName: string | null;
  leaderName: string | null;
  createdAt: string;
}

export interface ManualCommunicationEligibleResponse {
  data: ManualCommunicationEligibleItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type ManualCommunicationSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type ManualCommunicationRecipientStatus = 'PENDING' | 'SENT' | 'SKIPPED' | 'OPT_OUT';

export interface ManualCommunicationRecipient {
  id: string;
  supporterId: string;
  supporterName: string;
  phone: string;
  status: ManualCommunicationRecipientStatus;
  sentAt: string | null;
  skippedAt: string | null;
  optOutAt: string | null;
}

export interface ManualCommunicationSession {
  id: string;
  title: string;
  message: string;
  filters: ManualCommunicationFilters;
  requestedQuantity: number;
  status: ManualCommunicationSessionStatus;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  counts: Record<ManualCommunicationRecipientStatus, number>;
  recipients?: ManualCommunicationRecipient[];
}

export interface CreateManualCommunicationSessionRequest {
  title: string;
  message: string;
  filters: ManualCommunicationFilters;
  quantity: number | 'ALL';
  selection?:
    | { mode: 'IDS'; ids: string[] }
    | { mode: 'FIRST'; count: number }
    | { mode: 'ALL_FILTERED'; excludedIds?: string[] };
}

export interface ManualCommunicationOptions {
  leaders: Array<{ id: string; name: string }>;
  coordinators: Array<{ id: string; name: string }>;
  cities: string[];
  neighborhoods: string[];
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
  zone?: CityZone;
}

export interface UpdateLeaderRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  zone?: CityZone | null;
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
  zone?: CityZone;
  lgpdConsent: boolean;
  turnstileToken?: string;
  website?: string;
  formStartedAt?: number;
  deviceId?: string;
}

export interface SupportersQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  zone?: CityZone;
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
  zone?: CityZone;
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
  zone?: CityZone | null;
  status: SupporterStatus;
  whatsappStatus: WhatsappStatus;
  whatsappConfirmedAt?: string | null;
  whatsappInitialMessageSentAt?: string | null;
  createdAt: string;
  leaderName?: string;
  coordinatorName?: string;
}

export interface DeleteSupporterResponse {
  success: true;
  message: string;
  removed: { notifications: number };
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
  zone?: CityZone | null;
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
  zone?: CityZone;
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
  zone?: CityZone | null;
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
  zone?: CityZone | null;
  active: boolean;
  supportersCount: number;
  coordinatorId?: string;
  coordinatorName?: string;
  leaderSlug?: string;
  createdAt: string;
}

export interface AdminCreateLeaderRequest extends CreateLeaderRequest {
  coordinatorId?: string;
}

export type CoordinatorSupporterOrigin = 'COORDINATOR' | 'LEADER';

export interface CoordinatorSupporterItem extends SupporterListItem {
  email?: string;
  origin: CoordinatorSupporterOrigin;
  leader: { id: string; name: string } | null;
}

export interface CoordinatorSupportersQuery {
  page?: number;
  limit?: number;
  search?: string;
  origin?: CoordinatorSupporterOrigin;
  leaderId?: string;
  order?: 'asc' | 'desc';
}

export interface CoordinatorSupportersResponse {
  data: CoordinatorSupporterItem[];
  summary: { total: number; direct: number; fromLeaders: number };
  meta: PaginationMeta;
}

export interface UserDeletionDependency {
  type: 'posts' | 'events' | 'lives' | 'notifications';
  label: string;
  count: number;
}

export interface DeleteManagedUserResponse {
  success: true;
  message: string;
  unlinked: { leaders: number; supporters: number };
}

export interface WhatsappConfigStatus {
  configured: boolean;
  enabled: boolean;
  hasAccessToken: boolean;
  accessTokenLastFour: string | null;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber: string | null;
  apiVersion: string;
  webhookUrl: string;
  connectionStatus: 'NOT_TESTED' | 'CONNECTED' | 'ERROR';
  lastConnectionAt: string | null;
  lastConnectionError: string | null;
  lastTestMessageAt: string | null;
  lastWebhookAt: string | null;
}

/** @deprecated Estado do antigo diagnóstico simulado; mantido apenas para compatibilidade interna. */
export interface WhatsappTestState {
  lastConnectionTest: { success: boolean; date: string; data?: unknown } | null;
  lastMessageTest: { success: boolean; date: string; phone?: string } | null;
  lastWebhookTest: { success: boolean; date: string } | null;
  totalTestsRun: number;
}

export interface TestConnectionResponse {
  success: boolean;
  message?: string;
  testedAt?: string;
}

export interface TestMessageRequest {
  to: string;
  mode: 'template';
  templateName: string;
  language: string;
  bodyParameters?: string[];
}

export interface WhatsappTemplateVariableSummary {
  component: 'HEADER' | 'BODY' | 'BUTTON';
  count: number;
}

export interface WhatsappTemplateSummary {
  name: string;
  language: string;
  status: string;
  category: string;
  variables: WhatsappTemplateVariableSummary[];
}

export interface WhatsappTemplatesResponse {
  templates: WhatsappTemplateSummary[];
}

export interface TestMessageResponse {
  success: boolean;
  messageId: string;
  recipient: string;
  sentAt: string;
}

export interface SuperAdminDashboard {
  totalCampaigns: number;
  activeCampaigns: number;
  unavailableCampaigns: number;
  totalUsers: number;
  totalAdmins: number;
  totalLeaders: number;
  totalSupporters: number;
  totalPosts: number;
  totalEvents: number;
  totalLives: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    slug: string;
    status: CampaignStatus;
    createdAt: string;
  }>;
  statusDistribution: Array<{ status: CampaignStatus; _count: { status: number } }>;
  topCampaignsBySupporters: Array<{
    campaign?: { id: string; name: string; slug: string };
    supporters: number;
  }>;
}

export interface SuperAdminCampaignListItem {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  users: number;
  admins: number;
  leaders: number;
  supporters: number;
  posts: number;
  events: number;
  lives: number;
}

export interface SuperAdminCampaignAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CreateSuperAdminCampaignRequest extends Partial<CampaignContent> {
  name: string;
  slug?: string;
  candidateName?: string;
  party?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  publicTitle?: string;
  publicDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  whatsappNumber?: string;
  status?: CampaignStatus;
  admin?: SuperAdminCampaignAdminInput;
}

export interface UpdateSuperAdminCampaignRequest extends Partial<CampaignContent> {
  name?: string;
  slug?: string;
  candidateName?: string;
  party?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  publicTitle?: string | null;
  publicDescription?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  whatsappNumber?: string | null;
}

export interface SuperAdminCampaignDetail extends CampaignPublic, CampaignContent {
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    posts: number;
    events: number;
    lives: number;
    notifications: number;
  };
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
  whatsappConfig: null | {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber: string | null;
    enabled: boolean;
    connectionStatus: 'NOT_TESTED' | 'CONNECTED' | 'ERROR';
    lastConnectionAt: string | null;
    lastWebhookAt: string | null;
  };
}
