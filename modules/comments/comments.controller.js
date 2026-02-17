import {
  getCommentsService,
  createCommentService,
  getCommentByIdService,
  deleteCommentService,
} from "./comments.services.js";

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validasi input
    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    const comments = await getCommentsService(postId);

    res.status(200).json({
      message: "Comments retrieved successfully.",
      data: comments,
    });
  } catch (error) {
    console.error("Error retrieving comments:", error);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const userId = req.user.id;

    // Validasi input
    if (!content || !postId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newComment = await createCommentService(userId, postId, content);

    res.status(201).json({
      message: "Comment created successfully.",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);

    if (error.message === "Invalid postId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const getCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Validasi input
    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required." });
    }

    const comment = await getCommentByIdService(commentId);

    res.status(200).json({
      message: "Comment retrieved successfully.",
      data: comment,
    });
  } catch (error) {
    console.error("Error retrieving comment:", error);

    if (error.message === "Invalid commentId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Comment not found.") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Validasi input
    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required." });
    }

    await deleteCommentService(commentId, userId);

    res.status(200).json({
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);

    if (error.message === "Invalid commentId format.") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Comment not found.") {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === "Unauthorized. Only comment owner can delete.") {
      return res.status(403).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

export { getComments, createComment, getCommentById, deleteComment };
