import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─── Access Token (short-lived, 15 min) ───────────────────────────
export const sign = (payload, expiresIn = "15m") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

export const verify = (token) => jwt.verify(token, process.env.JWT_SECRET);

// ─── Refresh Token (random string, stored in DB) ──────────────────
export const generateRefreshToken = () => crypto.randomUUID();
