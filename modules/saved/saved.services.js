import {
  findSavedPost,
  createSavedPost,
  deleteSavedPost,
  findAllSavedPostsByUserId,
  isSavedByUser,
} from "./saved.repositories.js";
import db from "../../config/db.js";

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const toggleSaveService = async (userId, postId) => {
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  const existing = await findSavedPost(userId, postId);

  if (existing) {
    await deleteSavedPost(userId, postId);
    return {
      saved: false,
      message: "Post unsaved successfully.",
      isSaved: false,
    };
  }

  await createSavedPost(userId, postId);
  return {
    saved: true,
    message: "Post saved successfully.",
    isSaved: true,
  };
};

const getSaveStatusService = async (userId, postId) => {
  const post = await findPostById(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  const saved = await isSavedByUser(userId, postId);
  return { isSaved: saved };
};

const getSavedPostsService = async (userId, page, limit) => {
  const offset = (page - 1) * limit;
  return await findAllSavedPostsByUserId(userId, limit, offset);
};

export { toggleSaveService, getSaveStatusService, getSavedPostsService };
