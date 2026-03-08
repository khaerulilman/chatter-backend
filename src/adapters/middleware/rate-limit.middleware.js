import rateLimit from "express-rate-limit";
import redis from "../../frameworks/redis/redis.js";

/**
 * Custom Redis store for express-rate-limit that uses the existing Redis wrapper.
 * Compatible with both Upstash and ioredis instances.
 */
class RedisStore {
  constructor({ prefix = "rl:", windowMs }) {
    this.prefix = prefix;
    this.windowSec = Math.ceil(windowMs / 1000);
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const redisKey = this._key(key);
    try {
      const raw = await redis.get(redisKey);
      const now = Date.now();
      const windowMs = this.windowSec * 1000;

      let hits = 1;
      let resetTime;

      if (raw) {
        const data = JSON.parse(raw);
        hits = data.hits + 1;
        resetTime = new Date(data.resetTime);
        // Use remaining TTL, NOT the full window — prevents counter from never resetting
        const remainingSec = Math.ceil((data.resetTime - now) / 1000);
        if (remainingSec > 0) {
          await redis.set(
            redisKey,
            JSON.stringify({ hits, resetTime: data.resetTime }),
            "EX",
            remainingSec,
          );
        }
      } else {
        resetTime = new Date(now + windowMs);
        await redis.set(
          redisKey,
          JSON.stringify({ hits, resetTime: resetTime.getTime() }),
          "EX",
          this.windowSec,
        );
      }

      return { totalHits: hits, resetTime };
    } catch (err) {
      console.error("Rate limit Redis error:", err.message);
      // Fail open: allow request if Redis is unavailable
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + this.windowSec * 1000),
      };
    }
  }

  async decrement(key) {
    const redisKey = this._key(key);
    try {
      const raw = await redis.get(redisKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.hits > 1) {
        data.hits -= 1;
        const ttl = Math.ceil((data.resetTime - Date.now()) / 1000);
        if (ttl > 0) {
          await redis.set(redisKey, JSON.stringify(data), "EX", ttl);
        }
      }
    } catch (err) {
      console.error("Rate limit Redis decrement error:", err.message);
    }
  }

  async resetKey(key) {
    const redisKey = this._key(key);
    try {
      await redis.del(redisKey);
    } catch (err) {
      console.error("Rate limit Redis resetKey error:", err.message);
    }
  }
}

// -----------------------------------------------------------------------
// Limiter factories
// -----------------------------------------------------------------------

/**
 * General API rate limiter: 300 requests per 5 minutes per IP.
 * Only counts failed requests — normal browsing never triggers this.
 */
export const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ prefix: "rl:general:", windowMs: 5 * 60 * 1000 }),
  message: {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  skipSuccessfulRequests: true, // Only count failed (4xx/5xx) requests
});

/**
 * Auth rate limiter: 15 requests per 10 minutes per IP.
 * Applied to login and register endpoints to prevent brute-force.
 */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ prefix: "rl:auth:", windowMs: 10 * 60 * 1000 }),
  message: {
    status: 429,
    message:
      "Too many authentication attempts. Please try again in 10 minutes.",
  },
  skipSuccessfulRequests: true, // Successful logins don't count against the limit
});

/**
 * Password / sensitive action limiter: 10 requests per 10 minutes per IP.
 * Applied to password reset, email verification, etc.
 */
export const sensitiveActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ prefix: "rl:sensitive:", windowMs: 10 * 60 * 1000 }),
  message: {
    status: 429,
    message: "Too many sensitive requests. Please try again in 10 minutes.",
  },
  skipSuccessfulRequests: false,
});
