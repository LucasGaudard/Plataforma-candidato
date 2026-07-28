export function normalizeHexColor(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Cor inválida');
  const color = value.trim();
  if (!/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error('Cor inválida. Use #RGB ou #RRGGBB');
  }
  const expanded = color.length === 4
    ? `#${color.slice(1).split('').map((character) => character.repeat(2)).join('')}`
    : color;
  return expanded.toUpperCase();
}

export function normalizeHttpUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('URL inválida');
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
    return url.toString();
  } catch {
    throw new Error('URL inválida. Use apenas http ou https');
  }
}
