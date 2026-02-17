import db from "../../config/db.js";

// Check if email already exists in database
export const findUserByEmail = async (email) => {
  const user = await db`SELECT id FROM users WHERE email = ${email}`;
  return user;
};

// Find user by email with all data
export const findUserFullByEmail = async (email) => {
  const user = await db`
    SELECT id, name, email, profile_picture, header_picture, created_at, password 
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
  password,
  isVerified = true,
) => {
  await db`
    INSERT INTO users (id, name, email, password, isVerified)
    VALUES (${id}, ${name}, ${email}, ${password}, ${isVerified})
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
