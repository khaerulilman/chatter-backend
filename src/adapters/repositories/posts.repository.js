import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 300;

const findAllPosts = async (limit, offset) => {
  const cacheKey = `posts:all:${limit}:${offset}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const posts = await db`
    SELECT p.id, p.content, p.media_url, p.created_at, u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE(l.like_count, 0) as likes, false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as like_count 
      FROM likes 
      GROUP BY post_id
    ) l ON p.id = l.post_id
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  await cacheService.set(cacheKey, posts, CACHE_TTL);
  return posts;
};

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const createPost = async (postData) => {
  const { id, user_id, content, media_url } = postData;

  let result;
  if (media_url) {
    result = await db`
      INSERT INTO posts (id, user_id, content, media_url)
      VALUES (${id}, ${user_id}, ${content}, ${media_url})
      RETURNING *
    `;
  } else {
    result = await db`
      INSERT INTO posts (id, user_id, content)
      VALUES (${id}, ${user_id}, ${content})
      RETURNING *
    `;
  }

  await cacheService.delByPattern("posts:all:*");
  await cacheService.delByPattern(`posts:user:${user_id}:*`);

  return result;
};

const findUserById = async (userId) => {
  const result = await db`SELECT 1 FROM users WHERE id = ${userId} LIMIT 1`;
  return result.length > 0;
};

const findPostsByUserId = async (userId, limit, offset) => {
  const cacheKey = `posts:user:${userId}:${limit}:${offset}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const posts = await db`
    SELECT p.id, p.content, p.media_url, p.created_at, u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE(l.like_count, 0) as likes, false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as like_count 
      FROM likes 
      GROUP BY post_id
    ) l ON p.id = l.post_id
    WHERE p.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  await cacheService.set(cacheKey, posts, CACHE_TTL);
  return posts;
};

const getPostByIdWithUser = async (postId) => {
  const cacheKey = `posts:detail:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const result = await db`
    SELECT p.id, p.content, p.media_url, p.created_at, u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE(l.like_count, 0) as likes, false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as like_count 
      FROM likes 
      GROUP BY post_id
    ) l ON p.id = l.post_id
    WHERE p.id = ${postId}
  `;
  const post = result.length > 0 ? result[0] : null;

  if (post) {
    await cacheService.set(cacheKey, post, CACHE_TTL);
  }
  return post;
};

const deletePostById = async (postId) => {
  const result = await db`DELETE FROM posts WHERE id = ${postId} RETURNING *`;

  if (result.length > 0) {
    const userId = result[0].user_id;
    await cacheService.del(`posts:detail:${postId}`);
    await cacheService.delByPattern("posts:all:*");
    await cacheService.delByPattern(`posts:user:${userId}:*`);
    await cacheService.del(`comments:post:${postId}`);
    await cacheService.del(`comments:count:${postId}`);
  }

  return result;
};

export {
  findAllPosts,
  findPostById,
  createPost,
  findUserById,
  findPostsByUserId,
  getPostByIdWithUser,
  deletePostById,
};
