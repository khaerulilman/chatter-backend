import { nanoid } from "nanoid";
import imagekit from "../../config/imagekit.js";
import {
  createConversation,
  findConversationBetween,
  findConversationsByUserId,
  findConversationById,
  isConversationMember,
  createMessage,
  findMessagesByConversationId,
  findUserById,
  findOtherMember,
} from "./chats.repositories.js";
import { createNotificationService } from "../notifications/notifications.services.js";

// ─── Conversations ────────────────────────────────────────────────

/**
 * Get or create a private conversation between the current user and another user.
 */
export const getOrCreateConversationService = async (myId, targetUserId) => {
  if (myId === targetUserId) {
    throw new Error("Cannot start a conversation with yourself.");
  }

  const targetExists = await findUserById(targetUserId);
  if (!targetExists) {
    throw new Error("Target user not found.");
  }

  // Return existing conversation if it already exists
  const existing = await findConversationBetween(myId, targetUserId);
  if (existing) return { conversation: existing, created: false };

  const conversationId = nanoid();
  const conversation = await createConversation(
    conversationId,
    myId,
    targetUserId,
  );
  return { conversation, created: true };
};

export const getMyConversationsService = async (userId) => {
  return await findConversationsByUserId(userId);
};

// ─── Messages ─────────────────────────────────────────────────────

export const sendMessageService = async (
  conversationId,
  senderId,
  content,
  file,
) => {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const isMember = await isConversationMember(conversationId, senderId);
  if (!isMember) {
    throw new Error("You are not a member of this conversation.");
  }

  if (!content && !file) {
    throw new Error("Message must have content or an image.");
  }

  const messageId = nanoid();

  if (file) {
    return new Promise((resolve, reject) => {
      imagekit.upload(
        {
          file: file.buffer,
          fileName: file.originalname,
          folder: "/chats/media",
        },
        async (error, result) => {
          if (error) return reject(new Error("ImageKit upload failed."));

          const message = await createMessage({
            id: messageId,
            conversation_id: conversationId,
            sender_id: senderId,
            content: content ?? null,
            media_url: result.url,
          });

          // Notify the other member
          const recipientId = await findOtherMember(conversationId, senderId);
          if (recipientId) {
            await createNotificationService({
              recipient_id: recipientId,
              actor_id: senderId,
              type: "message",
              entity_id: conversationId,
            });
          }

          resolve(message);
        },
      );
    });
  }

  const message = await createMessage({
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    media_url: null,
  });

  // Notify the other member
  const recipientId = await findOtherMember(conversationId, senderId);
  if (recipientId) {
    await createNotificationService({
      recipient_id: recipientId,
      actor_id: senderId,
      type: "message",
      entity_id: conversationId,
    });
  }

  return message;
};

export const getMessagesService = async (
  conversationId,
  userId,
  page,
  limit,
) => {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const isMember = await isConversationMember(conversationId, userId);
  if (!isMember) {
    throw new Error("You are not a member of this conversation.");
  }

  const offset = (page - 1) * limit;
  return await findMessagesByConversationId(conversationId, limit, offset);
};
