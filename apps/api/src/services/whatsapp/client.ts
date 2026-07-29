const GRAPH_BASE_URL = 'https://graph.facebook.com';
const DEFAULT_TIMEOUT_MS = 12_000;

export class WhatsAppApiError extends Error {
  constructor(message: string, public readonly code?: string, public readonly status = 502) {
    super(message);
  }
}

type MetaError = { error?: { code?: number; error_subcode?: number; type?: string } };

function safeError(status: number, data: MetaError | null): WhatsAppApiError {
  const code = data?.error?.code;
  if (code === 190) return new WhatsAppApiError('Token da Meta inválido ou expirado', String(code), 400);
  if (code === 10 || code === 200) return new WhatsAppApiError('Token sem permissão para este recurso', String(code), 403);
  if (status === 404) return new WhatsAppApiError('Phone Number ID ou WABA não encontrado', String(code || 404), 400);
  if (status === 429) return new WhatsAppApiError('Limite de requisições da Meta atingido', String(code || 429), 429);
  return new WhatsAppApiError(status >= 500 ? 'Meta temporariamente indisponível' : 'A Meta rejeitou a solicitação', String(code || status), status >= 500 ? 503 : 400);
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
      if (!response.ok) throw safeError(response.status, data as MetaError | null);
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

  sendTemplate(phoneNumberId: string, to: string) {
    return this.request<{ messages?: Array<{ id: string }> }>(
      `${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: 'hello_world', language: { code: 'en_US' } },
        }),
      },
    );
  }
}
