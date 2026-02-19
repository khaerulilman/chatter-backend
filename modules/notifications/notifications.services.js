import { nanoid } from "nanoid";
import {
  createNotification,
  findNotificationsByRecipient,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "./notifications.repositories.js";

/**
 * Internal helper called by other modules to create a notification.
 * Silently fails so it never breaks the main action.
 */
export const createNotificationService = async ({
  recipient_id,
  actor_id,
  type,
  entity_id = null,
}) => {
  try {
    if (recipient_id === actor_id) return; // no self-notification
    await createNotification({
      id: nanoid(),
      recipient_id,
      actor_id,
      type,
      entity_id,
    });
  } catch (err) {
    console.error("[Notification] Failed to create notification:", err.message);
  }
};

/**
 * Get all notifications for the current user.
 */
export const getNotificationsService = async (userId) => {
  return await findNotificationsByRecipient(userId);
};

/**
 * Get unread count.
 */
export const getUnreadCountService = async (userId) => {
  return await countUnreadNotifications(userId);
};

/**
 * Mark single notification as read.
 */
export const markReadService = async (notificationId, userId) => {
  await markNotificationRead(notificationId, userId);
};

/**
 * Mark all notifications as read.
 */
export const markAllReadService = async (userId) => {
  await markAllNotificationsRead(userId);
};

/**
 * Delete a notification.
 */
export const deleteNotificationService = async (notificationId, userId) => {
  await deleteNotification(notificationId, userId);
};
