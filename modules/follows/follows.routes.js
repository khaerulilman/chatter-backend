import express from "express";
import { verifyToken } from "../../middleware/createToken.js";
import {
  toggleFollow,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getRecommendedUsers,
  getFollowStats,
  getFollowingIds,
} from "./follows.controller.js";

const router = express.Router();

// Toggle follow / unfollow a user (requires auth)
router.patch("/:userId/toggle", verifyToken, toggleFollow);

// Get follow status for a specific user (requires auth)
router.get("/:userId/status", verifyToken, getFollowStatus);

// Get followers list for a user (public)
router.get("/:userId/followers", getFollowers);

// Get following list for a user (public)
router.get("/:userId/following", getFollowing);

// Get follow stats (followerCount, followingCount) for a user (public)
router.get("/stats/:userId", getFollowStats);

// Get recommended users to follow (requires auth)
router.get("/recommended", verifyToken, getRecommendedUsers);

// Get IDs of all users the logged-in user follows (requires auth)
router.get("/following-ids", verifyToken, getFollowingIds);

export default router;
