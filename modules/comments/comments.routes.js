import express from "express";
import { verifyToken } from "../../middleware/createToken.js";
import {
  getComments,
  createComment,
  getCommentById,
  deleteComment,
} from "./comments.controller.js";

const router = express.Router();

router.get("/:postId", verifyToken, getComments);
router.post("/:postId", verifyToken, createComment);
router.get("/:postId/:commentId", verifyToken, getCommentById);
router.delete("/:postId/:commentId", verifyToken, deleteComment);

export default router;
