import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import postsRoutes from "../modules/posts/posts.routes.js";
import likesRoutes from "../modules/likes/likes.routes.js";
import commentsRoutes from "../modules/comments/comments.routes.js";

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);

// Users routes
router.use("/users", usersRoutes);

// Posts routes
router.use("/posts", postsRoutes);

// Likes routes
router.use("/likes", likesRoutes);

// Comments routes
router.use("/comments", commentsRoutes);

export default router;
