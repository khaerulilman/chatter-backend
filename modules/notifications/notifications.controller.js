import {
  getNotificationsService,
  getUnreadCountService,
  markReadService,
  markAllReadService,
  deleteNotificationService,
} from "./notifications.services.js";

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await getNotificationsService(req.user.id);
    return res.status(200).json({ data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadCountService(req.user.id);
    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// PATCH /api/notifications/:notificationId/read
export const markRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await markReadService(notificationId, req.user.id);
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await markAllReadService(req.user.id);
    return res
      .status(200)
      .json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// DELETE /api/notifications/:notificationId
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await deleteNotificationService(notificationId, req.user.id);
    return res.status(200).json({ message: "Notification deleted." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
