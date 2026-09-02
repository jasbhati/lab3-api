import { RequestHandler } from 'express';
import { AppError } from './errorHandler.js';

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly maxRequests: number = DEFAULT_LIMIT,
    private readonly windowMs: number = DEFAULT_WINDOW_MS,
    cleanupIntervalMs: number = DEFAULT_CLEANUP_INTERVAL_MS,
  ) {
    // unref() so the timer never keeps the process (or test runner) alive.
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs).unref();
  }

  get limit(): number {
    return this.maxRequests;
  }

  get size(): number {
    return this.hits.size;
  }

  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const active = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (active.length >= this.maxRequests) {
      this.hits.set(key, active);
      const resetAt = (active[0] ?? now) + this.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    active.push(now);
    this.hits.set(key, active);

    const resetAt = (active[0] ?? now) + this.windowMs;

    return {
      allowed: true,
      remaining: this.maxRequests - active.length,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  // Drops keys with no timestamps left in the window; runs on a timer and is exposed for tests.
  cleanup(now: number = Date.now()): void {
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.hits) {
      const active = timestamps.filter((timestamp) => timestamp > windowStart);

      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  clear(): void {
    this.hits.clear();
  }

  stop(): void {
    clearInterval(this.cleanupTimer);
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

export const rateLimitMiddleware: RequestHandler = (request, response, next) => {
  const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
  const result = rateLimiter.check(key);

  response.setHeader('X-RateLimit-Limit', String(rateLimiter.limit));
  response.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  response.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    response.setHeader('Retry-After', String(result.retryAfterSeconds));
    next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later'));
    return;
  }

  next();
};
