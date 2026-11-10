/**
 * Sliding-window rate limiter (per server instance).
 *
 * This is the fast first line of defence against bursts. Durable, cross-instance limits are
 * enforced separately from the usage_events table (monthly quota + daily message cap).
 */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const oldestHit = bucket.hits[0] ?? now;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000)) };
  }
  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}
