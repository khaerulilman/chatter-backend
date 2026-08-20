import redis from "../../frameworks/redis/redis.js";

const DEFAULT_TTL = 300; // 5 minutes in seconds

const isAvailable = () => redis.status === "ready";

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

const set = async (key, data, ttl = DEFAULT_TTL) => {
  if (!isAvailable()) return;

  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    console.error(`Cache SET error [${key}]:`, err.message);
  }
};

const del = async (key) => {
  if (!isAvailable()) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Cache DEL error [${key}]:`, err.message);
  }
};

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

const flush = async () => {
  if (!isAvailable()) return;

  try {
    await redis.flushdb();
  } catch (err) {
    console.error("Cache FLUSH error:", err.message);
  }
};

export { get, set, del, delByPattern, incr, flush, isAvailable };
