import db from "../../config/db.js";

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
};

const createLike = async (likeData) => {
  const { id, user_id, post_id, created_at } = likeData;
  return await db`
    INSERT INTO likes (id, user_id, post_id, created_at)
    VALUES (${id}, ${user_id}, ${post_id}, ${created_at})
    RETURNING *
  `;
};

const countLikesByPostId = async (postId) => {
  const result = await db`
    SELECT COUNT(*) as count FROM likes WHERE post_id = ${postId}
  `;
  return parseInt(result[0].count);
};

const isPostLikedByUser = async (userId, postId) => {
  const result = await db`
    SELECT 1 FROM likes WHERE user_id = ${userId} AND post_id = ${postId} LIMIT 1
  `;
  return result.length > 0;
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
