import { isValidPostId } from "../../entities/Post.js";
import { isValidCommentId } from "../../entities/Comment.js";

export const makeCommentUseCases = ({
  idService,
  commentRepository,
  postRepository,
  notifyService,
}) => {
  const getCommentsService = async (postId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const comments = await commentRepository.findCommentsByPostId(postId);
    return comments;
  };

  const createCommentService = async (userId, postId, content) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    if (post.comments_disabled && post.user_id !== userId) {
      throw new Error("Comments are disabled for this post.");
    }

    const newComment = {
      id: idService.generateId(),
      user_id: userId,
      post_id: postId,
      content,
      created_at: new Date().toISOString(),
    };

    await commentRepository.createComment(newComment);

    await notifyService.createNotificationService({
      recipient_id: post.user_id,
      actor_id: userId,
      type: "comment",
      entity_id: postId,
    });

    return newComment;
  };

  const getCommentByIdService = async (commentId) => {
    if (!isValidCommentId(commentId)) {
      throw new Error("Invalid commentId format.");
    }

    const comment = await commentRepository.getCommentByIdWithUser(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    return comment;
  };

  const deleteCommentService = async (commentId, userId) => {
    if (!isValidCommentId(commentId)) {
      throw new Error("Invalid commentId format.");
    }

    const comment = await commentRepository.getCommentByIdWithUser(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    if (comment.user_id !== userId) {
      throw new Error("Unauthorized. Only comment owner can delete.");
    }

    const deletedComment = await commentRepository.deleteCommentById(commentId);

    return deletedComment;
  };

  const getCommentStatusService = async (postId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const commentCount = await commentRepository.countCommentsByPostId(postId);
    return { commentCount };
  };

  return {
    getCommentsService,
    createCommentService,
    getCommentByIdService,
    deleteCommentService,
    getCommentStatusService,
  };
};
