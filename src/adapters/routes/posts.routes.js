import express from "express";
import multer from "multer";
import { verifyToken, optionalAuth } from "../middleware/auth.middleware.js";
import {
  getPosts,
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
  purchasePost,
  getPurchaseActivity,
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

router.get("/", optionalAuth, getPosts);
router.get("/user/:userId", optionalAuth, getPostsByUserId);
router.get("/saved", verifyToken, getSavedPosts);
router.get("/purchases/activity", verifyToken, getPurchaseActivity);
router.get("/:postId", optionalAuth, getPostById);

router.post(
  "/",
  verifyToken,
  postUpload.fields([
    { name: "media", maxCount: 30 },
    { name: "hidden_media", maxCount: 30 },
  ]),
  createPost,
);

router.patch("/:postId/likes", verifyToken, likePost);
router.get("/:postId/likes", verifyToken, getLikeStatus);
router.get("/:postId/likes/count", getLikeCount);

router.patch("/:postId/saves", verifyToken, toggleSavePost);
router.get("/:postId/saves", verifyToken, getSaveStatus);

router.post("/:postId/purchase", verifyToken, purchasePost);

router.delete("/:postId", verifyToken, deletePost);

export default router;
