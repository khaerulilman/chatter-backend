import redis from "../../frameworks/redis/redis.js";

const DEFAULT_TTL = 300; // 5 minutes in seconds

/**
 * Check if Redis is connected and available
 */
const isAvailable = () => redis.status === "ready";

/**
 * Get cached data by key
 * @param {string} key - Cache key
 * @returns {any|null} Parsed data or null if not found/unavailable
 */
const get = async (key) => {
  if (!isAvailable()) return null;

  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Cache GET error [${key}]:`, err.message);
    return null;
  }
};

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache (will be JSON.stringified)
 * @param {number} ttl - Time to live in seconds (default: 300)
 */
const set = async (key, data, ttl = DEFAULT_TTL) => {
  if (!isAvailable()) return;

  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    console.error(`Cache SET error [${key}]:`, err.message);
  }
};

/**
 * Delete a specific cache key
 * @param {string} key - Cache key to delete
 */
const del = async (key) => {
  if (!isAvailable()) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Cache DEL error [${key}]:`, err.message);
  }
};

/**
 * Delete all keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "posts:*")
 */
const delByPattern = async (pattern) => {
  if (!isAvailable()) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        if (typeof redis.unlink === "function") {
          await redis.unlink(...keys);
        } else {
          await redis.del(...keys);
        }
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(`Cache DEL pattern error [${pattern}]:`, err.message);
  }
};

/**
 * Atomically increment numeric cache value.
 * @param {string} key - Cache key
 * @param {number|null} ttl - Optional TTL in seconds to refresh key expiry
 * @returns {number|null} Incremented value or null when unavailable/error
 */
const incr = async (key, ttl = null) => {
  if (!isAvailable()) return null;

  try {
    const value = await redis.incr(key);

    if (Number.isFinite(ttl) && ttl > 0) {
      await redis.set(key, String(value), "EX", ttl);
    }

    return Number(value);
  } catch (err) {
    console.error(`Cache INCR error [${key}]:`, err.message);
    return null;
  }
};

/**
 * Flush all cache
 */
const flush = async () => {
  if (!isAvailable()) return;

  try {
    await redis.flushdb();
  } catch (err) {
    console.error("Cache FLUSH error:", err.message);
  }
};

export { get, set, del, delByPattern, incr, flush, isAvailable };
