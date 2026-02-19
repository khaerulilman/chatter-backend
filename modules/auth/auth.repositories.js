import db from "../../config/db.js";

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
