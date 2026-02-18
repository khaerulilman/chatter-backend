import express from "express";
import { verifyToken } from "../../middleware/createToken.js";
import {
  getComments,
  createComment,
  getCommentById,
  deleteComment,
  getCommentStatus,
} from "./comments.controller.js";

const router = express.Router();

router.get("/:postId/count", getCommentStatus);
router.get("/:postId", getComments);
router.post("/:postId", verifyToken, createComment);
router.get("/:postId/:commentId", getCommentById);
router.delete("/:postId/:commentId", verifyToken, deleteComment);

export default router;
