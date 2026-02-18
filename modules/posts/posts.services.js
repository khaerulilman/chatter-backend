import { nanoid } from "nanoid";
import imagekit from "../../config/imagekit.js";
import {
  findAllPosts,
  findPostsByUserId,
  createPost,
  findUserById,
  getPostByIdWithUser,
  deletePostById,
} from "./posts.repositories.js";

const getPostsService = async (page, limit) => {
  const offset = (page - 1) * limit;
  return await findAllPosts(limit, offset);
};

const getPostsByUserIdService = async (userId, page, limit) => {
  const offset = (page - 1) * limit;
  return await findPostsByUserId(userId, limit, offset);
};

const createPostService = async (userId, content, files) => {
  // Verifikasi apakah userId ada di tabel users
  const userExists = await findUserById(userId);
  if (!userExists) {
    throw new Error("User not found");
  }

  // Membuat ID unik menggunakan nanoid
  const postId = nanoid();

  // Jika ada file media
  if (files && files.media) {
    const mediaFile = files.media[0];

    return new Promise((resolve, reject) => {
      imagekit.upload(
        {
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/media",
        },
        async (error, result) => {
          if (error) {
            reject(new Error("ImageKit upload failed"));
          }

          const mediaUrl = result.url;
          const newPost = await createPost({
            id: postId,
            user_id: userId,
            content,
            media_url: mediaUrl,
          });

          resolve(newPost[0]);
        },
      );
    });
  } else {
    // Jika tidak ada file, simpan post tanpa media
    const newPost = await createPost({
      id: postId,
      user_id: userId,
      content,
    });
    return newPost[0];
  }
};

const getPostByIdService = async (postId) => {
  // Validasi postId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(postId)) {
    throw new Error("Invalid postId format.");
  }

  const post = await getPostByIdWithUser(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  return post;
};

const deletePostService = async (postId, userId) => {
  // Validasi postId sebagai nanoId
  if (!/^[A-Za-z0-9_-]{21}$/.test(postId)) {
    throw new Error("Invalid postId format.");
  }

  const post = await getPostByIdWithUser(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  // Verifikasi bahwa user adalah pemilik post
  if (post.user_id !== userId) {
    throw new Error("Unauthorized. Only post owner can delete.");
  }

  const deletedPost = await deletePostById(postId);
  return deletedPost;
};

export {
  getPostsService,
  getPostsByUserIdService,
  createPostService,
  getPostByIdService,
  deletePostService,
};
