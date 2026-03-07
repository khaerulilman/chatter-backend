import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 120;

const invalidateLikeCaches = async (userId, postId) => {
  await cacheService.del(`likes:liked:${userId}:${postId}`);
  await cacheService.del(`likes:count:${postId}`);
  await cacheService.del(`posts:detail:${postId}`);
  await cacheService.delByPattern("posts:all:*");
  await cacheService.delByPattern("posts:user:*");
};

const findUserById = async (userId) => {
  const result = await db`SELECT * FROM users WHERE id = ${userId}`;
  return result.length > 0 ? result[0] : null;
};

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const findLike = async (userId, postId) => {
  const result = await db`
    SELECT * FROM likes WHERE user_id = ${userId} AND post_id = ${postId}
  `;
  return result.length > 0 ? result[0] : null;
};

const deleteLike = async (userId, postId) => {
  await db`DELETE FROM likes WHERE user_id = ${userId} AND post_id = ${postId}`;
  await invalidateLikeCaches(userId, postId);
};

const createLike = async (likeData) => {
  const { id, user_id, post_id, created_at } = likeData;
  const result = await db`
    INSERT INTO likes (id, user_id, post_id, created_at)
    VALUES (${id}, ${user_id}, ${post_id}, ${created_at})
    RETURNING *
  `;

  await invalidateLikeCaches(user_id, post_id);
  return result;
};

const countLikesByPostId = async (postId) => {
  const cacheKey = `likes:count:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT COUNT(*) as count FROM likes WHERE post_id = ${postId}
  `;
  const count = parseInt(result[0].count);

  await cacheService.set(cacheKey, count, CACHE_TTL);
  return count;
};

const isPostLikedByUser = async (userId, postId) => {
  const cacheKey = `likes:liked:${userId}:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT 1 FROM likes WHERE user_id = ${userId} AND post_id = ${postId} LIMIT 1
  `;
  const isLiked = result.length > 0;

  await cacheService.set(cacheKey, isLiked, CACHE_TTL);
  return isLiked;
};

export {
  findUserById,
  findPostById,
  findLike,
  deleteLike,
  createLike,
  countLikesByPostId,
  isPostLikedByUser,
};
