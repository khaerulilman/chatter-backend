import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import postsRoutes from "../modules/posts/posts.routes.js";
import commentsRoutes from "../modules/comments/comments.routes.js";
import chatsRoutes from "../modules/chats/chats.routes.js";

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

export default router;
