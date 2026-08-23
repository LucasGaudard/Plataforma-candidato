const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
) {
  const env = options.env ?? process.env;
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return env.NODE_ENV !== 'production';
  if (!token || token.length > 2048) return false;
  try {
    const response = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
