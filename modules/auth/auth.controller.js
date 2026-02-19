import * as authService from "./auth.services.js";

// Register controller
export const register = async (req, res) => {
  const { name, email, password, username } = req.body;

  if (!name || !email || !password || !username) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }

  try {
    const result = await authService.registerService(
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
    // Surface unexpected DB errors with a clear message
    console.error("Unexpected register error:", error);
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
    const result = await authService.verifyOtpService(email, otp);
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
    const result = await authService.resendOtpService(email);
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
    const result = await authService.forgotPasswordService(email);
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
    const result = await authService.resendForgotPasswordOtpService(email);
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
    const result = await authService.resetPasswordService(
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password diperlukan." });
  }

  try {
    const result = await authService.loginService(email, password);
    res.status(200).json(result);
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
