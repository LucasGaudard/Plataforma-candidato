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
