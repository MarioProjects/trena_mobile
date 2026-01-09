export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value: unknown, fallback = 'null'): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

