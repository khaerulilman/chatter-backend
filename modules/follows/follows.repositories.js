import db from "../../config/db.js";

const findUserById = async (userId) => {
  const result = await db`SELECT * FROM users WHERE id = ${userId}`;
  return result.length > 0 ? result[0] : null;
};

const findFollow = async (followerId, followingId) => {
  const result = await db`
    SELECT * FROM follows
    WHERE follower_id = ${followerId} AND following_id = ${followingId}
  `;
  return result.length > 0 ? result[0] : null;
};

const createFollow = async (followData) => {
  const { id, follower_id, following_id, created_at } = followData;
  return await db`
    INSERT INTO follows (id, follower_id, following_id, created_at)
    VALUES (${id}, ${follower_id}, ${following_id}, ${created_at})
    RETURNING *
  `;
};

const deleteFollow = async (followerId, followingId) => {
  await db`
    DELETE FROM follows
    WHERE follower_id = ${followerId} AND following_id = ${followingId}
  `;
};

const countFollowers = async (userId) => {
  const result = await db`
    SELECT COUNT(*) as count FROM follows WHERE following_id = ${userId}
  `;
  return parseInt(result[0].count);
};

const countFollowing = async (userId) => {
  const result = await db`
    SELECT COUNT(*) as count FROM follows WHERE follower_id = ${userId}
  `;
  return parseInt(result[0].count);
};

// Get list of users who follow userId
const getFollowers = async (userId) => {
  return await db`
    SELECT u.id, u.name, u.username, u.profile_picture
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ${userId}
    ORDER BY f.created_at DESC
  `;
};

// Get list of users that userId is following
const getFollowing = async (userId) => {
  return await db`
    SELECT u.id, u.name, u.username, u.profile_picture
    FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ${userId}
    ORDER BY f.created_at DESC
  `;
};

// Get users that the current user is NOT yet following (excluding self)
const getRecommendedUsers = async (userId) => {
  return await db`
    SELECT u.id, u.name, u.username, u.profile_picture
    FROM users u
    WHERE u.id <> ${userId}
      AND u.id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = ${userId}
      )
    ORDER BY u.name ASC
  `;
};

// Get IDs of users that userId is following (for bulk follow-status check)
const getFollowingIds = async (userId) => {
  const result = await db`
    SELECT following_id FROM follows WHERE follower_id = ${userId}
  `;
  return result.map((r) => r.following_id);
};

export {
  findUserById,
  findFollow,
  createFollow,
  deleteFollow,
  countFollowers,
  countFollowing,
  getFollowers,
  getFollowing,
  getRecommendedUsers,
  getFollowingIds,
};
