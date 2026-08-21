export function resolvePublishedAt(value: string | undefined, fallback: Date): Date | null {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
