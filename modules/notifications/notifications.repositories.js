import db from "../../config/db.js";

/**
 * Create a new notification.
 */
export const createNotification = async ({
  id,
  recipient_id,
  actor_id,
  type,
  entity_id,
}) => {
  // Skip if actor and recipient are the same person
  if (recipient_id === actor_id) return null;

  const result = await db`
    INSERT INTO notifications (id, recipient_id, actor_id, type, entity_id)
    VALUES (${id}, ${recipient_id}, ${actor_id}, ${type}, ${entity_id ?? null})
    RETURNING *
  `;
  return result[0];
};

/**
 * Get all notifications for a user (with actor info joined).
 */
export const findNotificationsByRecipient = async (recipientId) => {
  return await db`
    SELECT
      n.id,
      n.type,
      n.entity_id,
      n.is_read,
      n.created_at,
      u.id        AS actor_id,
      u.name      AS actor_name,
      u.username  AS actor_username,
      u.profile_picture AS actor_avatar
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    WHERE n.recipient_id = ${recipientId}
    ORDER BY n.created_at DESC
    LIMIT 50
  `;
};

/**
 * Count unread notifications for a user.
 */
export const countUnreadNotifications = async (recipientId) => {
  const result = await db`
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE recipient_id = ${recipientId} AND is_read = FALSE
  `;
  return parseInt(result[0].count);
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (notificationId, recipientId) => {
  await db`
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = ${notificationId} AND recipient_id = ${recipientId}
  `;
};

/**
 * Mark ALL notifications as read for a user.
 */
export const markAllNotificationsRead = async (recipientId) => {
  await db`
    UPDATE notifications
    SET is_read = TRUE
    WHERE recipient_id = ${recipientId}
  `;
};

/**
 * Delete a notification.
 */
export const deleteNotification = async (notificationId, recipientId) => {
  await db`
    DELETE FROM notifications
    WHERE id = ${notificationId} AND recipient_id = ${recipientId}
  `;
};
