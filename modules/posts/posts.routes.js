import express from "express";
import multer from "multer";
import { verifyToken } from "../../middleware/createToken.js";
import {
  getPosts,
  createPost,
  getPostById,
  deletePost,
} from "./posts.controller.js";

const router = express.Router();

// Setup Multer Storage Engine
const storage = multer.memoryStorage();
const postUpload = multer({ storage: storage });

router.get("/", getPosts);
router.get("/:postId", getPostById);

router.post(
  "/",
  verifyToken,
  postUpload.fields([{ name: "media", maxCount: 1 }]),
  createPost,
);

router.delete("/:postId", verifyToken, deletePost);

export default router;
