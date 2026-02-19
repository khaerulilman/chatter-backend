import db from "../../config/db.js";

// Check if username already exists (all users — username must be globally unique)
export const findUserByUsername = async (username) => {
  const user = await db`SELECT id FROM users WHERE username = ${username}`;
  return user;
};

// Check if email already exists in verified users
export const findUserByEmail = async (email) => {
  const user =
    await db`SELECT id FROM users WHERE email = ${email} AND isverified = true`;
  return user;
};

// Find verified user by email with all data
export const findUserFullByEmail = async (email) => {
  const user = await db`
    SELECT id, name, username, email, profile_picture, header_picture, created_at, password 
    FROM users WHERE email = ${email} AND isverified = true
  `;
  return user;
};

// Find user by ID
export const findUserById = async (userId) => {
  const user = await db`SELECT id, token FROM users WHERE id = ${userId}`;
  return user;
};

// Insert new pending user (isverified = false, stores OTP)
export const insertPendingUser = async (
  id,
  name,
  email,
  username,
  password,
  profile_picture,
  header_picture,
  otp,
  otp_expires,
) => {
  await db`
    INSERT INTO users (id, name, email, username, password, profile_picture, header_picture, isverified, otp, otp_expires)
    VALUES (${id}, ${name}, ${email}, ${username}, ${password}, ${profile_picture}, ${header_picture}, false, ${otp}, ${otp_expires})
  `;
};

// Find pending (unverified) user by email
export const findPendingUserByEmail = async (email) => {
  const user = await db`
    SELECT id, name, email, username, password, profile_picture, header_picture, otp, otp_expires
    FROM users WHERE email = ${email} AND isverified = false
  `;
  return user;
};

// Update OTP for a pending user
export const updatePendingUserOtp = async (email, otp, otp_expires) => {
  await db`
    UPDATE users SET otp = ${otp}, otp_expires = ${otp_expires}
    WHERE email = ${email} AND isverified = false
  `;
};

// Delete pending user by email
export const deletePendingUserByEmail = async (email) => {
  await db`
    DELETE FROM users WHERE email = ${email} AND isverified = false
  `;
};

// Verify pending user: mark as verified, clear OTP fields
export const verifyPendingUser = async (email) => {
  await db`
    UPDATE users SET isverified = true, otp = null, otp_expires = null
    WHERE email = ${email} AND isverified = false
  `;
};

// Insert new user (legacy direct insert)
export const insertUser = async (
  id,
  name,
  email,
  username,
  password,
  profile_picture,
  header_picture,
  isVerified = true,
) => {
  await db`
    INSERT INTO users (id, name, email, username, password, profile_picture, header_picture, isVerified)
    VALUES (${id}, ${name}, ${email}, ${username}, ${password}, ${profile_picture}, ${header_picture}, ${isVerified})
    ON CONFLICT (id) DO NOTHING
  `;
};

// Update user token
export const updateUserToken = async (userId, token) => {
  await db`
    UPDATE users
    SET token = ${token}
    WHERE id = ${userId}
  `;
};

// Update user password by email
export const updateUserPassword = async (email, hashedPassword) => {
  await db`
    UPDATE users
    SET password = ${hashedPassword}
    WHERE email = ${email}
  `;
};

// Set reset password OTP for a verified user
export const setResetPasswordOtp = async (
  email,
  reset_otp,
  reset_otp_expires,
) => {
  await db`
    UPDATE users SET reset_otp = ${reset_otp}, reset_otp_expires = ${reset_otp_expires}
    WHERE email = ${email} AND isverified = true
  `;
};

// Get reset password OTP data for a user
export const findResetPasswordOtp = async (email) => {
  const user = await db`
    SELECT reset_otp, reset_otp_expires FROM users
    WHERE email = ${email} AND isverified = true
  `;
  return user;
};

// Clear reset password OTP after use
export const clearResetPasswordOtp = async (email) => {
  await db`
    UPDATE users SET reset_otp = null, reset_otp_expires = null
    WHERE email = ${email} AND isverified = true
  `;
};
