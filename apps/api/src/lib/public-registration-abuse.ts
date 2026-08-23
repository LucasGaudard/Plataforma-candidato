import { createHmac } from 'node:crypto';

type Entry = { attempts: number[]; cooldownUntil: number };
export type AbuseDimension = 'ip' | 'link' | 'phone';

const POLICY: Record<AbuseDimension, { max: number; windowMs: number; cooldownMs: number }> = {
  ip: { max: 40, windowMs: 5 * 60_000, cooldownMs: 10 * 60_000 },
  link: { max: 80, windowMs: 5 * 60_000, cooldownMs: 10 * 60_000 },
  phone: { max: 5, windowMs: 15 * 60_000, cooldownMs: 15 * 60_000 },
};

export class PublicRegistrationRateLimiter {
  private entries = new Map<string, Entry>();

  checkAndRecord(dimension: AbuseDimension, key: string, now = Date.now()) {
    const policy = POLICY[dimension];
    const storageKey = `${dimension}:${key}`;
    const current = this.entries.get(storageKey) ?? { attempts: [], cooldownUntil: 0 };
    current.attempts = current.attempts.filter((timestamp) => timestamp > now - policy.windowMs);
    if (current.cooldownUntil > now) return { allowed: false, count: current.attempts.length };
    current.attempts.push(now);
    if (current.attempts.length > policy.max) {
      current.cooldownUntil = now + policy.cooldownMs;
      this.entries.set(storageKey, current);
      return { allowed: false, count: current.attempts.length };
    }
    this.entries.set(storageKey, current);
    return { allowed: true, count: current.attempts.length };
  }

  clear() { this.entries.clear(); }
}

export function hashRegistrationIp(ip: string, secret = process.env.ABUSE_LOG_HASH_SECRET || process.env.JWT_SECRET || 'development-only') {
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
}

export function registrationRiskFlags(input: { ipAttempts: number; linkAttempts: number; formStartedAt?: number; now?: number }) {
  const now = input.now ?? Date.now();
  return [
    ...(input.ipAttempts >= 10 ? ['IP_VOLUME'] : []),
    ...(input.linkAttempts >= 20 ? ['LINK_VOLUME'] : []),
    ...(input.formStartedAt && now - input.formStartedAt < 1_200 ? ['FAST_SUBMIT'] : []),
  ];
}

export const publicRegistrationRateLimiter = new PublicRegistrationRateLimiter();

export function isHoneypotTriggered(value: string | undefined) {
  return Boolean(value?.trim());
}
