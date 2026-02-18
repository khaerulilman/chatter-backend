import { nanoid } from "nanoid";
import {
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
} from "./follows.repositories.js";

const toggleFollowService = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new Error("You cannot follow yourself.");
  }

  const follower = await findUserById(followerId);
  if (!follower) throw new Error("Follower user not found.");

  const following = await findUserById(followingId);
  if (!following) throw new Error("Target user not found.");

  const existingFollow = await findFollow(followerId, followingId);

  if (existingFollow) {
    await deleteFollow(followerId, followingId);
    const followerCount = await countFollowers(followingId);
    return {
      following: false,
      message: "Unfollowed successfully.",
      followerCount,
    };
  }

  const newFollow = {
    id: nanoid(),
    follower_id: followerId,
    following_id: followingId,
    created_at: new Date().toISOString(),
  };

  await createFollow(newFollow);
  const followerCount = await countFollowers(followingId);
  return {
    following: true,
    message: "Followed successfully.",
    followerCount,
  };
};

const getFollowStatusService = async (followerId, followingId) => {
  const isFollowing = !!(await findFollow(followerId, followingId));
  const followerCount = await countFollowers(followingId);
  const followingCount = await countFollowing(followingId);
  return { isFollowing, followerCount, followingCount };
};

const getFollowersService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found.");
  return await getFollowers(userId);
};

const getFollowingService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found.");
  return await getFollowing(userId);
};

const getRecommendedUsersService = async (userId) => {
  return await getRecommendedUsers(userId);
};

const getFollowStatsService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found.");
  const followerCount = await countFollowers(userId);
  const followingCount = await countFollowing(userId);
  return { followerCount, followingCount };
};

const getFollowingIdsService = async (userId) => {
  return await getFollowingIds(userId);
};

export {
  toggleFollowService,
  getFollowStatusService,
  getFollowersService,
  getFollowingService,
  getRecommendedUsersService,
  getFollowStatsService,
  getFollowingIdsService,
};
