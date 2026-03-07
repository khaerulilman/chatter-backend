import { postUseCases } from "../../container.js";

const {
  getPostsService,
  getPostsByUserIdService,
  createPostService,
  getPostByIdService,
  deletePostService,
  purchasePostService,
} = postUseCases;

const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20),
    );

    const requesterId = req.user?.id || null;
    const posts = await getPostsService(page, limit, requesterId);
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

    const requesterId = req.user?.id || null;
    const posts = await getPostsByUserIdService(
      userId,
      page,
      limit,
      requesterId,
    );
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
    const {
      content,
      is_follower_only,
      is_paid,
      price,
      hidden_content,
      comments_disabled,
    } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const userId = req.user.id;
    const isFollowerOnly =
      is_follower_only === "true" || is_follower_only === true;
    const isPaid = is_paid === "true" || is_paid === true;
    const isCommentsDisabled =
      comments_disabled === "true" || comments_disabled === true;

    const newPost = await createPostService(userId, content, req.files, {
      isFollowerOnly: isFollowerOnly && !isPaid,
      isPaid,
      price: isPaid ? price : null,
      hiddenContent: isFollowerOnly || isPaid ? hidden_content || null : null,
      hiddenMediaFiles:
        (isFollowerOnly || isPaid) && req.files?.hidden_media
          ? req.files.hidden_media
          : null,
      commentsDisabled: isCommentsDisabled,
    });
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

    const post = await getPostByIdService(postId, req.user?.id || null);

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
const purchasePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const buyerId = req.user.id;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const result = await purchasePostService(postId, buyerId);

    res.status(200).json({
      message: result.message,
      amount: result.amount,
    });
  } catch (error) {
    console.error("Error purchasing post:", error);

    const clientErrors = [
      "Invalid postId format.",
      "Post not found.",
      "This post is not a paid post.",
      "You cannot purchase your own post.",
      "You have already purchased this post.",
      "Insufficient balance.",
    ];

    if (clientErrors.includes(error.message)) {
      const status = error.message === "Post not found." ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};
const getPurchaseActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await postUseCases.getPurchaseActivityService(
      userId,
      page,
      limit,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Get purchase activity error:", error);
    res.status(500).json({
      message: "Failed to get purchase activity",
      error: error.message,
    });
  }
};

export {
  getPosts,
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
  purchasePost,
  getPurchaseActivity,
};
