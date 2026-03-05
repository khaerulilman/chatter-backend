import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = upstashUrl && upstashToken;

let redis;

if (useUpstash) {
  // Use Upstash Redis
  const client = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });

  console.log("Using Upstash Redis");

  // Create a wrapper to maintain compatibility with ioredis interface
  redis = {
    status: "ready",
    get: async (key) => {
      try {
        const value = await client.get(key);
        if (value === null || value === undefined) return null;
        // Upstash auto-deserializes JSON, so re-serialize to string
        // so cache.service.js can JSON.parse() it as expected
        return typeof value === "string" ? value : JSON.stringify(value);
      } catch (err) {
        console.error(`Upstash GET error [${key}]:`, err.message);
        return null;
      }
    },
    set: async (key, value, ...args) => {
      try {
        // Handle both ioredis style: set(key, value, "EX", ttl)
        let ttl = 300; // default 5 minutes

        // Parse ioredis style arguments
        if (args.length >= 2 && args[0] === "EX") {
          ttl = args[1];
        }

        return await client.set(key, value, { ex: ttl });
      } catch (err) {
        console.error(`Upstash SET error [${key}]:`, err.message);
      }
    },
    del: async (key) => {
      try {
        return await client.del(key);
      } catch (err) {
        console.error(`Upstash DEL error [${key}]:`, err.message);
      }
    },
    scan: async (cursor, ...args) => {
      try {
        // Extract pattern and count from arguments
        let pattern = "*";
        let count = 100;

        for (let i = 0; i < args.length; i++) {
          if (args[i] === "MATCH" && args[i + 1]) {
            pattern = args[i + 1];
            i++;
          } else if (args[i] === "COUNT" && args[i + 1]) {
            count = args[i + 1];
            i++;
          }
        }

        // Use Upstash keys command as alternative to scan
        const keys = await client.keys(pattern);
        return ["0", keys]; // Return [nextCursor, keys]
      } catch (err) {
        console.error(`Upstash SCAN error:`, err.message);
        return ["0", []];
      }
    },
    flushdb: async () => {
      try {
        return await client.flushdb();
      } catch (err) {
        console.error(`Upstash FLUSHDB error:`, err.message);
      }
    },
    quit: async () => {
      console.log("Upstash Redis connection closed");
      return Promise.resolve();
    },
  };

  console.log("Upstash Redis connected successfully");
} else {
  // Fallback with mock Redis (for offline development)
  console.warn("Upstash credentials not found, using mock Redis");

  const mockCache = {};

  redis = {
    status: "ready",
    get: async (key) => {
      const item = mockCache[key];
      if (!item) return null;
      if (item.expires && item.expires < Date.now()) {
        delete mockCache[key];
        return null;
      }
      return item.value;
    },
    set: async (key, value, ...args) => {
      let ttl = 300;
      if (args.length >= 2 && args[0] === "EX") {
        ttl = args[1];
      }
      mockCache[key] = {
        value,
        expires: Date.now() + ttl * 1000,
      };
      return "OK";
    },
    del: async (key) => {
      delete mockCache[key];
      return 1;
    },
    scan: async (cursor, ...args) => {
      let pattern = "*";
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "MATCH" && args[i + 1]) {
          pattern = args[i + 1];
          break;
        }
      }

      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
      );
      const keys = Object.keys(mockCache).filter((key) => regex.test(key));
      return ["0", keys];
    },
    flushdb: async () => {
      for (const key in mockCache) {
        delete mockCache[key];
      }
      return "OK";
    },
    quit: async () => {
      return Promise.resolve();
    },
  };

  console.log("Mock Redis initialized (for development without Upstash)");
}

export default redis;
