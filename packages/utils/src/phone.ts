export function stripPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Normaliza um telefone brasileiro para DDD + número, sem DDI. */
export function normalizeBrazilianPhone(phone: string): string | null {
  let digits = stripPhone(phone);
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits.length === 10 || digits.length === 11 ? digits : null;
}

/** Normaliza um telefone brasileiro para envio internacional, sem sinal de +. */
export function normalizeBrazilianPhoneForSending(phone: string): string | null {
  const local = normalizeBrazilianPhone(phone);
  return local ? `55${local}` : null;
}

export function formatPhone(phone: string): string {
  const digits = stripPhone(phone).slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  return normalizeBrazilianPhone(phone) !== null;
}

const BRAZILIAN_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Validação estrutural conservadora para celular brasileiro; não comprova existência ou titularidade. */
export function isValidBrazilianMobilePhone(phone: string): boolean {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized || normalized.length !== 11) return false;
  if (!BRAZILIAN_DDDS.has(Number(normalized.slice(0, 2)))) return false;
  const subscriber = normalized.slice(2);
  if (!subscriber.startsWith('9')) return false;
  if (new Set(normalized).size === 1) return false;
  if (/^(?:0123456789|1234567890|9876543210)/.test(normalized)) return false;
  if (/^(\d)\1{7,}$/.test(subscriber)) return false;
  return true;
}
