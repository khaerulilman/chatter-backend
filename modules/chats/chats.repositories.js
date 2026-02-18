import db from "../../config/db.js";

// ─── Conversations ────────────────────────────────────────────────

export const createConversation = async (conversationId, userIdA, userIdB) => {
  await db`
    INSERT INTO conversations (id)
    VALUES (${conversationId})
  `;

  await db`
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES
      (${conversationId}, ${userIdA}),
      (${conversationId}, ${userIdB})
  `;

  const result = await db`
    SELECT * FROM conversations WHERE id = ${conversationId}
  `;
  return result[0];
};

// Find an existing private conversation between exactly two users
export const findConversationBetween = async (userIdA, userIdB) => {
  const result = await db`
    SELECT c.id, c.created_at
    FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ${userIdA}
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ${userIdB}
  `;
  return result.length > 0 ? result[0] : null;
};

// Get all conversations for a user (with the other member's info)
export const findConversationsByUserId = async (userId) => {
  return await db`
    SELECT
      c.id AS conversation_id,
      c.created_at,
      u.id AS other_user_id,
      u.name AS other_user_name,
      u.profile_picture AS other_user_avatar,
      last_msg.content AS last_message,
      last_msg.created_at AS last_message_at
    FROM conversations c
    JOIN conversation_members my_cm ON my_cm.conversation_id = c.id AND my_cm.user_id = ${userId}
    JOIN conversation_members other_cm ON other_cm.conversation_id = c.id AND other_cm.user_id != ${userId}
    JOIN users u ON u.id = other_cm.user_id
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) last_msg ON TRUE
    ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC
  `;
};

export const findConversationById = async (conversationId) => {
  const result = await db`
    SELECT * FROM conversations WHERE id = ${conversationId}
  `;
  return result.length > 0 ? result[0] : null;
};

// Check if a user is a member of a conversation
export const isConversationMember = async (conversationId, userId) => {
  const result = await db`
    SELECT 1 FROM conversation_members
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  return result.length > 0;
};

// ─── Messages ─────────────────────────────────────────────────────

export const createMessage = async (messageData) => {
  const { id, conversation_id, sender_id, content, media_url } = messageData;

  if (media_url) {
    const result = await db`
      INSERT INTO messages (id, conversation_id, sender_id, content, media_url)
      VALUES (${id}, ${conversation_id}, ${sender_id}, ${content ?? null}, ${media_url})
      RETURNING *
    `;
    return result[0];
  }

  const result = await db`
    INSERT INTO messages (id, conversation_id, sender_id, content)
    VALUES (${id}, ${conversation_id}, ${sender_id}, ${content})
    RETURNING *
  `;
  return result[0];
};

export const findMessagesByConversationId = async (
  conversationId,
  limit,
  offset,
) => {
  return await db`
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.media_url,
      m.created_at,
      u.name AS sender_name,
      u.profile_picture AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
};

export const findUserById = async (userId) => {
  const result = await db`SELECT 1 FROM users WHERE id = ${userId} LIMIT 1`;
  return result.length > 0;
};
