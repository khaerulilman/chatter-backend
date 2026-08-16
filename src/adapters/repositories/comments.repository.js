import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 300;

const findCommentsByPostId = async (postId) => {
  const cacheKey = `comments:post:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const comments = await db`
    SELECT 
      comments.id,
      comments.content,
      comments.created_at,
      users.id AS user_id,
      users.name AS user_name,
      users.profile_picture AS user_profile_picture
    FROM comments
    INNER JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ${postId}
    ORDER BY comments.created_at DESC
  `;

  await cacheService.set(cacheKey, comments, CACHE_TTL);
  return comments;
};

const createComment = async (commentData) => {
  const { id, user_id, post_id, content, created_at } = commentData;
  const result = await db`
    INSERT INTO comments (id, user_id, post_id, content, created_at) 
    VALUES (${id}, ${user_id}, ${post_id}, ${content}, ${created_at})
    RETURNING *
  `;

  await cacheService.del(`comments:post:${post_id}`);
  await cacheService.del(`comments:count:${post_id}`);

  return result;
};

const findCommentById = async (commentId) => {
  const result = await db`SELECT * FROM comments WHERE id = ${commentId}`;
  return result.length > 0 ? result[0] : null;
};

const getCommentByIdWithUser = async (commentId) => {
  const result = await db`
    SELECT 
      comments.id,
      comments.content,
      comments.created_at,
      comments.post_id,
      users.id AS user_id,
      users.name AS user_name,
      users.profile_picture AS user_profile_picture
    FROM comments
    INNER JOIN users ON comments.user_id = users.id
    WHERE comments.id = ${commentId}
  `;
  return result.length > 0 ? result[0] : null;
};

const deleteCommentById = async (commentId) => {
  const result =
    await db`DELETE FROM comments WHERE id = ${commentId} RETURNING *`;

  if (result.length > 0) {
    const postId = result[0].post_id;
    await cacheService.del(`comments:post:${postId}`);
    await cacheService.del(`comments:count:${postId}`);
  }

  return result;
};

const countCommentsByPostId = async (postId) => {
  const cacheKey = `comments:count:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT COUNT(*) as count FROM comments WHERE post_id = ${postId}
  `;
  const count = parseInt(result[0].count);

  await cacheService.set(cacheKey, count, CACHE_TTL);
  return count;
};

export {
  findCommentsByPostId,
  createComment,
  findCommentById,
  getCommentByIdWithUser,
  deleteCommentById,
  countCommentsByPostId,
};
