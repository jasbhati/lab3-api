import { describe, expect, it } from '@jest/globals';
import { SlidingWindowRateLimiter } from '../src/middleware/rateLimiter.js';
import { api } from './setup.js';

describe('SlidingWindowRateLimiter', () => {
  it('allows requests under the limit and tracks remaining count', () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);

    try {
      expect(limiter.check('client-a', 0)).toMatchObject({ allowed: true, remaining: 2 });
      expect(limiter.check('client-a', 100)).toMatchObject({ allowed: true, remaining: 1 });
      expect(limiter.check('client-a', 200)).toMatchObject({ allowed: true, remaining: 0 });
    } finally {
      limiter.stop();
    }
  });

  it('blocks requests once the limit is reached within the window', () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);

    try {
      limiter.check('client-a', 0);
      limiter.check('client-a', 100);
      const blocked = limiter.check('client-a', 200);

      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    } finally {
      limiter.stop();
    }
  });

  it('allows requests again once the window slides past the earliest hit', () => {
    const limiter = new SlidingWindowRateLimiter(1, 1000);

    try {
      limiter.check('client-a', 0);
      const stillBlocked = limiter.check('client-a', 999);
      const allowedAgain = limiter.check('client-a', 1001);

      expect(stillBlocked.allowed).toBe(false);
      expect(allowedAgain.allowed).toBe(true);
    } finally {
      limiter.stop();
    }
  });

  it('tracks requests independently per key', () => {
    const limiter = new SlidingWindowRateLimiter(1, 1000);

    try {
      expect(limiter.check('client-a', 0).allowed).toBe(true);
      expect(limiter.check('client-b', 0).allowed).toBe(true);
    } finally {
      limiter.stop();
    }
  });

  it('removes expired entries on cleanup', () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);

    try {
      limiter.check('client-a', 0);
      expect(limiter.size).toBe(1);

      limiter.cleanup(2000);

      expect(limiter.size).toBe(0);
    } finally {
      limiter.stop();
    }
  });
});

describe('rate limiting middleware', () => {
  it('sets rate limit headers on a normal request', async () => {
    const response = await api().get('/health').expect(200);

    expect(response.headers['x-ratelimit-limit']).toBe('100');
    expect(Number(response.headers['x-ratelimit-remaining'])).toBe(99);
    expect(Number(response.headers['x-ratelimit-reset'])).toBeGreaterThan(0);
  });

  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    for (let index = 0; index < 100; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await api().get('/health').expect(200);
    }

    const response = await api().get('/health').expect(429);

    expect(response.headers['retry-after']).toEqual(expect.any(String));
    expect(response.body).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
  });
});
