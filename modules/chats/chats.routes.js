import express from "express";
import multer from "multer";
import { verifyToken } from "../../middleware/createToken.js";
import {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
} from "./chats.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─── Conversations ────────────────────────────────────────────────

// GET  /chats/conversations          → list my conversations
router.get("/conversations", verifyToken, getMyConversations);

// POST /chats/conversations          → get or create conversation with a user
router.post("/conversations", verifyToken, getOrCreateConversation);

// ─── Messages ─────────────────────────────────────────────────────

// GET  /chats/conversations/:conversationId/messages   → get messages (paginated)
router.get("/conversations/:conversationId/messages", verifyToken, getMessages);

// POST /chats/conversations/:conversationId/messages   → send a message (with optional image)
router.post(
  "/conversations/:conversationId/messages",
  verifyToken,
  upload.single("media"),
  sendMessage,
);

export default router;
