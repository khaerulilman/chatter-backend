import db from "../../config/db.js";

const findAllUsers = async () => {
  return await db`SELECT * FROM users`;
};

const findUserById = async (userId) => {
  const result = await db`SELECT * FROM users WHERE id = ${userId}`;
  return result.length > 0 ? result[0] : null;
};

const findUserByUsername = async (username) => {
  const result = await db`SELECT * FROM users WHERE username = ${username}`;
  return result.length > 0 ? result[0] : null;
};

const updateUser = async (userId, updates) => {
  const { name, password, profile_picture, header_picture } = updates;
  let query = `UPDATE users SET `;
  const params = [];
  const setParts = [];

  if (name !== undefined) {
    setParts.push(`name = $${params.length + 1}`);
    params.push(name);
  }
  if (password !== undefined) {
    setParts.push(`password = $${params.length + 1}`);
    params.push(password);
  }
  if (profile_picture !== undefined) {
    setParts.push(`profile_picture = $${params.length + 1}`);
    params.push(profile_picture);
  }
  if (header_picture !== undefined) {
    setParts.push(`header_picture = $${params.length + 1}`);
    params.push(header_picture);
  }

  if (setParts.length === 0) return;

  query += setParts.join(", ") + ` WHERE id = $${params.length + 1}`;
  params.push(userId);

  await db(query, params);
};

export { findAllUsers, findUserById, findUserByUsername, updateUser };
