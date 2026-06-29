import { postUseCases } from "../../container.js";

const {
  getPostsService,
  getPostsByUserIdService,
  createPostService,
  getPostByIdService,
  deletePostService,
  purchasePostService,
} = postUseCases;

const getPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20),
    );

    if (page < 1 || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ message: "Invalid page or limit parameters" });
    }

    const requesterId = req.user?.id || null;

    // Set a timeout for the query
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 30000),
    );

    const posts = await Promise.race([
      getPostsService(page, limit, requesterId),
      timeoutPromise,
    ]);

    res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("[getPosts] Error:", error.message, error.stack);

    if (error.message === "Request timeout") {
      return res
        .status(504)
        .json({ message: "Request timeout - please try again" });
    }

    next(error);
  }
};

const getPostsByUserId = async (req, res, next) => {
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

    if (page < 1 || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ message: "Invalid page or limit parameters" });
    }

    const requesterId = req.user?.id || null;

    // Set a timeout for the query
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 30000),
    );

    const posts = await Promise.race([
      getPostsByUserIdService(userId, page, limit, requesterId),
      timeoutPromise,
    ]);

    res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("[getPostsByUserId] Error:", error.message, error.stack);

    if (error.message === "Request timeout") {
      return res
        .status(504)
        .json({ message: "Request timeout - please try again" });
    }

    next(error);
  }
};

const createPost = async (req, res, next) => {
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
    console.error("[createPost] Error:", error.message, error.stack);
    next(error);
  }
};

const getPostById = async (req, res, next) => {
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
    console.error("[getPostById] Error:", error.message, error.stack);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    next(error);
  }
};

const deletePost = async (req, res, next) => {
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
    console.error("[deletePost] Error:", error.message, error.stack);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === "Unauthorized. Only post owner can delete.") {
      return res.status(403).json({ message: error.message });
    }

    next(error);
  }
};
const purchasePost = async (req, res, next) => {
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
    console.error("[purchasePost] Error:", error.message, error.stack);

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

    next(error);
  }
};
const getPurchaseActivity = async (req, res, next) => {
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
    console.error("[getPurchaseActivity] Error:", error.message, error.stack);
    next(error);
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
