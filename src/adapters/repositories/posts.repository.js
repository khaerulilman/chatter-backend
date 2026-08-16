import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 300;

const findAllPosts = async (limit, offset) => {
  const cacheKey = `posts:all:${limit}:${offset}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const posts = await db`
    SELECT p.id, p.content, p.media_url, p.media_urls, p.created_at,
           p.is_follower_only, p.hidden_content, p.hidden_media_urls,
           p.is_paid, p.price, p.comments_disabled,
           u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE((
             SELECT COUNT(*)::int
             FROM likes lx
             WHERE lx.post_id = p.id
           ), 0) as likes,
           false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
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
  const {
    id,
    user_id,
    content,
    media_url,
    media_urls,
    media_fileids,
    is_follower_only,
    hidden_content,
    hidden_media_urls,
    hidden_media_fileids,
    is_paid,
    price,
    comments_disabled,
  } = postData;

  const result = await db`
    INSERT INTO posts (
      id, user_id, content, media_url, media_urls, media_fileids,
      is_follower_only, hidden_content, hidden_media_urls, hidden_media_fileids,
      is_paid, price, comments_disabled
    )
    VALUES (
      ${id}, ${user_id}, ${content},
      ${media_url || null},
      ${media_urls ? JSON.stringify(media_urls) : null},
      ${media_fileids ? JSON.stringify(media_fileids) : null},
      ${is_follower_only || false},
      ${hidden_content || null},
      ${hidden_media_urls ? JSON.stringify(hidden_media_urls) : null},
      ${hidden_media_fileids ? JSON.stringify(hidden_media_fileids) : null},
      ${is_paid || false},
      ${price || null},
      ${comments_disabled || false}
    )
    RETURNING *
  `;

  await cacheService.delByPattern("posts:all:*");
  await cacheService.delByPattern(`posts:user:${user_id}:*`);

  return result;
};

const findPostsByUserId = async (userId, limit, offset) => {
  const cacheKey = `posts:user:${userId}:${limit}:${offset}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const posts = await db`
    SELECT p.id, p.content, p.media_url, p.media_urls, p.created_at,
           p.is_follower_only, p.hidden_content, p.hidden_media_urls,
           p.is_paid, p.price, p.comments_disabled,
           u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE((
             SELECT COUNT(*)::int
             FROM likes lx
             WHERE lx.post_id = p.id
           ), 0) as likes,
           false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
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
    SELECT p.id, p.content, p.media_url, p.media_urls, p.created_at,
           p.is_follower_only, p.hidden_content, p.hidden_media_urls,
           p.is_paid, p.price, p.comments_disabled,
           u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE((
             SELECT COUNT(*)::int
             FROM likes lx
             WHERE lx.post_id = p.id
           ), 0) as likes,
           false as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
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

const getMediaFileidsByPostId = async (postId) => {
  const result =
    await db`SELECT media_fileids, hidden_media_fileids FROM posts WHERE id = ${postId}`;
  if (result.length === 0) return [];
  const { media_fileids, hidden_media_fileids } = result[0];
  const pub = Array.isArray(media_fileids) ? media_fileids : [];
  const hidden = Array.isArray(hidden_media_fileids)
    ? hidden_media_fileids
    : [];
  return [...pub, ...hidden];
};

const checkHasPurchased = async (userId, postId) => {
  const result = await db`
    SELECT 1 FROM post_purchases
    WHERE user_id = ${userId} AND post_id = ${postId}
    LIMIT 1
  `;
  return result.length > 0;
};

const createPurchase = async ({ id, userId, postId, amount }) => {
  const result = await db`
    INSERT INTO post_purchases (id, user_id, post_id, amount)
    VALUES (${id}, ${userId}, ${postId}, ${amount})
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Get purchases where user is the post owner (income)
const getPurchasesReceived = async (userId, limit = 20, offset = 0) => {
  return await db`
    SELECT pp.id, pp.amount, pp.created_at, pp.post_id,
           u.id AS buyer_id, u.name AS buyer_name, u.username AS buyer_username, u.profile_picture AS buyer_profile_picture,
           p.content AS post_content
    FROM post_purchases pp
    JOIN posts p ON p.id = pp.post_id
    JOIN users u ON u.id = pp.user_id
    WHERE p.user_id = ${userId}
    ORDER BY pp.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
};

// Get purchases made by user (spending)
const getPurchasesSent = async (userId, limit = 20, offset = 0) => {
  return await db`
    SELECT pp.id, pp.amount, pp.created_at, pp.post_id,
           u.id AS seller_id, u.name AS seller_name, u.username AS seller_username, u.profile_picture AS seller_profile_picture,
           p.content AS post_content
    FROM post_purchases pp
    JOIN posts p ON p.id = pp.post_id
    JOIN users u ON u.id = p.user_id
    WHERE pp.user_id = ${userId}
    ORDER BY pp.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
};

export {
  findAllPosts,
  findPostById,
  createPost,
  findPostsByUserId,
  getPostByIdWithUser,
  deletePostById,
  getMediaFileidsByPostId,
  checkHasPurchased,
  createPurchase,
  getPurchasesReceived,
  getPurchasesSent,
};
