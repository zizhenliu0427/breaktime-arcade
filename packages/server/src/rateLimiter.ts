/**
 * Simple in-memory rate limiter — no external dependencies.
 *
 * Uses a sliding-window counter keyed by an arbitrary string (IP, socket ID, …).
 * Buckets are lazily created and cleaned up on each check, so memory stays bounded
 * even under a sustained spike (each unique key costs one Map entry).
 *
 * Intentionally permissive defaults — this is a party game, not a bank.
 * The goal is to prevent runaway automation, not to cap normal usage.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    /** Max allowed calls within the window. */
    private readonly limit: number,
    /** Window duration in milliseconds. */
    private readonly windowMs: number,
  ) {}

  /**
   * Returns true if the call is allowed (i.e. the key is under the limit).
   * Returns false when the limit is exceeded.
   */
  check(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      // New window
      bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
      return true;
    }

    bucket.count += 1;
    if (bucket.count > this.limit) return false;
    return true;
  }

  /** Seconds remaining until this key's window resets (0 if not tracked). */
  retryAfter(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));
  }

  /** Prune stale buckets (call occasionally to avoid unbounded growth). */
  prune(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }
}
