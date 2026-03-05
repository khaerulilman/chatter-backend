import jwt from "jsonwebtoken";

// Buat (sign) JWT token.
export const sign = (payload, expiresIn = "1h") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// Verifikasi dan decode JWT token.
export const verify = (token) => jwt.verify(token, process.env.JWT_SECRET);
