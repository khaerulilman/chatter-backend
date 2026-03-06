import { walletUseCases } from "../../container.js";
import db from "../../frameworks/database/db.js";

// GET /api/wallet/balance
export const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await walletUseCases.getBalance(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Get balance error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil saldo", error: error.message });
  }
};

// POST /api/wallet/topup
export const createTopUp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount < 10000) {
      return res.status(400).json({ message: "Minimum top up Rp 10.000" });
    }

    // Get user info for Midtrans customer details
    const users = await db`SELECT name, email FROM users WHERE id = ${userId}`;
    if (users.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const result = await walletUseCases.createTopUp(
      userId,
      users[0].name,
      users[0].email,
      Number(amount),
    );

    res.status(201).json({ data: result });
  } catch (error) {
    console.error("Create top up error:", error);
    res
      .status(500)
      .json({ message: "Gagal membuat top up", error: error.message });
  }
};

// POST /api/wallet/midtrans-notification (Webhook — no auth)
export const midtransNotification = async (req, res) => {
  try {
    const result = await walletUseCases.handleMidtransNotification(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("Midtrans notification error:", error);
    res.status(500).json({
      message: "Notification processing failed",
      error: error.message,
    });
  }
};

// GET /api/wallet/transactions
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const transactions = await walletUseCases.getTransactionHistory(
      userId,
      page,
      limit,
    );
    res.status(200).json({ data: transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      message: "Gagal mengambil riwayat transaksi",
      error: error.message,
    });
  }
};

// POST /api/wallet/topup/verify
export const verifyTopUp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ message: "order_id diperlukan" });
    }

    const result = await walletUseCases.verifyTopUp(order_id, userId);
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Verify top up error:", error);
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Transaksi bukan milik Anda" });
    }
    if (error.message === "Transaction not found") {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }
    res
      .status(500)
      .json({ message: "Gagal verifikasi transaksi", error: error.message });
  }
};

// GET /api/wallet/midtrans-client-key
export const getMidtransClientKey = async (req, res) => {
  try {
    const clientKey = walletUseCases.getMidtransClientKey();
    res.status(200).json({ data: { clientKey } });
  } catch (error) {
    console.error("Get client key error:", error);
    res.status(500).json({ message: "Gagal mengambil client key" });
  }
};
