/**
 * Redis Cache Utility
 * 
 * A Graceful, production-ready Redis client using ioredis.
 * 
 * KEY DESIGN DECISION:
 * We use "Graceful Degradation". If the Redis server is not available 
 * (e.g., in local development), the cache functions silently fail and 
 * fall through to the actual database. This means the app NEVER crashes 
 * because of a missing Redis server.
 */

import Redis from 'ioredis';

// Default TTL (Time-To-Live) = 1 hour in seconds
export const DEFAULT_TTL = 60 * 60;

let redisClient = null;
let isRedisAvailable = false;

// Only try to connect if REDIS_URL is configured
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,        // Don't hang forever trying to connect
      connectTimeout: 3000,           // 3-second connection timeout
      lazyConnect: true,              // Don't connect until first command
      enableOfflineQueue: false,      // Don't queue commands when offline
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log('✅ Redis connected successfully.');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      console.warn(`⚠️  Redis unavailable. Falling back to MongoDB. Reason: ${err.message}`);
    });

    await redisClient.connect();
  } catch (err) {
    console.warn(`⚠️  Redis connection failed. Cache disabled. App still runs normally.`);
    isRedisAvailable = false;
  }
} else {
  console.log('ℹ️  No REDIS_URL set. Redis caching is disabled.');
}


/**
 * GET a value from cache.
 * Returns the parsed JSON value, or null if not found / cache is down.
 */
export const getCache = async (key) => {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`Cache GET failed for key "${key}":`, err.message);
    return null; // Graceful fallback
  }
};


/**
 * SET a value in the cache with a TTL.
 * Silently fails if Redis is down.
 */
export const setCache = async (key, value, ttl = DEFAULT_TTL) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.warn(`Cache SET failed for key "${key}":`, err.message);
  }
};


/**
 * DELETE one or more keys from cache (Cache Invalidation).
 * Called when data is updated to prevent serving stale data.
 * 
 * INTERVIEWER TIP: Cache Invalidation is one of the hardest problems in CS.
 * We solve it by deleting all keys matching a pattern (e.g., "courses:*")
 * whenever a course is created, updated, or deleted.
 */
export const invalidateCache = async (pattern) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    // Use SCAN instead of KEYS in production (KEYS blocks the server)
    const stream = redisClient.scanStream({ match: pattern, count: 100 });
    const pipeline = redisClient.pipeline();
    let keysFound = 0;

    stream.on('data', (keys) => {
      keys.forEach((key) => {
        pipeline.del(key);
        keysFound++;
      });
    });

    stream.on('end', async () => {
      if (keysFound > 0) {
        await pipeline.exec();
        console.log(`🗑️  Cache invalidated: ${keysFound} key(s) matching "${pattern}"`);
      }
    });
  } catch (err) {
    console.warn(`Cache INVALIDATE failed for pattern "${pattern}":`, err.message);
  }
};

export default redisClient;
