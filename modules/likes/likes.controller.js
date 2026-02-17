import { toggleLikeService } from "./likes.services.js";

const likePost = async (req, res) => {
  try {
    const { postId } = req.body;

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
      });
    } else {
      return res.status(200).json({ message: result.message });
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

export { likePost };
