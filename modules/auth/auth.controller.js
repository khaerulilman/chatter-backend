import * as authService from "./auth.services.js";

// Register controller
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }

  try {
    const result = await authService.registerService(name, email, password);
    res.status(201).json({
      message: result.message,
      data: { email: result.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.message === "Email sudah terdaftar.") {
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
    const result = await authService.verifyOtpService(email, otp);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Verify OTP error:", error);
    if (
      error.message === "Email tidak ditemukan dalam data pending." ||
      error.message === "Kode OTP salah atau telah kadaluarsa."
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Verifikasi OTP Gagal",
      error: error.message,
    });
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
