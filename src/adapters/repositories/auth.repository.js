import db from "../../frameworks/database/db.js";

// Check if username already exists in database
export const findUserByUsername = async (username) => {
  const user = await db`SELECT id FROM users WHERE username = ${username}`;
  return user;
};

// Check if email already exists in database
export const findUserByEmail = async (email) => {
  const user = await db`SELECT id FROM users WHERE email = ${email}`;
  return user;
};

// Find user by email with all data
export const findUserFullByEmail = async (email) => {
  const user = await db`
    SELECT id, name, username, email, profile_picture, header_picture, created_at, password 
    FROM users WHERE email = ${email}
  `;
  return user;
};

// Find user by ID
export const findUserById = async (userId) => {
  const user = await db`SELECT id, token FROM users WHERE id = ${userId}`;
  return user;
};

// Insert new user
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

// ─── Refresh Token Operations ─────────────────────────────────────

// Insert a new refresh token
export const insertRefreshToken = async (id, userId, token, expiresAt) => {
  await db`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (${id}, ${userId}, ${token}, ${expiresAt})
  `;
};

// Find refresh token by token string
export const findRefreshToken = async (token) => {
  const result = await db`
    SELECT id, user_id, token, expires_at
    FROM refresh_tokens
    WHERE token = ${token}
  `;
  return result;
};

// Find user by ID with full profile data (for refresh)
export const findUserFullById = async (userId) => {
  const user = await db`
    SELECT id, name, username, email, profile_picture, header_picture, created_at
    FROM users WHERE id = ${userId}
  `;
  return user;
};

// Delete a specific refresh token
export const deleteRefreshToken = async (token) => {
  await db`DELETE FROM refresh_tokens WHERE token = ${token}`;
};

// Delete all refresh tokens for a user (logout all sessions)
export const deleteRefreshTokensByUserId = async (userId) => {
  await db`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
};

// Delete expired refresh tokens (cleanup)
export const deleteExpiredRefreshTokens = async () => {
  await db`DELETE FROM refresh_tokens WHERE expires_at < NOW()`;
};
