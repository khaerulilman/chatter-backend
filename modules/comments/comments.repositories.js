import db from "../../config/db.js";

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const findCommentsByPostId = async (postId) => {
  return await db`
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
};

const createComment = async (commentData) => {
  const { id, user_id, post_id, content, created_at } = commentData;
  return await db`
    INSERT INTO comments (id, user_id, post_id, content, created_at) 
    VALUES (${id}, ${user_id}, ${post_id}, ${content}, ${created_at})
    RETURNING *
  `;
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
  return await db`DELETE FROM comments WHERE id = ${commentId} RETURNING *`;
};

export {
  findPostById,
  findCommentsByPostId,
  createComment,
  findCommentById,
  getCommentByIdWithUser,
  deleteCommentById,
};
