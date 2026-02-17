import crypto from "crypto";
import {
  findUserById,
  findPostById,
  findLike,
  deleteLike,
  createLike,
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
    return { liked: false, message: "Like removed successfully." };
  }

  // Jika belum ada, tambahkan "like"
  const newLike = {
    id: crypto.randomUUID(),
    user_id: userId,
    post_id: postId,
    created_at: new Date().toISOString(),
  };

  await createLike(newLike);
  return { liked: true, message: "Post liked successfully.", like: newLike };
};

export { toggleLikeService };
