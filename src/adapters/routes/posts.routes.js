import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getPosts,
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
} from "../controllers/posts.controller.js";
import {
  likePost,
  getLikeStatus,
  getLikeCount,
} from "../controllers/likes.controller.js";
import {
  toggleSavePost,
  getSaveStatus,
  getSavedPosts,
} from "../controllers/saved.controller.js";

const router = express.Router();

// Setup Multer Storage Engine
const storage = multer.memoryStorage();
const postUpload = multer({ storage: storage });

router.get("/", getPosts);
router.get("/user/:userId", getPostsByUserId);
router.get("/saved", verifyToken, getSavedPosts);
router.get("/:postId", getPostById);

router.post(
  "/",
  verifyToken,
  postUpload.fields([{ name: "media", maxCount: 30 }]),
  createPost,
);

router.patch("/:postId/likes", verifyToken, likePost);
router.get("/:postId/likes", verifyToken, getLikeStatus);
router.get("/:postId/likes/count", getLikeCount);

router.patch("/:postId/saves", verifyToken, toggleSavePost);
router.get("/:postId/saves", verifyToken, getSaveStatus);

router.delete("/:postId", verifyToken, deletePost);

export default router;
