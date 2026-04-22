/* eslint-disable no-console -- centralized logging output lives here only */

type LogMeta = Record<string, unknown> | undefined;

const SENSITIVE_KEY_RE = /(password|token|accesstoken|apikey|secret|auth|payment|card)/i;
const MAX_DEPTH = 4;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? '[REDACTED]' : sanitizeValue(val, depth + 1);
    }
    return out;
  }
  return String(value);
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const err = error as Error & { code?: string; status?: number };
    return sanitizeValue({
      name: err.name || 'Error',
      message: err.message || 'Unknown error',
      code: err.code,
      status: err.status,
    }) as Record<string, unknown>;
  }
  if (typeof error === 'string') return { name: 'Error', message: error };
  return sanitizeValue({ name: 'Error', message: 'Unknown error', detail: error }) as Record<string, unknown>;
}

function emit(level: 'INFO' | 'WARN' | 'ERROR', scope: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  const prefix = `[NicedayCarwash:${level}:${scope}]`;
  if (level === 'ERROR') {
    console.error(prefix, payload);
  } else if (level === 'WARN') {
    console.warn(prefix, payload);
  } else {
    console.info(prefix, payload);
  }
}

export function logInfo(scope: string, message: string, meta?: LogMeta): void {
  emit('INFO', scope, {
    message,
    meta: sanitizeValue(meta),
  });
}

export function logWarn(scope: string, message: string, meta?: LogMeta): void {
  emit('WARN', scope, {
    message,
    meta: sanitizeValue(meta),
  });
}

export function logError(scope: string, error: unknown, meta?: LogMeta): void {
  emit('ERROR', scope, {
    error: normalizeError(error),
    meta: sanitizeValue(meta),
  });
}

// Backward compatibility for existing callers.
export function logAppError(scope: string, error: unknown, meta?: LogMeta): void {
  logError(scope, error, meta);
}

