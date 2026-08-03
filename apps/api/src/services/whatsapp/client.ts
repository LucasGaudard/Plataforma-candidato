const GRAPH_BASE_URL = 'https://graph.facebook.com';
const DEFAULT_TIMEOUT_MS = 12_000;

export interface MetaErrorDetails {
  message?: string;
  type?: string;
  code?: number;
  subcode?: number;
  errorUserTitle?: string;
  errorUserMessage?: string;
  fbtraceId?: string;
}

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status = 502,
    public readonly metaHttpStatus?: number,
    public readonly metaDetails?: MetaErrorDetails,
  ) {
    super(message);
  }
}

type MetaError = {
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
    error_subcode?: unknown;
    error_user_title?: unknown;
    error_user_msg?: unknown;
    fbtrace_id?: unknown;
  };
};

export interface MetaWhatsappTemplateComponent {
  type?: string;
  text?: string;
  buttons?: Array<{ type?: string; text?: string; url?: string }>;
}

export interface MetaWhatsappTemplate {
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: MetaWhatsappTemplateComponent[];
}

function sanitizedString(value: unknown, accessToken: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const withoutToken = accessToken ? value.split(accessToken).join('[REDACTED]') : value;
  return withoutToken.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 1_000);
}

function sanitizedNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function safeError(status: number, data: MetaError | null, accessToken: string): WhatsAppApiError {
  const source = data?.error;
  const details: MetaErrorDetails = {
    message: sanitizedString(source?.message, accessToken),
    type: sanitizedString(source?.type, accessToken),
    code: sanitizedNumber(source?.code),
    subcode: sanitizedNumber(source?.error_subcode),
    errorUserTitle: sanitizedString(source?.error_user_title, accessToken),
    errorUserMessage: sanitizedString(source?.error_user_msg, accessToken),
    fbtraceId: sanitizedString(source?.fbtrace_id, accessToken),
  };
  const code = details.code;
  if (code === 190) return new WhatsAppApiError('Token da Meta inválido ou expirado', String(code), 400, status, details);
  if (code === 10 || code === 200) return new WhatsAppApiError('Token sem permissão para este recurso', String(code), 403, status, details);
  if (status === 404) return new WhatsAppApiError('Phone Number ID ou WABA não encontrado', String(code || 404), 400, status, details);
  if (status === 429) return new WhatsAppApiError('Limite de requisições da Meta atingido', String(code || 429), 429, status, details);
  return new WhatsAppApiError(
    status >= 500 ? 'Meta temporariamente indisponível' : 'A Meta rejeitou a solicitação',
    String(code || status),
    status >= 500 ? 503 : 400,
    status,
    details,
  );
}

export class WhatsAppClient {
  constructor(
    private readonly accessToken: string,
    private readonly apiVersion: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetch(`${GRAPH_BASE_URL}/${this.apiVersion}/${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
      const text = await response.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* resposta não JSON é tratada abaixo */ }
      if (!response.ok) throw safeError(response.status, data as MetaError | null, this.accessToken);
      if (data === null) throw new WhatsAppApiError('Resposta inválida da Meta');
      return data as T;
    } catch (error) {
      if (error instanceof WhatsAppApiError) throw error;
      if ((error as Error).name === 'AbortError') throw new WhatsAppApiError('Tempo limite ao acessar a Meta', 'TIMEOUT', 504);
      throw new WhatsAppApiError('Não foi possível acessar a Meta', 'NETWORK', 503);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  getPhoneNumber(phoneNumberId: string) {
    return this.request<{ id: string; display_phone_number?: string; verified_name?: string }>(
      `${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name`,
    );
  }

  getWabaPhoneNumbers(businessAccountId: string) {
    return this.request<{ data?: Array<{ id: string }> }>(
      `${encodeURIComponent(businessAccountId)}/phone_numbers?fields=id`,
    );
  }

  subscribeWebhook(businessAccountId: string) {
    return this.request<{ success: boolean }>(`${encodeURIComponent(businessAccountId)}/subscribed_apps`, { method: 'POST' });
  }

  async getMessageTemplates(businessAccountId: string): Promise<MetaWhatsappTemplate[]> {
    const templates: MetaWhatsappTemplate[] = [];
    let after: string | undefined;
    for (let page = 0; page < 10; page += 1) {
      const query = new URLSearchParams({
        fields: 'name,language,status,category,components',
        limit: '100',
        ...(after ? { after } : {}),
      });
      const result = await this.request<{
        data?: MetaWhatsappTemplate[];
        paging?: { cursors?: { after?: string }; next?: string };
      }>(`${encodeURIComponent(businessAccountId)}/message_templates?${query.toString()}`);
      if (Array.isArray(result.data)) templates.push(...result.data);
      const nextAfter = result.paging?.cursors?.after;
      if (!result.paging?.next || !nextAfter || nextAfter === after) break;
      after = nextAfter;
    }
    return templates;
  }

  sendTemplate(
    phoneNumberId: string,
    to: string,
    template: { name: string; language: string; bodyParameters?: string[] },
  ) {
    const bodyParameters = template.bodyParameters || [];
    return this.request<{ messages?: Array<{ id: string }> }>(
      `${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: template.language },
            ...(bodyParameters.length > 0
              ? {
                  components: [{
                    type: 'body',
                    parameters: bodyParameters.map((text) => ({ type: 'text', text })),
                  }],
                }
              : {}),
          },
        }),
      },
    );
  }
}
