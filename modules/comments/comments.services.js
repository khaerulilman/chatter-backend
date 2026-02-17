import { nanoid } from "nanoid";
import {
  findPostById,
  findCommentsByPostId,
  createComment,
  getCommentByIdWithUser,
  deleteCommentById,
} from "./comments.repositories.js";

const getCommentsService = async (postId) => {
  // Validasi postId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(postId)) {
    throw new Error("Invalid postId format.");
  }

  // Ambil data postingan berdasarkan postId untuk memastikan post ada
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  // Ambil komentar berdasarkan postId
  return await findCommentsByPostId(postId);
};

const createCommentService = async (userId, postId, content) => {
  // Validasi postId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(postId)) {
    throw new Error("Invalid postId format.");
  }

  // Ambil data postingan berdasarkan postId
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  // Buat komentar baru
  const newComment = {
    id: nanoid(),
    user_id: userId,
    post_id: postId,
    content,
    created_at: new Date().toISOString(),
  };

  await createComment(newComment);
  return newComment;
};

const getCommentByIdService = async (commentId) => {
  // Validasi commentId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(commentId)) {
    throw new Error("Invalid commentId format.");
  }

  const comment = await getCommentByIdWithUser(commentId);
  if (!comment) {
    throw new Error("Comment not found.");
  }

  return comment;
};

const deleteCommentService = async (commentId, userId) => {
  // Validasi commentId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(commentId)) {
    throw new Error("Invalid commentId format.");
  }

  const comment = await getCommentByIdWithUser(commentId);
  if (!comment) {
    throw new Error("Comment not found.");
  }

  // Verifikasi bahwa user adalah pemilik comment
  if (comment.user_id !== userId) {
    throw new Error("Unauthorized. Only comment owner can delete.");
  }

  const deletedComment = await deleteCommentById(commentId);
  return deletedComment;
};

export {
  getCommentsService,
  createCommentService,
  getCommentByIdService,
  deleteCommentService,
};
