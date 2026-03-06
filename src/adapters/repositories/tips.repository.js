import db from "../../frameworks/database/db.js";

// Create a tip record
export const createTip = async ({
  id,
  sender_id,
  receiver_id,
  post_id,
  amount,
  message,
}) => {
  const result = await db`
    INSERT INTO tips (id, sender_id, receiver_id, post_id, amount, message)
    VALUES (${id}, ${sender_id}, ${receiver_id}, ${post_id}, ${amount}, ${message || null})
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Get tips received by a user (with sender info)
export const getTipsReceived = async (userId, limit = 20, offset = 0) => {
  const tips = await db`
    SELECT t.id, t.amount, t.message, t.created_at, t.post_id,
           u.id as sender_id, u.name as sender_name, u.username as sender_username, u.profile_picture as sender_profile_picture,
           p.content as post_content
    FROM tips t
    JOIN users u ON u.id = t.sender_id
    JOIN posts p ON p.id = t.post_id
    WHERE t.receiver_id = ${userId}
    ORDER BY t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return tips;
};

// Get tips sent by a user (with receiver info)
export const getTipsSent = async (userId, limit = 20, offset = 0) => {
  const tips = await db`
    SELECT t.id, t.amount, t.message, t.created_at, t.post_id,
           u.id as receiver_id, u.name as receiver_name, u.username as receiver_username, u.profile_picture as receiver_profile_picture,
           p.content as post_content
    FROM tips t
    JOIN users u ON u.id = t.receiver_id
    JOIN posts p ON p.id = t.post_id
    WHERE t.sender_id = ${userId}
    ORDER BY t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return tips;
};

// Get total tips received on a specific post
export const getTipsTotalByPostId = async (postId) => {
  const result = await db`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM tips
    WHERE post_id = ${postId}
  `;
  return Number(result[0].total);
};
