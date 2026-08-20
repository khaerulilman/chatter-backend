import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 600;

const findAllUsers = async () => {
  const cacheKey = "users:all";
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const users = await db.$queryRaw`SELECT * FROM users`;

  await cacheService.set(cacheKey, users, CACHE_TTL);
  return users;
};

const findUserById = async (userId) => {
  const result = await db.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
  return result.length > 0 ? result[0] : null;
};

const findUserByUsername = async (username) => {
  const cacheKey = `users:username:${username}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const result = await db.$queryRaw`SELECT * FROM users WHERE username = ${username}`;
  const user = result.length > 0 ? result[0] : null;

  if (user) {
    await cacheService.set(cacheKey, user, CACHE_TTL);
  }
  return user;
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

  await db.$queryRawUnsafe(query, ...params);

  await cacheService.del("users:all");
  await cacheService.delByPattern("users:username:*");
};

export { findAllUsers, findUserById, findUserByUsername, updateUser };
