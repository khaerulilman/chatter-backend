import midtransClient from "midtrans-client";

// Midtrans Snap client (Sandbox mode)
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Midtrans Core API client (for checking transaction status)
const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Create a Snap transaction and return token + redirect URL
 */
export const createTransaction = async (parameter) => {
  const transaction = await snap.createTransaction(parameter);
  return {
    token: transaction.token,
    redirect_url: transaction.redirect_url,
  };
};

/**
 * Check transaction status directly from Midtrans API
 */
export const getTransactionStatus = async (orderId) => {
  return coreApi.transaction.status(orderId);
};

/**
 * Get Midtrans client key (for frontend Snap.js)
 */
export const getClientKey = () => process.env.MIDTRANS_CLIENT_KEY;
