import crypto from "crypto";
import {
  findUserById,
  findPostById,
  findLike,
  deleteLike,
  createLike,
  countLikesByPostId,
  isPostLikedByUser,
} from "./likes.repositories.js";

const toggleLikeService = async (userId, postId) => {
  // Validasi user
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Validasi post
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  // Cek apakah user sudah memberikan like pada postingan ini
  const existingLike = await findLike(userId, postId);

  if (existingLike) {
    // Jika sudah ada, hapus "like" (toggle functionality)
    await deleteLike(userId, postId);
    const likeCount = await countLikesByPostId(postId);
    return {
      liked: false,
      message: "Like removed successfully.",
      likeCount,
      isLiked: false,
    };
  }

  // Jika belum ada, tambahkan "like"
  const newLike = {
    id: crypto.randomUUID(),
    user_id: userId,
    post_id: postId,
    created_at: new Date().toISOString(),
  };

  await createLike(newLike);
  const likeCount = await countLikesByPostId(postId);
  return {
    liked: true,
    message: "Post liked successfully.",
    like: newLike,
    likeCount,
    isLiked: true,
  };
};

const getLikeStatusService = async (userId, postId) => {
  // Validasi user
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Validasi post
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  const isLiked = await isPostLikedByUser(userId, postId);
  const likeCount = await countLikesByPostId(postId);

  return { isLiked, likeCount };
};

export { toggleLikeService, getLikeStatusService };
