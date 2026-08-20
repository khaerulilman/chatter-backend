import db from "../../frameworks/database/db.js";

// Get wallet by user ID (create if not exists)
export const getWalletByUserId = async (userId) => {
  const wallet = await db.$queryRaw`
    SELECT id, user_id, balance, created_at, updated_at
    FROM wallets
    WHERE user_id = ${userId}
  `;
  return wallet.length > 0 ? wallet[0] : null;
};

// Create wallet for a user
export const createWallet = async (id, userId) => {
  const result = await db.$queryRaw`
    INSERT INTO wallets (id, user_id, balance)
    VALUES (${id}, ${userId}, 0)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Add balance to wallet
export const addBalance = async (userId, amount) => {
  const result = await db.$queryRaw`
    UPDATE wallets
    SET balance = balance + ${amount},
        updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Create a wallet transaction record
export const createTransaction = async (txData) => {
  const {
    id,
    user_id,
    type,
    amount,
    status,
    midtrans_order_id,
    snap_token,
    snap_redirect_url,
  } = txData;

  const result = await db.$queryRaw`
    INSERT INTO wallet_transactions (id, user_id, type, amount, status, midtrans_order_id, snap_token, snap_redirect_url)
    VALUES (${id}, ${user_id}, ${type}, ${amount}, ${status}, ${midtrans_order_id}, ${snap_token || null}, ${snap_redirect_url || null})
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Find transaction by Midtrans order ID
export const findTransactionByOrderId = async (orderId) => {
  const result = await db.$queryRaw`
    SELECT * FROM wallet_transactions
    WHERE midtrans_order_id = ${orderId}
  `;
  return result.length > 0 ? result[0] : null;
};

// Update transaction status — only updates if not already settled (success/failed/expired)
// Returns the updated row, or null if the row was already in a terminal state (idempotency guard)
export const updateTransactionStatus = async (
  orderId,
  status,
  paymentType,
  midtransTransactionId,
) => {
  const result = await db.$queryRaw`
    UPDATE wallet_transactions
    SET status = ${status},
        payment_type = ${paymentType || null},
        midtrans_transaction_id = ${midtransTransactionId || null},
        updated_at = NOW()
    WHERE midtrans_order_id = ${orderId}
      AND status NOT IN ('success', 'failed', 'expired')
    RETURNING *
  `;
  return result.length > 0 ? result[0] : null;
};

// Expire pending transactions older than given minutes
export const expirePendingTransactions = async (minutes = 60) => {
  const intervalStr = `${minutes} minutes`;
  const result = await db.$queryRaw`
    UPDATE wallet_transactions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - (${intervalStr})::interval
    RETURNING id
  `;
  return result.length;
};

// Get transactions by user ID (for history)
export const getTransactionsByUserId = async (
  userId,
  limit = 20,
  offset = 0,
) => {
  const transactions = await db.$queryRaw`
    SELECT id, type, amount, status, payment_type, midtrans_order_id, snap_token, created_at
    FROM wallet_transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return transactions;
};
