import {
  getOrCreateConversationService,
  getMyConversationsService,
  sendMessageService,
  getMessagesService,
} from "./chats.services.js";

// ─── Conversations ────────────────────────────────────────────────

/**
 * POST /chats/conversations
 * Body: { target_user_id }
 * Get or create a private conversation with another user.
 */
export const getOrCreateConversation = async (req, res) => {
  const myId = req.user.id;
  const { target_user_id } = req.body;

  if (!target_user_id) {
    return res.status(400).json({ message: "target_user_id is required." });
  }

  try {
    const { conversation, created } = await getOrCreateConversationService(
      myId,
      target_user_id,
    );
    return res.status(created ? 201 : 200).json({
      message: created
        ? "Conversation created successfully."
        : "Conversation already exists.",
      data: conversation,
    });
  } catch (error) {
    if (
      error.message === "Target user not found." ||
      error.message === "Cannot start a conversation with yourself."
    ) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error get/create conversation:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /chats/conversations
 * Get all conversations for the logged-in user.
 */
export const getMyConversations = async (req, res) => {
  const myId = req.user.id;

  try {
    const conversations = await getMyConversationsService(myId);
    return res.status(200).json({
      message: "Conversations fetched successfully.",
      data: conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─── Messages ─────────────────────────────────────────────────────

/**
 * POST /chats/conversations/:conversationId/messages
 * Body: { content } — optionally multipart with image field "media"
 * Send a message in a conversation.
 */
export const sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { conversationId } = req.params;
  const { content } = req.body;
  const file = req.file ?? null; // single file field "media"

  try {
    const message = await sendMessageService(
      conversationId,
      senderId,
      content,
      file,
    );
    return res.status(201).json({
      message: "Message sent successfully.",
      data: message,
    });
  } catch (error) {
    if (
      error.message === "Conversation not found." ||
      error.message === "You are not a member of this conversation." ||
      error.message === "Message must have content or an image."
    ) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /chats/conversations/:conversationId/messages?page=1&limit=30
 * Get paginated messages in a conversation.
 */
export const getMessages = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  const { page = 1, limit = 30 } = req.query;

  try {
    const messages = await getMessagesService(
      conversationId,
      userId,
      parseInt(page),
      parseInt(limit),
    );
    return res.status(200).json({
      message: "Messages fetched successfully.",
      data: messages,
    });
  } catch (error) {
    if (
      error.message === "Conversation not found." ||
      error.message === "You are not a member of this conversation."
    ) {
      return res.status(403).json({ message: error.message });
    }
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
