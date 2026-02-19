import db from "../../config/db.js";

const findAllPosts = async (limit, offset) => {
  return await db`
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
};

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const createPost = async (postData) => {
  const { id, user_id, content, media_url } = postData;

  if (media_url) {
    return await db`
      INSERT INTO posts (id, user_id, content, media_url)
      VALUES (${id}, ${user_id}, ${content}, ${media_url})
      RETURNING *
    `;
  } else {
    return await db`
      INSERT INTO posts (id, user_id, content)
      VALUES (${id}, ${user_id}, ${content})
      RETURNING *
    `;
  }
};

const findUserById = async (userId) => {
  const result = await db`SELECT 1 FROM users WHERE id = ${userId} LIMIT 1`;
  return result.length > 0;
};

const findPostsByUserId = async (userId, limit, offset) => {
  return await db`
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
};

const getPostByIdWithUser = async (postId) => {
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
  return result.length > 0 ? result[0] : null;
};

const deletePostById = async (postId) => {
  return await db`DELETE FROM posts WHERE id = ${postId} RETURNING *`;
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
