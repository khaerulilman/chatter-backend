import {
  toggleSaveService,
  getSaveStatusService,
  getSavedPostsService,
} from "./saved.services.js";

const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const userId = req.user.id;
    const result = await toggleSaveService(userId, postId);

    return res.status(result.saved ? 201 : 200).json({
      message: result.message,
      isSaved: result.isSaved,
    });
  } catch (error) {
    console.error("Error toggling save:", error);

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const getSaveStatus = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const userId = req.user.id;
    const result = await getSaveStatusService(userId, postId);

    return res.status(200).json({ isSaved: result.isSaved });
  } catch (error) {
    console.error("Error getting save status:", error);

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const posts = await getSavedPostsService(
      userId,
      parseInt(page),
      parseInt(limit),
    );

    return res.status(200).json({
      message: "Saved posts fetched successfully.",
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export { toggleSavePost, getSaveStatus, getSavedPosts };
