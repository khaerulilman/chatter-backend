import jwt from "jsonwebtoken";
import db from "../../frameworks/database/db.js";

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  try {
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cek apakah token masih valid di database
    const user = await db`
      SELECT id, token FROM users WHERE id = ${decoded.id}
    `;

    if (user.length === 0 || user[0].token !== token) {
      return res.status(401).json({ message: "Token tidak valid" });
    }

    // Tambahkan user ke request object
    req.user = user[0];
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res
      .status(401)
      .json({ message: "Token tidak valid", error: error.message });
  }
};

// Optional auth: sets req.user if valid token present, but doesn't block
export const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db`
      SELECT id, token FROM users WHERE id = ${decoded.id}
    `;
    if (user.length > 0 && user[0].token === token) {
      req.user = user[0];
    }
  } catch {
    // Ignore invalid tokens — proceed as unauthenticated
  }
  next();
};
