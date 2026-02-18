import express from "express";
import multer from "multer";
import { verifyToken } from "../../middleware/createToken.js";
import {
  getPosts,
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
} from "./posts.controller.js";
import { likePost, getLikeStatus } from "../likes/likes.controller.js";

const router = express.Router();

// Setup Multer Storage Engine
const storage = multer.memoryStorage();
const postUpload = multer({ storage: storage });

router.get("/", getPosts);
router.get("/user/:userId", getPostsByUserId);
router.get("/:postId", getPostById);

router.post(
  "/",
  verifyToken,
  postUpload.fields([{ name: "media", maxCount: 1 }]),
  createPost,
);

router.patch("/:postId/likes", verifyToken, likePost);
router.get("/:postId/likes", verifyToken, getLikeStatus);

router.delete("/:postId", verifyToken, deletePost);

export default router;
