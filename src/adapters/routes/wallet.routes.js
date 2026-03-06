import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getBalance,
  createTopUp,
  verifyTopUp,
  midtransNotification,
  getTransactions,
  getMidtransClientKey,
} from "../controllers/wallet.controller.js";

const router = express.Router();

// Public: Midtrans webhook (no auth required)
router.post("/midtrans-notification", midtransNotification);

// Protected routes
router.get("/balance", verifyToken, getBalance);
router.post("/topup", verifyToken, createTopUp);
router.post("/topup/verify", verifyToken, verifyTopUp);
router.get("/transactions", verifyToken, getTransactions);
router.get("/midtrans-client-key", verifyToken, getMidtransClientKey);

export default router;
