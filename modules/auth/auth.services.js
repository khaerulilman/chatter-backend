import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import * as authRepository from "./auth.repositories.js";

const unverifiedUsers = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register service
export const registerService = async (name, email, password) => {
  // Check if email already exists in database
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar.");
  }

  // Check if email is waiting for verification
  if (unverifiedUsers.has(email)) {
    throw new Error("Akun dengan email ini sedang menunggu verifikasi.");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const otp = crypto.randomInt(100000, 999999); // 6-digit OTP
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Generate unique ID and check for duplicates
  let id;
  while (true) {
    id = nanoid(21);
    const checkUser = await authRepository.findUserById(id);
    if (checkUser.length === 0) break;
  }

  unverifiedUsers.set(email, {
    id,
    name,
    email,
    password: hashedPassword,
    otp,
    otpExpires,
  });

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
        <p style="color: #666;">Kode ini hanya berlaku selama 10 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
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
  const userData = unverifiedUsers.get(email);

  if (!userData) {
    throw new Error("Email tidak ditemukan dalam data pending.");
  }

  if (userData.otp !== parseInt(otp) || Date.now() > userData.otpExpires) {
    throw new Error("Kode OTP salah atau telah kadaluarsa.");
  }

  unverifiedUsers.delete(email);

  // Insert user into database
  await authRepository.insertUser(
    userData.id,
    userData.name,
    userData.email,
    userData.password,
    true,
  );

  return {
    message: "Email berhasil diverifikasi.",
  };
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
      email: currentUser.email,
      profile_picture: currentUser.profile_picture,
      header_picture: currentUser.header_picture,
      created_at: currentUser.created_at,
    },
    token,
  };
};
