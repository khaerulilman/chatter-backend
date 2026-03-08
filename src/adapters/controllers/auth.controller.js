import { authUseCases } from "../../container.js";

// Verify Cloudflare Turnstile token
const verifyTurnstile = async (token, remoteip) => {
  const params = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
    ...(remoteip && { remoteip }),
  });

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: params },
  );
  const data = await res.json();
  return data.success === true;
};

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to set refresh token as HttpOnly cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

// Register controller
export const register = async (req, res) => {
  const { name, email, password, username } = req.body;

  if (!name || !email || !password || !username) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }

  try {
    const result = await authUseCases.registerService(
      name,
      email,
      password,
      username,
    );
    res.status(201).json({
      message: result.message,
      data: { email: result.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.message === "Email sudah terdaftar.") {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === "Username sudah digunakan.") {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === "Akun dengan email ini sedang menunggu verifikasi.") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({
      message: "Register Gagal",
      error: error.message,
    });
  }
};

// Verify OTP controller
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email dan OTP diperlukan." });
  }

  try {
    const result = await authUseCases.verifyOtpService(email, otp);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Verify OTP error:", error);
    if (
      error.message === "Email tidak ditemukan dalam data pending." ||
      error.message.includes("OTP") ||
      error.message.includes("kadaluarsa")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Verifikasi OTP Gagal",
      error: error.message,
    });
  }
};

// Resend OTP controller
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email diperlukan." });
  }

  try {
    const result = await authUseCases.resendOtpService(email);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Resend OTP error:", error);
    if (
      error.message.includes("Email tidak ditemukan") ||
      error.message.includes("kadaluarsa")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Resend OTP Gagal",
      error: error.message,
    });
  }
};

// Forgot Password - Send OTP controller
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email diperlukan." });
  }

  try {
    const result = await authUseCases.forgotPasswordService(email);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error.message === "Email tidak ditemukan.") {
      return res.status(404).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Gagal mengirim OTP", error: error.message });
  }
};

// Forgot Password - Resend OTP controller
export const resendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email diperlukan." });
  }

  try {
    const result = await authUseCases.resendForgotPasswordOtpService(email);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Resend forgot password OTP error:", error);
    if (error.message === "Email tidak ditemukan.") {
      return res.status(404).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Gagal mengirim ulang OTP", error: error.message });
  }
};

// Forgot Password - Reset Password controller
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, OTP, dan password baru diperlukan." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password minimal 6 karakter." });
  }

  try {
    const result = await authUseCases.resetPasswordService(
      email,
      otp,
      newPassword,
    );
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Reset password error:", error);
    if (
      error.message.includes("tidak ditemukan") ||
      error.message.includes("kadaluarsa") ||
      error.message.includes("salah")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Gagal mereset password", error: error.message });
  }
};

// Login controller
export const login = async (req, res) => {
  const { email, password, turnstileToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password diperlukan." });
  }

  // Verify Turnstile before hitting the database
  const ip = req.headers["cf-connecting-ip"] || req.ip;
  const turnstileOk = await verifyTurnstile(turnstileToken, ip).catch(
    () => false,
  );
  if (!turnstileOk) {
    return res
      .status(400)
      .json({ message: "Security check failed. Please try again." });
  }

  try {
    const result = await authUseCases.loginService(email, password);

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Return access token + user data in JSON (no refresh token in body)
    res.status(200).json({
      message: result.message,
      data: result.data,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    if (error.message === "Email tidak ditemukan") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Password salah") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Login Gagal",
      error: error.message,
    });
  }
};

// Refresh token controller
export const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token tidak ditemukan." });
  }

  try {
    const result = await authUseCases.refreshTokenService(refreshToken);

    // Set new refresh token cookie (rotation)
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      accessToken: result.accessToken,
      data: result.data,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    // Clear invalid cookie
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.status(401).json({ message: error.message });
  }
};

// Logout controller
export const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    await authUseCases.logoutService(refreshToken);
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Always clear cookie
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.status(200).json({ message: "Logout berhasil." });
};
