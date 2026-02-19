import db from "../../config/db.js";

const findSavedPost = async (userId, postId) => {
  const result = await db`
    SELECT * FROM saved_posts WHERE user_id = ${userId} AND post_id = ${postId}
  `;
  return result.length > 0 ? result[0] : null;
};

const createSavedPost = async (userId, postId) => {
  return await db`
    INSERT INTO saved_posts (user_id, post_id)
    VALUES (${userId}, ${postId})
    RETURNING *
  `;
};

const deleteSavedPost = async (userId, postId) => {
  await db`DELETE FROM saved_posts WHERE user_id = ${userId} AND post_id = ${postId}`;
};

const findAllSavedPostsByUserId = async (userId, limit, offset) => {
  return await db`
    SELECT p.id, p.content, p.media_url, p.created_at, u.name AS user_name, u.username, u.profile_picture, u.id AS user_id,
           COALESCE(l.like_count, 0) AS likes, false AS "isLiked",
           sp.created_at AS saved_at
    FROM saved_posts sp
    JOIN posts p ON sp.post_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS like_count
      FROM likes
      GROUP BY post_id
    ) l ON p.id = l.post_id
    WHERE sp.user_id = ${userId}
    ORDER BY sp.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
};

const isSavedByUser = async (userId, postId) => {
  const result = await db`
    SELECT 1 FROM saved_posts WHERE user_id = ${userId} AND post_id = ${postId} LIMIT 1
  `;
  return result.length > 0;
};

export {
  findSavedPost,
  createSavedPost,
  deleteSavedPost,
  findAllSavedPostsByUserId,
  isSavedByUser,
};
