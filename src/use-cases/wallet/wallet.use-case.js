export const makeWalletUseCases = ({
  idService,
  walletRepository,
  userRepository,
  midtransService,
}) => {
  /**
   * Get or create wallet for a user, return balance info
   */
  const getBalance = async (userId) => {
    let wallet = await walletRepository.getWalletByUserId(userId);

    // Auto-create wallet if it doesn't exist
    if (!wallet) {
      const walletId = idService.generateId(21);
      wallet = await walletRepository.createWallet(walletId, userId);

      // Handle race condition — another request may have created it
      if (!wallet) {
        wallet = await walletRepository.getWalletByUserId(userId);
      }
    }

    return {
      balance: Number(wallet.balance),
      updated_at: wallet.updated_at,
    };
  };

  /**
   * Create a top-up transaction via Midtrans Snap
   */
  const createTopUp = async (userId, amount) => {
    if (amount < 10000) {
      throw new Error("Minimum top up Rp 10.000");
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new Error("User tidak ditemukan");
    }

    // Ensure wallet exists
    let wallet = await walletRepository.getWalletByUserId(userId);
    if (!wallet) {
      const walletId = idService.generateId(21);
      wallet = await walletRepository.createWallet(walletId, userId);
      if (!wallet) {
        wallet = await walletRepository.getWalletByUserId(userId);
      }
    }

    // Generate unique order ID
    const orderId = `TOPUP-${userId.slice(0, 8)}-${Date.now()}`;
    const txId = idService.generateId(21);

    // Create Midtrans Snap transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      item_details: [
        {
          id: "topup",
          price: amount,
          quantity: 1,
          name: `Top Up Saldo Rp ${amount.toLocaleString("id-ID")}`,
        },
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL || "http://localhost:5173"}/saldo`,
      },
      expiry: {
        unit: "minutes",
        duration: 60,
      },
    };

    const snapResult = await midtransService.createTransaction(parameter);

    // Save transaction record with pending status
    const transaction = await walletRepository.createTransaction({
      id: txId,
      user_id: userId,
      type: "topup",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      snap_token: snapResult.token,
      snap_redirect_url: snapResult.redirect_url,
    });

    return {
      transaction_id: transaction.id,
      order_id: orderId,
      snap_token: snapResult.token,
      snap_redirect_url: snapResult.redirect_url,
    };
  };

  /**
   * Handle Midtrans webhook / notification callback
   */
  const handleMidtransNotification = async (notificationBody) => {
    const orderId = notificationBody.order_id;
    const transactionStatus = notificationBody.transaction_status;
    const fraudStatus = notificationBody.fraud_status;
    const paymentType = notificationBody.payment_type;
    const midtransTransactionId = notificationBody.transaction_id;

    // Find the transaction
    const tx = await walletRepository.findTransactionByOrderId(orderId);
    if (!tx) {
      throw new Error("Transaction not found");
    }

    // Already settled — skip
    if (tx.status === "success" || tx.status === "failed") {
      return { message: "Transaction already settled", status: tx.status };
    }

    let newStatus = "pending";

    if (transactionStatus === "capture") {
      newStatus = fraudStatus === "accept" ? "success" : "failed";
    } else if (transactionStatus === "settlement") {
      newStatus = "success";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      newStatus = transactionStatus === "expire" ? "expired" : "failed";
    } else if (transactionStatus === "pending") {
      newStatus = "pending";
    }

    // Update transaction — returns null if already settled (idempotency guard)
    const updated = await walletRepository.updateTransactionStatus(
      orderId,
      newStatus,
      paymentType,
      midtransTransactionId,
    );

    // Only add balance if this call was the one that transitioned to success
    if (newStatus === "success" && updated) {
      await walletRepository.addBalance(tx.user_id, tx.amount);
    }

    return { message: "Notification processed", status: newStatus };
  };

  /**
   * Get transaction history for a user
   * Auto-expires pending transactions older than 1 hour
   */
  const getTransactionHistory = async (userId, page = 1, limit = 20) => {
    // Auto-expire old pending transactions
    await walletRepository.expirePendingTransactions(60);

    const offset = (page - 1) * limit;
    const transactions = await walletRepository.getTransactionsByUserId(
      userId,
      limit,
      offset,
    );
    return transactions;
  };

  /**
   * Verify a top-up by checking status directly with Midtrans API
   * Called from frontend after Snap popup closes
   */
  const verifyTopUp = async (orderId, userId) => {
    // Find the transaction in our DB
    const tx = await walletRepository.findTransactionByOrderId(orderId);
    if (!tx) {
      throw new Error("Transaction not found");
    }

    // Security: ensure the transaction belongs to the requesting user
    if (tx.user_id !== userId) {
      throw new Error("Unauthorized");
    }

    // Already settled — return current status
    if (tx.status === "success" || tx.status === "failed") {
      return { status: tx.status, balance: null };
    }

    // Check with Midtrans
    const midtransStatus = await midtransService.getTransactionStatus(orderId);
    const transactionStatus = midtransStatus.transaction_status;
    const fraudStatus = midtransStatus.fraud_status;
    const paymentType = midtransStatus.payment_type;
    const midtransTransactionId = midtransStatus.transaction_id;

    let newStatus = "pending";

    if (transactionStatus === "capture") {
      newStatus = fraudStatus === "accept" ? "success" : "failed";
    } else if (transactionStatus === "settlement") {
      newStatus = "success";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      newStatus = transactionStatus === "expire" ? "expired" : "failed";
    } else if (transactionStatus === "pending") {
      newStatus = "pending";
    }

    // Update transaction in DB — returns null if already settled (idempotency guard)
    const updated = await walletRepository.updateTransactionStatus(
      orderId,
      newStatus,
      paymentType,
      midtransTransactionId,
    );

    // Only add balance if this call was the one that transitioned to success
    if (newStatus === "success" && updated) {
      const wallet = await walletRepository.addBalance(tx.user_id, tx.amount);
      return { status: newStatus, balance: Number(wallet.balance) };
    }

    return { status: newStatus, balance: null };
  };

  /**
   * Get Midtrans client key for frontend
   */
  const getMidtransClientKey = () => {
    return midtransService.getClientKey();
  };

  return {
    getBalance,
    createTopUp,
    verifyTopUp,
    handleMidtransNotification,
    getTransactionHistory,
    getMidtransClientKey,
  };
};
