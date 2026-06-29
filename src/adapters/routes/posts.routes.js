import express from "express";
import multer from "multer";
import { verifyToken, optionalAuth } from "../middleware/auth.middleware.js";
import { wrapAsync } from "../middleware/async-error.middleware.js";
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

router.get("/", optionalAuth, wrapAsync(getPosts));
router.get("/user/:userId", optionalAuth, wrapAsync(getPostsByUserId));
router.get("/saved", verifyToken, wrapAsync(getSavedPosts));
router.get("/purchases/activity", verifyToken, wrapAsync(getPurchaseActivity));
router.get("/:postId", optionalAuth, wrapAsync(getPostById));

router.post(
  "/",
  verifyToken,
  postUpload.fields([
    { name: "media", maxCount: 30 },
    { name: "hidden_media", maxCount: 30 },
  ]),
  wrapAsync(createPost),
);

router.patch("/:postId/likes", verifyToken, wrapAsync(likePost));
router.get("/:postId/likes", verifyToken, wrapAsync(getLikeStatus));
router.get("/:postId/likes/count", wrapAsync(getLikeCount));

router.patch("/:postId/saves", verifyToken, wrapAsync(toggleSavePost));
router.get("/:postId/saves", verifyToken, wrapAsync(getSaveStatus));

router.post("/:postId/purchase", verifyToken, wrapAsync(purchasePost));

router.delete("/:postId", verifyToken, wrapAsync(deletePost));

export default router;
