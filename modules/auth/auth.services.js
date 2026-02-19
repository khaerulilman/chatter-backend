import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import * as authRepository from "./auth.repositories.js";

// NOTE: In-memory Maps removed — serverless-safe: all OTP state is stored in the database.

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register service
export const registerService = async (name, email, password, username) => {
  // Check if email already exists as a verified user
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar.");
  }

  // Check if email is waiting for verification (stored in DB)
  const pendingUsers = await authRepository.findPendingUserByEmail(email);
  if (pendingUsers.length > 0) {
    const pendingUser = pendingUsers[0];
    // If OTP has expired, delete the pending record to allow re-registration
    if (Date.now() > new Date(pendingUser.otp_expires).getTime()) {
      await authRepository.deletePendingUserByEmail(email);
    } else {
      // OTP still valid, user must verify first
      throw new Error("Akun dengan email ini sedang menunggu verifikasi.");
    }
  }

  // Validate username
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    throw new Error(
      "Username hanya boleh berisi huruf, angka, dan underscore.",
    );
  }
  if (username.length < 3 || username.length > 50) {
    throw new Error("Username harus antara 3-50 karakter.");
  }
  if (/\s/.test(username)) {
    throw new Error("Username tidak boleh mengandung spasi.");
  }

  // Check if username already exists in database
  const existingUsername = await authRepository.findUserByUsername(username);
  if (existingUsername.length > 0) {
    throw new Error("Username sudah digunakan.");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const otp = crypto.randomInt(100000, 999999); // 6-digit OTP
  const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry
  const defaultProfilePicture =
    "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171";
  const defaultHeaderPicture =
    "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.avif?updatedAt=1736214212559";

  // Generate unique ID and check for duplicates
  let id;
  while (true) {
    id = nanoid(21);
    const checkUser = await authRepository.findUserById(id);
    if (checkUser.length === 0) break;
  }

  // Persist pending user to database (serverless-safe)
  await authRepository.insertPendingUser(
    id,
    name,
    email,
    username,
    hashedPassword,
    defaultProfilePicture,
    defaultHeaderPicture,
    otp,
    otpExpires,
  );

  // Send OTP email
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
        <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732804728/chatter-logo-panjang.jpg" alt="Chatter Logo" style="width: auto; height: 100px;">
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
        <p>Hi ${name},</p>
        <p>Tinggal selangkah lagi untuk menyelesaikan proses, mohon konfirmasi dengan memasukkan kode OTP di bawah ini.</p>
        <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 20px; background-color: #f1f1f1; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #666;">Kode ini hanya berlaku selama 30 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
        <p>Jika ada pertanyaan atau membutuhkan bantuan, silakan hubungi call center kami di +62 821-1723-6590 atau melalui email di <a href="chatter0810@gmail.com" style="color: #1a73e8;">chatter@co.id</a>.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Kode OTP Verifikasi Email",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);

  return {
    message: "OTP sent successfully. Please check your email.",
    email,
  };
};

// Verify OTP service
export const verifyOtpService = async (email, otp) => {
  const pendingUsers = await authRepository.findPendingUserByEmail(email);

  if (pendingUsers.length === 0) {
    throw new Error(
      "Email tidak ditemukan dalam data pending, lakukan register ulang!",
    );
  }

  const userData = pendingUsers[0];
  const now = Date.now();
  const otpExpireTime = new Date(userData.otp_expires).getTime();

  // Debug logging
  console.log(`OTP Verification attempt for ${email}`);
  console.log(
    `Current time: ${now}, OTP expires at: ${otpExpireTime}, Time remaining: ${otpExpireTime - now}ms`,
  );
  console.log(`Provided OTP: ${otp}, Stored OTP: ${userData.otp}`);

  // Check if OTP has expired
  if (now > otpExpireTime) {
    console.log(`OTP expired for ${email}`);
    await authRepository.deletePendingUserByEmail(email);
    throw new Error("Kode OTP telah kadaluarsa. Silakan mendaftar ulang.");
  }

  // Check if OTP matches
  if (userData.otp !== parseInt(otp)) {
    console.log(`Invalid OTP provided for ${email}`);
    throw new Error("Kode OTP salah.");
  }

  // Mark user as verified in the database
  await authRepository.verifyPendingUser(email);

  console.log(`User ${email} verified successfully`);

  return {
    message: "Email berhasil diverifikasi.",
  };
};

// Resend OTP service
export const resendOtpService = async (email) => {
  const pendingUsers = await authRepository.findPendingUserByEmail(email);

  if (pendingUsers.length === 0) {
    throw new Error("Email tidak ditemukan. Silakan daftar ulang.");
  }

  const userData = pendingUsers[0];
  const now = Date.now();
  const otpExpireTime = new Date(userData.otp_expires).getTime();

  // Generate new OTP regardless of whether old one expired or not
  const otp = crypto.randomInt(100000, 999999);
  const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

  // Update OTP in database
  await authRepository.updatePendingUserOtp(email, otp, otpExpires);

  console.log(`OTP resent for ${email}, was expired: ${now > otpExpireTime}`);

  // Send OTP email
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
        <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732804728/chatter-logo-panjang.jpg" alt="Chatter Logo" style="width: auto; height: 100px;">
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
        <p>Hi ${userData.name},</p>
        <p>Berikut adalah kode OTP baru untuk verifikasi email Anda:</p>
        <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 20px; background-color: #f1f1f1; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #666;">Kode ini hanya berlaku selama 30 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
        <p>Jika ada pertanyaan atau membutuhkan bantuan, silakan hubungi call center kami di +62 821-1723-6590 atau melalui email di <a href="chatter0810@gmail.com" style="color: #1a73e8;">chatter@co.id</a>.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Kode OTP Verifikasi Email Baru",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);

  return {
    message: "OTP berhasil dikirim ulang. Silakan cek email Anda.",
    email,
  };
};

// Forgot Password - Send OTP service
export const forgotPasswordService = async (email) => {
  const users = await authRepository.findUserByEmail(email);
  if (users.length === 0) {
    throw new Error("Email tidak ditemukan.");
  }

  const otp = crypto.randomInt(100000, 999999);
  const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Persist reset OTP to database (serverless-safe)
  await authRepository.setResetPasswordOtp(email, otp, otpExpires);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
        <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732804728/chatter-logo-panjang.jpg" alt="Chatter Logo" style="width: auto; height: 100px;">
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
        <p>Halo,</p>
        <p>Kami menerima permintaan untuk mereset password akun Anda. Masukkan kode OTP berikut:</p>
        <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 20px; background-color: #f1f1f1; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #666;">Kode ini hanya berlaku selama 30 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
        <p>Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
        <p>Jika ada pertanyaan, silakan hubungi kami di <a href="chatter0810@gmail.com" style="color: #1a73e8;">chatter@co.id</a>.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Kode OTP Reset Password",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);

  console.log(`Forgot password OTP sent for ${email}`);

  return { message: "OTP berhasil dikirim. Silakan cek email Anda.", email };
};

// Forgot Password - Resend OTP service
export const resendForgotPasswordOtpService = async (email) => {
  const users = await authRepository.findUserByEmail(email);
  if (users.length === 0) {
    throw new Error("Email tidak ditemukan.");
  }

  const otp = crypto.randomInt(100000, 999999);
  const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Update reset OTP in database (serverless-safe)
  await authRepository.setResetPasswordOtp(email, otp, otpExpires);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
        <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732804728/chatter-logo-panjang.jpg" alt="Chatter Logo" style="width: auto; height: 100px;">
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
        <p>Halo,</p>
        <p>Berikut adalah kode OTP baru untuk reset password akun Anda:</p>
        <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 20px; background-color: #f1f1f1; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #666;">Kode ini hanya berlaku selama 30 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
        <p>Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Kode OTP Reset Password Baru",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);

  console.log(`Forgot password OTP resent for ${email}`);

  return {
    message: "OTP berhasil dikirim ulang. Silakan cek email Anda.",
    email,
  };
};

// Forgot Password - Reset Password service
export const resetPasswordService = async (email, otp, newPassword) => {
  const rows = await authRepository.findResetPasswordOtp(email);

  if (rows.length === 0 || !rows[0].reset_otp) {
    throw new Error("Email tidak ditemukan. Silakan request OTP ulang.");
  }

  const data = rows[0];
  const now = Date.now();
  const otpExpireTime = new Date(data.reset_otp_expires).getTime();

  if (now > otpExpireTime) {
    await authRepository.clearResetPasswordOtp(email);
    throw new Error("Kode OTP telah kadaluarsa. Silakan request OTP ulang.");
  }

  if (data.reset_otp !== parseInt(otp)) {
    throw new Error("Kode OTP salah.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await authRepository.updateUserPassword(email, hashedPassword);

  await authRepository.clearResetPasswordOtp(email);

  console.log(`Password reset successfully for ${email}`);

  return { message: "Password berhasil diubah." };
};

// Login service
export const loginService = async (email, password) => {
  // Find user by email
  const users = await authRepository.findUserFullByEmail(email);

  if (users.length === 0) {
    throw new Error("Email tidak ditemukan");
  }

  const currentUser = users[0];

  // Compare password
  const isMatch = await bcrypt.compare(password, currentUser.password);

  if (!isMatch) {
    throw new Error("Password salah");
  }

  // Generate token
  const token = jwt.sign({ id: currentUser.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // Save token to database
  await authRepository.updateUserToken(currentUser.id, token);

  return {
    message: "Login Berhasil",
    data: {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email,
      profile_picture:
        currentUser.profile_picture ||
        "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171",
      header_picture:
        currentUser.header_picture ||
        "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.avif?updatedAt=1736214212559",
      created_at: currentUser.created_at,
    },
    token,
  };
};
