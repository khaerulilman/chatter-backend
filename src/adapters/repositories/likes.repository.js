import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 120;
const VERSION_TTL = 86400;
const DELAYED_INVALIDATION_MS = 250;

const getLikeVersionKey = (postId) => `likes:version:${postId}`;
const getCountCacheKey = (postId, version) =>
  `likes:count:${postId}:v${version}`;
const getLikedCacheKey = (userId, postId, version) =>
  `likes:liked:${userId}:${postId}:v${version}`;

const runInBackground = (promise, taskName) => {
  void promise.catch((err) => {
    console.error(
      `[likes.repository] background task failed: ${taskName}`,
      err,
    );
  });
};

const getPostCacheVersion = async (postId) => {
  const version = await cacheService.get(getLikeVersionKey(postId));
  const parsed = Number(version);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const bumpPostCacheVersion = async (postId) => {
  const next = await cacheService.incr(getLikeVersionKey(postId), VERSION_TTL);
  const parsed = Number(next);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const invalidateLikeCaches = async (userId, postId) => {
  const currentVersion = await getPostCacheVersion(postId);
  await cacheService.del(getLikedCacheKey(userId, postId, currentVersion));
  await cacheService.del(getCountCacheKey(postId, currentVersion));
  await cacheService.del(`posts:detail:${postId}`);
  await cacheService.delByPattern("posts:all:*");
  await cacheService.delByPattern("posts:user:*");
};

const scheduleDelayedInvalidation = (userId, postId) => {
  const timer = setTimeout(() => {
    runInBackground(
      invalidateLikeCaches(userId, postId),
      "delayed like cache invalidation",
    );
  }, DELAYED_INVALIDATION_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
};

const findLike = async (userId, postId) => {
  const result = await db`
    SELECT * FROM likes WHERE user_id = ${userId} AND post_id = ${postId}
  `;
  return result.length > 0 ? result[0] : null;
};

const deleteLike = async (userId, postId) => {
  await db`DELETE FROM likes WHERE user_id = ${userId} AND post_id = ${postId}`;
  await bumpPostCacheVersion(postId);
  runInBackground(
    invalidateLikeCaches(userId, postId),
    "deleteLike invalidation",
  );
  scheduleDelayedInvalidation(userId, postId);
};

const createLike = async (likeData) => {
  const { id, user_id, post_id, created_at } = likeData;
  const result = await db`
    INSERT INTO likes (id, user_id, post_id, created_at)
    VALUES (${id}, ${user_id}, ${post_id}, ${created_at})
    RETURNING *
  `;

  await bumpPostCacheVersion(post_id);
  runInBackground(
    invalidateLikeCaches(user_id, post_id),
    "createLike invalidation",
  );
  scheduleDelayedInvalidation(user_id, post_id);
  return result;
};

const countLikesByPostId = async (postId) => {
  const version = await getPostCacheVersion(postId);
  const cacheKey = getCountCacheKey(postId, version);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT COUNT(*) as count FROM likes WHERE post_id = ${postId}
  `;
  const count = parseInt(result[0].count);

  runInBackground(
    cacheService.set(cacheKey, count, CACHE_TTL),
    "cache likes count",
  );
  return count;
};

const isPostLikedByUser = async (userId, postId) => {
  const version = await getPostCacheVersion(postId);
  const cacheKey = getLikedCacheKey(userId, postId, version);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT 1 FROM likes WHERE user_id = ${userId} AND post_id = ${postId} LIMIT 1
  `;
  const isLiked = result.length > 0;

  runInBackground(
    cacheService.set(cacheKey, isLiked, CACHE_TTL),
    "cache like status",
  );
  return isLiked;
};

export {
  findLike,
  deleteLike,
  createLike,
  countLikesByPostId,
  isPostLikedByUser,
};
