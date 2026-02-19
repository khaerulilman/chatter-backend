import {
  toggleFollowService,
  getFollowStatusService,
  getFollowersService,
  getFollowingService,
  getRecommendedUsersService,
  getFollowStatsService,
  getFollowingIdsService,
} from "./follows.services.js";

// POST /api/follows/:userId/toggle
const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.params;

    if (!followingId) {
      return res.status(400).json({ message: "Target user ID is required." });
    }

    const result = await toggleFollowService(followerId, followingId);

    return res.status(200).json({
      message: result.message,
      following: result.following,
      followerCount: result.followerCount,
    });
  } catch (error) {
    console.error("Error toggling follow:", error);
    if (
      error.message === "You cannot follow yourself." ||
      error.message === "Target user not found."
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/:userId/status
const getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.params;

    const result = await getFollowStatusService(followerId, followingId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting follow status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/:userId/followers
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const followers = await getFollowersService(userId);
    return res.status(200).json({ data: followers });
  } catch (error) {
    console.error("Error getting followers:", error);
    if (error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/:userId/following
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const following = await getFollowingService(userId);
    return res.status(200).json({ data: following });
  } catch (error) {
    console.error("Error getting following:", error);
    if (error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/recommended  (requires auth – excludes self and already-followed)
const getRecommendedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const users = await getRecommendedUsersService(userId);
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error getting recommended users:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/stats/:userId
const getFollowStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getFollowStatsService(userId);
    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting follow stats:", error);
    if (error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/follows/following-ids  (returns IDs of everyone the logged-in user follows)
const getFollowingIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const ids = await getFollowingIdsService(userId);
    return res.status(200).json({ data: ids });
  } catch (error) {
    console.error("Error getting following IDs:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export {
  toggleFollow,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getRecommendedUsers,
  getFollowStats,
  getFollowingIds,
};
