import express from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import postsRoutes from "./posts.routes.js";
import commentsRoutes from "./comments.routes.js";
import chatsRoutes from "./chats.routes.js";
import followsRoutes from "./follows.routes.js";
import notificationsRoutes from "./notifications.routes.js";

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);

// Users routes
router.use("/users", usersRoutes);

// Posts routes (includes likes functionality)
router.use("/posts", postsRoutes);

// Comments routes
router.use("/comments", commentsRoutes);

// Chats routes
router.use("/chats", chatsRoutes);

// Follows routes
router.use("/follows", followsRoutes);

// Notifications routes
router.use("/notifications", notificationsRoutes);

export default router;
