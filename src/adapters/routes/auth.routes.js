import express from "express";
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resendForgotPasswordOtp,
  resetPassword,
  refresh,
  logout,
} from "../controllers/auth.controller.js";
import {
  authLimiter,
  sensitiveActionLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = express.Router();

// Auth routes
router.post("/register", authLimiter, register);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/resend-otp", sensitiveActionLimiter, resendOtp);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Forgot password routes
router.post("/forgot-password", sensitiveActionLimiter, forgotPassword);
router.post(
  "/forgot-password/resend-otp",
  sensitiveActionLimiter,
  resendForgotPasswordOtp,
);
router.post("/reset-password", sensitiveActionLimiter, resetPassword);

export default router;
