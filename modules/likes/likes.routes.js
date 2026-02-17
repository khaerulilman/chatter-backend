import express from "express";
import { verifyToken } from "../../middleware/createToken.js";
import { likePost } from "./likes.controller.js";

const router = express.Router();

router.patch("/", verifyToken, likePost);

export default router;
