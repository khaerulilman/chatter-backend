import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);

const UPSTASH_FAILURE_THRESHOLD = Number(
  process.env.UPSTASH_FAILURE_THRESHOLD || 3,
);
const UPSTASH_RECOVERY_MS = Number(process.env.UPSTASH_RECOVERY_MS || 60000);

const DEFAULT_TTL_SECONDS = 300;
const INCR_MEMORY_TTL_SECONDS = 86400;

let redis;

const parseTtl = (args) => {
  if (args.length >= 2 && args[0] === "EX") {
    const ttl = Number(args[1]);

    if (Number.isFinite(ttl) && ttl > 0) {
      return ttl;
    }
  }

  return DEFAULT_TTL_SECONDS;
};

const parseScanPattern = (args) => {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "MATCH" && args[i + 1]) {
      return args[i + 1];
    }
  }

  return "*";
};

const globToRegex = (pattern) => {
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  return new RegExp(`^${escapedPattern}$`);
};

const createMemoryRedis = () => {
  const memory = new Map();

  const getEntry = (key) => {
    const item = memory.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memory.delete(key);
      return null;
    }

    return item;
  };

  const deleteKeys = (...keys) => {
    let deletedCount = 0;

    for (const key of keys) {
      const deleted = memory.delete(key);

      if (deleted) {
        deletedCount += 1;
      }
    }

    return deletedCount;
  };

  return {
    status: "ready",
    provider: "memory",

    get: async (key) => {
      const item = getEntry(key);

      if (!item) {
        return null;
      }

      return item.value;
    },

    set: async (key, value, ...args) => {
      const ttl = parseTtl(args);

      memory.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });

      return "OK";
    },

    del: async (...keys) => {
      return deleteKeys(...keys);
    },

    unlink: async (...keys) => {
      return deleteKeys(...keys);
    },

    incr: async (key) => {
      const currentEntry = getEntry(key);
      const currentValue = Number(currentEntry?.value ?? "0");

      let nextValue = 1;
      if (Number.isFinite(currentValue)) {
        nextValue = currentValue + 1;
      }

      memory.set(key, {
        value: String(nextValue),
        expiresAt: null,
      });

      return nextValue;
    },

    scan: async (cursor, ...args) => {
      const pattern = parseScanPattern(args);
      const regex = globToRegex(pattern);
      const keys = [];

      for (const key of memory.keys()) {
        const item = getEntry(key);

        if (item && regex.test(key)) {
          keys.push(key);
        }
      }

      if (cursor === "0") {
        return ["0", keys];
      }

      return [String(cursor), keys];
    },

    flushdb: async () => {
      memory.clear();
      return "OK";
    },

    quit: async () => {
      return undefined;
    },
  };
};

const memoryRedis = createMemoryRedis();

if (useUpstash) {
  const client = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });

  let upstashDisabled = false;
  let failureCount = 0;
  let lastFailureAt = 0;

  const canUseUpstash = () => {
    if (!upstashDisabled) {
      return true;
    }

    const disabledFor = Date.now() - lastFailureAt;

    if (disabledFor >= UPSTASH_RECOVERY_MS) {
      upstashDisabled = false;
      failureCount = 0;
      return true;
    }

    return false;
  };

  const markUpstashSuccess = () => {
    failureCount = 0;
  };

  const markUpstashFailure = (operationName, error) => {
    failureCount += 1;
    lastFailureAt = Date.now();

    console.error(`Upstash ${operationName} error:`, error.message);

    if (failureCount >= UPSTASH_FAILURE_THRESHOLD) {
      upstashDisabled = true;
      console.warn(
        `Upstash temporarily disabled for ${UPSTASH_RECOVERY_MS}ms. Falling back to in-memory Redis.`,
      );
    }
  };

  redis = {
    status: "ready",
    provider: "upstash-with-fallback",

    get: async (key) => {
      if (canUseUpstash()) {
        try {
          const value = await client.get(key);
          markUpstashSuccess();

          if (value === null || value === undefined) {
            return null;
          }

          // Upstash may auto-deserialize JSON. The cache service expects a
          // string so it can call JSON.parse() consistently.
          let normalizedValue = value;
          if (typeof value !== "string") {
            normalizedValue = JSON.stringify(value);
          }

          await memoryRedis.set(key, normalizedValue, "EX", DEFAULT_TTL_SECONDS);
          return normalizedValue;
        } catch (error) {
          markUpstashFailure("GET", error);
        }
      }

      return await memoryRedis.get(key);
    },

    set: async (key, value, ...args) => {
      const ttl = parseTtl(args);

      await memoryRedis.set(key, value, "EX", ttl);

      if (canUseUpstash()) {
        try {
          const result = await client.set(key, value, { ex: ttl });
          markUpstashSuccess();
          return result;
        } catch (error) {
          markUpstashFailure("SET", error);
        }
      }

      return "OK";
    },

    del: async (...keys) => {
      if (keys.length === 0) {
        return 0;
      }

      const memoryDeletedCount = await memoryRedis.del(...keys);

      if (canUseUpstash()) {
        try {
          const deletedCount =
            keys.length === 1
              ? await client.del(keys[0])
              : await client.del(keys);

          markUpstashSuccess();
          return deletedCount;
        } catch (error) {
          markUpstashFailure("DEL", error);
        }
      }

      return memoryDeletedCount;
    },

    unlink: async (...keys) => {
      if (keys.length === 0) {
        return 0;
      }

      const memoryDeletedCount = await memoryRedis.unlink(...keys);

      if (canUseUpstash()) {
        try {
          let deletedCount;

          if (typeof client.unlink === "function") {
            deletedCount =
              keys.length === 1
                ? await client.unlink(keys[0])
                : await client.unlink(keys);
          } else {
            deletedCount =
              keys.length === 1
                ? await client.del(keys[0])
                : await client.del(keys);
          }

          markUpstashSuccess();
          return deletedCount;
        } catch (error) {
          markUpstashFailure("UNLINK", error);
        }
      }

      return memoryDeletedCount;
    },

    incr: async (key) => {
      const memoryValue = await memoryRedis.incr(key);

      if (canUseUpstash()) {
        try {
          const upstashValue = await client.incr(key);
          markUpstashSuccess();

          const normalizedValue = Number(upstashValue);

          if (Number.isFinite(normalizedValue)) {
            await memoryRedis.set(
              key,
              String(normalizedValue),
              "EX",
              INCR_MEMORY_TTL_SECONDS,
            );
            return normalizedValue;
          }
        } catch (error) {
          markUpstashFailure("INCR", error);
        }
      }

      return memoryValue;
    },

    scan: async (cursor, ...args) => {
      const pattern = parseScanPattern(args);

      if (canUseUpstash()) {
        try {
          const keys = await client.keys(pattern);
          markUpstashSuccess();
          return ["0", keys || []];
        } catch (error) {
          markUpstashFailure("SCAN", error);
        }
      }

      return await memoryRedis.scan(cursor, ...args);
    },

    flushdb: async () => {
      await memoryRedis.flushdb();

      if (canUseUpstash()) {
        try {
          const result = await client.flushdb();
          markUpstashSuccess();
          return result;
        } catch (error) {
          markUpstashFailure("FLUSHDB", error);
        }
      }

      return "OK";
    },

    quit: async () => {
      return undefined;
    },
  };

  console.log("Upstash Redis enabled with fail-fast fallback to memory store");
} else {
  console.warn(
    "Upstash credentials not found. Using in-memory Redis fallback.",
  );
  redis = memoryRedis;
}

export default redis;
