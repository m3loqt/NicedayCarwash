type Bucket = {
  windowStartMs: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export function consumeClientRateLimit(
  key: string,
  opts: { windowMs: number; maxAttempts: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now - current.windowStartMs > opts.windowMs) {
    buckets.set(key, { windowStartMs: now, count: 1 });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (current.count >= opts.maxAttempts) {
    return { allowed: false, retryAfterMs: Math.max(0, opts.windowMs - (now - current.windowStartMs)) };
  }

  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, retryAfterMs: 0 };
}
