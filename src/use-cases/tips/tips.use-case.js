export const makeTipsUseCases = ({
  idService,
  tipsRepository,
  walletRepository,
  postRepository,
  notifyService,
}) => {
  /**
   * Send a tip to a post owner
   */
  const sendTip = async (senderId, postId, amount, message) => {
    // Validate amount (1.000 - 100.000)
    if (!amount || amount < 1000 || amount > 100000) {
      const error = new Error("Jumlah tip harus antara Rp 1.000 - Rp 100.000");
      error.status = 400;
      throw error;
    }

    // Get post to find receiver
    const post = await postRepository.findPostById(postId);
    if (!post) {
      const error = new Error("Post tidak ditemukan");
      error.status = 404;
      throw error;
    }

    const receiverId = post.user_id;

    // Cannot tip your own post
    if (senderId === receiverId) {
      const error = new Error("Tidak bisa memberi tip ke post sendiri");
      error.status = 400;
      throw error;
    }

    // Check sender balance
    let senderWallet = await walletRepository.getWalletByUserId(senderId);
    if (!senderWallet) {
      const walletId = idService.generateId(21);
      senderWallet = await walletRepository.createWallet(walletId, senderId);
      if (!senderWallet) {
        senderWallet = await walletRepository.getWalletByUserId(senderId);
      }
    }

    if (Number(senderWallet.balance) < amount) {
      const error = new Error("Saldo tidak cukup");
      error.status = 400;
      throw error;
    }

    // Ensure receiver has a wallet
    let receiverWallet = await walletRepository.getWalletByUserId(receiverId);
    if (!receiverWallet) {
      const walletId = idService.generateId(21);
      receiverWallet = await walletRepository.createWallet(
        walletId,
        receiverId,
      );
      if (!receiverWallet) {
        receiverWallet = await walletRepository.getWalletByUserId(receiverId);
      }
    }

    // Deduct sender balance
    await walletRepository.addBalance(senderId, -amount);

    // Add receiver balance
    await walletRepository.addBalance(receiverId, amount);

    // Create tip record
    const tipId = idService.generateId(21);
    const tip = await tipsRepository.createTip({
      id: tipId,
      sender_id: senderId,
      receiver_id: receiverId,
      post_id: postId,
      amount,
      message: message || null,
    });

    // Send notification to receiver
    try {
      await notifyService.createNotificationService({
        recipient_id: receiverId,
        actor_id: senderId,
        type: "tip",
        entity_id: postId,
      });
    } catch (e) {
      console.error("Failed to send tip notification:", e);
    }

    return {
      tip_id: tip.id,
      amount: Number(tip.amount),
      new_balance: Number(senderWallet.balance) - amount,
    };
  };

  /**
   * Get tips activity (received + sent) for the logged-in user
   */
  const getTipsActivity = async (userId, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;

    const received = await tipsRepository.getTipsReceived(
      userId,
      limit,
      offset,
    );
    const sent = await tipsRepository.getTipsSent(userId, limit, offset);

    return { received, sent };
  };

  return {
    sendTip,
    getTipsActivity,
  };
};
