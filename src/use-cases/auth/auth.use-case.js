import {
  DEFAULT_PROFILE_PICTURE,
  DEFAULT_HEADER_PICTURE,
  validateUsername,
} from "../../entities/User.js";

export const makeAuthUseCases = ({
  authRepository,
  hashService,
  tokenService,
  idService,
  emailService,
}) => {
  const unverifiedUsers = new Map();
  const forgotPasswordRequests = new Map();

  // Register service
  const registerService = async (name, email, password, username) => {
    // Check if email already exists in database
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser.length > 0) {
      throw new Error("Email sudah terdaftar.");
    }

    // Check if email is waiting for verification
    if (unverifiedUsers.has(email)) {
      const userData = unverifiedUsers.get(email);
      const now = Date.now();
      if (now > userData.otpExpires.getTime()) {
        unverifiedUsers.delete(email);
      } else if (now - userData.registeredAt < 60 * 1000) {
        throw new Error("Akun dengan email ini sedang menunggu verifikasi.");
      }
    }

    // Validate username using entity rule
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.message);
    }

    // Check if username already exists in database
    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername.length > 0) {
      throw new Error("Username sudah digunakan.");
    }

    // Hash password
    const hashedPassword = await hashService.hash(password);

    const otp = idService.generateOtp(100000, 999999); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

    // Generate unique ID and check for duplicates
    let id;
    while (true) {
      id = idService.generateId(21);
      const checkUser = await authRepository.findUserById(id);
      if (checkUser.length === 0) break;
    }

    unverifiedUsers.set(email, {
      id,
      name,
      email,
      username,
      password: hashedPassword,
      otp,
      otpExpires,
      registeredAt: Date.now(),
      profile_picture: DEFAULT_PROFILE_PICTURE,
      header_picture: DEFAULT_HEADER_PICTURE,
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
          <p style="color: #666;">Kode ini hanya berlaku selama 30 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
          <p>Jika ada pertanyaan atau membutuhkan bantuan, silakan hubungi call center kami di +62 821-1723-6590 atau melalui email di <a href="chatter0810@gmail.com" style="color: #1a73e8;">chatter@co.id</a>.</p>
        </div>
      </div>
    `;

    await emailService.sendMail({
      to: email,
      subject: "Kode OTP Verifikasi Email",
      html: htmlContent,
    });

    return {
      message: "OTP sent successfully. Please check your email.",
      email,
    };
  };

  // Verify OTP service
  const verifyOtpService = async (email, otp) => {
    const userData = unverifiedUsers.get(email);

    if (!userData) {
      throw new Error(
        "Email tidak ditemukan dalam data pending, lakukan register ulang!",
      );
    }

    const now = Date.now();
    const otpExpireTime = userData.otpExpires.getTime();

    console.log(`OTP Verification attempt for ${email}`);
    console.log(
      `Current time: ${now}, OTP expires at: ${otpExpireTime}, Time remaining: ${otpExpireTime - now}ms`,
    );
    console.log(`Provided OTP: ${otp}, Stored OTP: ${userData.otp}`);

    if (now > otpExpireTime) {
      console.log(`OTP expired for ${email}`);
      unverifiedUsers.delete(email);
      throw new Error("Kode OTP telah kadaluarsa. Silakan mendaftar ulang.");
    }

    if (userData.otp !== parseInt(otp)) {
      console.log(`Invalid OTP provided for ${email}`);
      throw new Error("Kode OTP salah.");
    }

    unverifiedUsers.delete(email);

    await authRepository.insertUser(
      userData.id,
      userData.name,
      userData.email,
      userData.username,
      userData.password,
      userData.profile_picture,
      userData.header_picture,
      true,
    );

    console.log(`User ${email} verified successfully`);

    // Send welcome email
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
          <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732804728/chatter-logo-panjang.jpg" alt="Chatter Logo" style="width: auto; height: 100px;">
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
          <h2 style="color: #1a73e8;">Welcome to Social Chatter!</h2>
          <p>Hi ${userData.name},</p>
          <p>Your account has been successfully created. You can now start sharing posts, connecting with the community, and supporting or receiving support through paid posts.</p>
          <p>We're glad to have you with us.</p>
          <br>
          <p style="color: #666;">Best regards,<br><strong>Social Chatter Team</strong></p>
        </div>
      </div>
    `;

    await emailService.sendMail({
      to: email,
      subject: "Welcome to Social Chatter!",
      html: welcomeHtml,
    });

    return {
      message: "Email berhasil diverifikasi.",
    };
  };

  // Resend OTP service
  const resendOtpService = async (email) => {
    const userData = unverifiedUsers.get(email);

    if (!userData) {
      throw new Error("Email tidak ditemukan. Silakan daftar ulang.");
    }

    const now = Date.now();
    const otpExpireTime = userData.otpExpires.getTime();

    const otp = idService.generateOtp(100000, 999999);
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000);

    unverifiedUsers.set(email, {
      ...userData,
      otp,
      otpExpires,
    });

    console.log(`OTP resent for ${email}, was expired: ${now > otpExpireTime}`);

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

    await emailService.sendMail({
      to: email,
      subject: "Kode OTP Verifikasi Email Baru",
      html: htmlContent,
    });

    return {
      message: "OTP berhasil dikirim ulang. Silakan cek email Anda.",
      email,
    };
  };

  // Forgot Password - Send OTP service
  const forgotPasswordService = async (email) => {
    const users = await authRepository.findUserByEmail(email);
    if (users.length === 0) {
      throw new Error("Email tidak ditemukan.");
    }

    const otp = idService.generateOtp(100000, 999999);
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000);

    forgotPasswordRequests.set(email, { otp, otpExpires });

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

    await emailService.sendMail({
      to: email,
      subject: "Kode OTP Reset Password",
      html: htmlContent,
    });

    console.log(`Forgot password OTP sent for ${email}`);

    return {
      message: "OTP berhasil dikirim. Silakan cek email Anda.",
      email,
    };
  };

  // Forgot Password - Resend OTP service
  const resendForgotPasswordOtpService = async (email) => {
    const users = await authRepository.findUserByEmail(email);
    if (users.length === 0) {
      throw new Error("Email tidak ditemukan.");
    }

    const otp = idService.generateOtp(100000, 999999);
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000);

    forgotPasswordRequests.set(email, { otp, otpExpires });

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

    await emailService.sendMail({
      to: email,
      subject: "Kode OTP Reset Password Baru",
      html: htmlContent,
    });

    console.log(`Forgot password OTP resent for ${email}`);

    return {
      message: "OTP berhasil dikirim ulang. Silakan cek email Anda.",
      email,
    };
  };

  // Forgot Password - Reset Password service
  const resetPasswordService = async (email, otp, newPassword) => {
    const data = forgotPasswordRequests.get(email);

    if (!data) {
      throw new Error("Email tidak ditemukan. Silakan request OTP ulang.");
    }

    const now = Date.now();
    const otpExpireTime = data.otpExpires.getTime();

    if (now > otpExpireTime) {
      forgotPasswordRequests.delete(email);
      throw new Error("Kode OTP telah kadaluarsa. Silakan request OTP ulang.");
    }

    if (data.otp !== parseInt(otp)) {
      throw new Error("Kode OTP salah.");
    }

    const hashedPassword = await hashService.hash(newPassword);
    await authRepository.updateUserPassword(email, hashedPassword);

    forgotPasswordRequests.delete(email);

    console.log(`Password reset successfully for ${email}`);

    return { message: "Password berhasil diubah." };
  };

  // Login service
  const loginService = async (email, password) => {
    const users = await authRepository.findUserFullByEmail(email);

    if (users.length === 0) {
      throw new Error("Email tidak ditemukan");
    }

    const currentUser = users[0];

    const isMatch = await hashService.compare(password, currentUser.password);

    if (!isMatch) {
      throw new Error("Password salah");
    }

    // Generate access token (short-lived, 15 min)
    const accessToken = tokenService.sign({ id: currentUser.id });

    // Generate refresh token (random string, 7 days)
    const refreshToken = tokenService.generateRefreshToken();
    const refreshTokenId = idService.generateId(21);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.insertRefreshToken(
      refreshTokenId,
      currentUser.id,
      refreshToken,
      refreshExpiresAt,
    );

    return {
      message: "Login Berhasil",
      data: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email,
        profile_picture: currentUser.profile_picture || DEFAULT_PROFILE_PICTURE,
        header_picture: currentUser.header_picture || DEFAULT_HEADER_PICTURE,
        created_at: currentUser.created_at,
      },
      accessToken,
      refreshToken,
    };
  };

  // Refresh token service — rotate refresh token & issue new access token
  const refreshTokenService = async (oldRefreshToken) => {
    const tokens = await authRepository.findRefreshToken(oldRefreshToken);

    if (tokens.length === 0) {
      throw new Error("Refresh token tidak valid.");
    }

    const storedToken = tokens[0];

    // Check expiry
    if (new Date() > new Date(storedToken.expires_at)) {
      await authRepository.deleteRefreshToken(oldRefreshToken);
      throw new Error("Refresh token telah kadaluarsa.");
    }

    // Delete old refresh token (rotation)
    await authRepository.deleteRefreshToken(oldRefreshToken);

    // Get user data
    const users = await authRepository.findUserFullById(storedToken.user_id);
    if (users.length === 0) {
      throw new Error("User tidak ditemukan.");
    }

    const currentUser = users[0];

    // Generate new access token
    const accessToken = tokenService.sign({ id: currentUser.id });

    // Generate new refresh token (rotation)
    const newRefreshToken = tokenService.generateRefreshToken();
    const newRefreshTokenId = idService.generateId(21);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.insertRefreshToken(
      newRefreshTokenId,
      currentUser.id,
      newRefreshToken,
      refreshExpiresAt,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      data: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email,
        profile_picture: currentUser.profile_picture || DEFAULT_PROFILE_PICTURE,
        header_picture: currentUser.header_picture || DEFAULT_HEADER_PICTURE,
        created_at: currentUser.created_at,
      },
    };
  };

  // Logout service — delete refresh token
  const logoutService = async (refreshToken) => {
    if (refreshToken) {
      await authRepository.deleteRefreshToken(refreshToken);
    }
    return { message: "Logout berhasil." };
  };

  return {
    registerService,
    verifyOtpService,
    resendOtpService,
    forgotPasswordService,
    resendForgotPasswordOtpService,
    resetPasswordService,
    loginService,
    refreshTokenService,
    logoutService,
  };
};
