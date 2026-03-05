export const makeChatUseCases = ({
  idService,
  imageService,
  chatRepository,
  notifyService,
}) => {
  // ─── Conversations ──────────────────────────────────────────────

  const getOrCreateConversationService = async (myId, targetUserId) => {
    if (myId === targetUserId) {
      throw new Error("Cannot start a conversation with yourself.");
    }

    const targetExists = await chatRepository.findUserById(targetUserId);
    if (!targetExists) {
      throw new Error("Target user not found.");
    }

    const existing = await chatRepository.findConversationBetween(
      myId,
      targetUserId,
    );
    if (existing) return { conversation: existing, created: false };

    const conversationId = idService.generateId();
    const conversation = await chatRepository.createConversation(
      conversationId,
      myId,
      targetUserId,
    );
    return { conversation, created: true };
  };

  const getMyConversationsService = async (userId) => {
    return await chatRepository.findConversationsByUserId(userId);
  };

  // ─── Messages ───────────────────────────────────────────────────

  const sendMessageService = async (
    conversationId,
    senderId,
    content,
    file,
  ) => {
    const conversation =
      await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const isMember = await chatRepository.isConversationMember(
      conversationId,
      senderId,
    );
    if (!isMember) {
      throw new Error("You are not a member of this conversation.");
    }

    if (!content && !file) {
      throw new Error("Message must have content or an image.");
    }

    const messageId = idService.generateId();

    if (file) {
      const result = await imageService.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/chats/media",
      });

      const message = await chatRepository.createMessage({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content: content ?? null,
        media_url: result.url,
      });

      const recipientId = await chatRepository.findOtherMember(
        conversationId,
        senderId,
      );
      if (recipientId) {
        await notifyService.createNotificationService({
          recipient_id: recipientId,
          actor_id: senderId,
          type: "message",
          entity_id: conversationId,
        });
      }

      return message;
    }

    const message = await chatRepository.createMessage({
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      media_url: null,
    });

    const recipientId = await chatRepository.findOtherMember(
      conversationId,
      senderId,
    );
    if (recipientId) {
      await notifyService.createNotificationService({
        recipient_id: recipientId,
        actor_id: senderId,
        type: "message",
        entity_id: conversationId,
      });
    }

    return message;
  };

  const getMessagesService = async (conversationId, userId, page, limit) => {
    const conversation =
      await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const isMember = await chatRepository.isConversationMember(
      conversationId,
      userId,
    );
    if (!isMember) {
      throw new Error("You are not a member of this conversation.");
    }

    const offset = (page - 1) * limit;
    return await chatRepository.findMessagesByConversationId(
      conversationId,
      limit,
      offset,
    );
  };

  return {
    getOrCreateConversationService,
    getMyConversationsService,
    sendMessageService,
    getMessagesService,
  };
};
