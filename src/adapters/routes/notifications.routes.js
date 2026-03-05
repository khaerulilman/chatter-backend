import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from "../controllers/notifications.controller.js";

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

// GET /api/notifications
router.get("/", getNotifications);

// GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// PATCH /api/notifications/read-all
router.patch("/read-all", markAllRead);

// PATCH /api/notifications/:notificationId/read
router.patch("/:notificationId/read", markRead);

// DELETE /api/notifications/:notificationId
router.delete("/:notificationId", deleteNotification);

export default router;
