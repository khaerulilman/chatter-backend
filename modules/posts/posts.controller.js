import {
  getPostsService,
  getPostsByUserIdService,
  createPostService,
  getPostByIdService,
  deletePostService,
} from "./posts.services.js";

const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20),
    );

    const posts = await getPostsService(page, limit);
    res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const getPostsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20),
    );

    const posts = await getPostsByUserIdService(userId, page, limit);
    res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching posts by user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const userId = req.user.id;

    const newPost = await createPostService(userId, content, req.files);
    return res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const post = await getPostByIdService(postId);

    res.status(200).json({
      message: "Post retrieved successfully.",
      data: post,
    });
  } catch (error) {
    console.error("Error retrieving post:", error);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    await deletePostService(postId, userId);

    res.status(200).json({
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting post:", error);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === "Unauthorized. Only post owner can delete.") {
      return res.status(403).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

export { getPosts, getPostsByUserId, createPost, getPostById, deletePost };
