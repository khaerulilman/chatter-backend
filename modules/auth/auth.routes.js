import express from "express";
import { register, verifyOtp, login } from "./auth.controller.js";

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);

export default router;
