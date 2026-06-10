export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export function sanitizeObject<T extends Record<string, string>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    result[key as keyof T] = sanitizeString(result[key as keyof T]) as T[keyof T];
  }
  return result;
}
