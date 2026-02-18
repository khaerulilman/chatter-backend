import { toggleLikeService, getLikeStatusService } from "./likes.services.js";

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validasi input
    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const userId = req.user.id;

    const result = await toggleLikeService(userId, postId);

    if (result.liked) {
      return res.status(201).json({
        message: result.message,
        like: result.like,
        likeCount: result.likeCount,
        isLiked: result.isLiked,
      });
    } else {
      return res.status(200).json({
        message: result.message,
        likeCount: result.likeCount,
        isLiked: result.isLiked,
      });
    }
  } catch (error) {
    console.error("Error liking post:", error);

    if (
      error.message === "User not found." ||
      error.message === "Post not found."
    ) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const getLikeStatus = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const userId = req.user.id;

    const result = await getLikeStatusService(userId, postId);

    res.status(200).json({
      isLiked: result.isLiked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("Error getting like status:", error);

    if (
      error.message === "User not found." ||
      error.message === "Post not found."
    ) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

export { likePost, getLikeStatus };
