import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);
const UPSTASH_TIMEOUT_MS = Number(process.env.UPSTASH_TIMEOUT_MS || 700);
const UPSTASH_FAILURE_THRESHOLD = Number(
  process.env.UPSTASH_FAILURE_THRESHOLD || 3,
);
const UPSTASH_RECOVERY_MS = Number(process.env.UPSTASH_RECOVERY_MS || 60000);

let redis;

const parseTtl = (args) => {
  if (args.length >= 2 && args[0] === "EX") {
    const ttl = Number(args[1]);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 300;
  }
  return 300;
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
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
};

const createMemoryRedis = () => {
  const memory = new Map();

  const getEntry = (key) => {
    const item = memory.get(key);
    if (!item) return null;

    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memory.delete(key);
      return null;
    }

    return item;
  };

  return {
    status: "ready",
    provider: "memory",
    get: async (key) => {
      const item = getEntry(key);
      return item ? item.value : null;
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
      let deleted = 0;
      for (const key of keys) {
        if (memory.delete(key)) deleted += 1;
      }
      return deleted;
    },
    scan: async (cursor, ...args) => {
      const pattern = parseScanPattern(args);
      const regex = globToRegex(pattern);
      const keys = [];

      for (const key of memory.keys()) {
        if (getEntry(key) && regex.test(key)) {
          keys.push(key);
        }
      }

      return [cursor === "0" ? "0" : String(cursor), keys];
    },
    flushdb: async () => {
      memory.clear();
      return "OK";
    },
    quit: async () => Promise.resolve(),
  };
};

const memoryRedis = createMemoryRedis();

const withTimeout = async (action, operationName) => {
  return Promise.race([
    action(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Upstash ${operationName} timeout after ${UPSTASH_TIMEOUT_MS}ms`),
        );
      }, UPSTASH_TIMEOUT_MS);
    }),
  ]);
};

if (useUpstash) {
  // Use Upstash Redis with automatic fallback to in-memory cache on failures.
  const client = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });

  let upstashDisabled = false;
  let failureCount = 0;
  let lastFailureAt = 0;

  const canUseUpstash = () => {
    if (!upstashDisabled) return true;

    if (Date.now() - lastFailureAt >= UPSTASH_RECOVERY_MS) {
      upstashDisabled = false;
      failureCount = 0;
      return true;
    }

    return false;
  };

  const recordFailure = (operationName, err) => {
    failureCount += 1;
    lastFailureAt = Date.now();

    console.error(`Upstash ${operationName} error:`, err.message);

    if (failureCount >= UPSTASH_FAILURE_THRESHOLD) {
      upstashDisabled = true;
      console.warn(
        `Upstash temporarily disabled for ${UPSTASH_RECOVERY_MS}ms. Falling back to in-memory Redis.`,
      );
    }
  };

  const runUpstash = async (operationName, action) => {
    if (!canUseUpstash()) {
      return { ok: false };
    }

    try {
      const value = await withTimeout(action, operationName);
      failureCount = 0;
      return { ok: true, value };
    } catch (err) {
      recordFailure(operationName, err);
      return { ok: false };
    }
  };

  redis = {
    status: "ready",
    provider: "upstash-with-fallback",
    get: async (key) => {
      const upstashResult = await runUpstash("GET", () => client.get(key));

      if (upstashResult.ok) {
        const value = upstashResult.value;
        if (value === null || value === undefined) return null;

        // Upstash auto-deserializes JSON, so re-serialize to string
        // so cache.service.js can JSON.parse() it as expected
        const normalized =
          typeof value === "string" ? value : JSON.stringify(value);
        await memoryRedis.set(key, normalized, "EX", 300);
        return normalized;
      }

      return memoryRedis.get(key);
    },
    set: async (key, value, ...args) => {
      const ttl = parseTtl(args);
      await memoryRedis.set(key, value, "EX", ttl);

      const upstashResult = await runUpstash("SET", () =>
        client.set(key, value, { ex: ttl }),
      );

      return upstashResult.ok ? upstashResult.value : "OK";
    },
    del: async (...keys) => {
      if (!keys.length) return 0;

      const memoryDeleted = await memoryRedis.del(...keys);
      const upstashResult = await runUpstash("DEL", () => {
        if (keys.length === 1) return client.del(keys[0]);
        return client.del(keys);
      });

      if (upstashResult.ok) {
        return upstashResult.value;
      }

      return memoryDeleted;
    },
    scan: async (cursor, ...args) => {
      const pattern = parseScanPattern(args);
      const upstashResult = await runUpstash("SCAN", () => client.keys(pattern));

      if (upstashResult.ok) {
        return ["0", upstashResult.value || []];
      }

      return memoryRedis.scan(cursor, ...args);
    },
    flushdb: async () => {
      await memoryRedis.flushdb();
      const upstashResult = await runUpstash("FLUSHDB", () => client.flushdb());
      return upstashResult.ok ? upstashResult.value : "OK";
    },
    quit: async () => {
      return Promise.resolve();
    },
  };

  console.log("Upstash Redis enabled with fail-fast fallback to memory store");
} else {
  console.warn("Upstash credentials not found. Using in-memory Redis fallback.");
  redis = memoryRedis;
}

export default redis;
