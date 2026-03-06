import { isValidPostId } from "../../entities/Post.js";

export const makePostUseCases = ({
  idService,
  imageService,
  postRepository,
}) => {
  const getPostsService = async (page, limit) => {
    if (
      typeof page !== "number" ||
      typeof limit !== "number" ||
      page < 1 ||
      limit < 1
    ) {
      throw new Error("Invalid page or limit values");
    }

    const offset = (page - 1) * limit;
    return await postRepository.findAllPosts(limit, offset);
  };

  const getPostsByUserIdService = async (userId, page, limit) => {
    if (
      typeof page !== "number" ||
      typeof limit !== "number" ||
      page < 1 ||
      limit < 1
    ) {
      throw new Error("Invalid page or limit values");
    }

    const offset = (page - 1) * limit;
    return await postRepository.findPostsByUserId(userId, limit, offset);
  };

  const createPostService = async (userId, content, files) => {
    const userExists = await postRepository.findUserById(userId);
    if (!userExists) {
      throw new Error("User not found");
    }

    const postId = idService.generateId();

    let newPost;
    if (files && files.media && files.media.length > 0) {
      // Upload all media files in parallel
      const uploadPromises = files.media.map((mediaFile) =>
        imageService.upload({
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/media",
        }),
      );
      const results = await Promise.all(uploadPromises);
      const mediaUrls = results.map((r) => r.url);
      const mediaFileids = results.map((r) => r.fileId);

      newPost = await postRepository.createPost({
        id: postId,
        user_id: userId,
        content,
        media_url: mediaUrls[0],
        media_urls: mediaUrls,
        media_fileids: mediaFileids,
      });
    } else {
      newPost = await postRepository.createPost({
        id: postId,
        user_id: userId,
        content,
      });
    }

    return newPost[0];
  };

  const getPostByIdService = async (postId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.getPostByIdWithUser(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    return post;
  };

  const deletePostService = async (postId, userId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.getPostByIdWithUser(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    if (post.user_id !== userId) {
      throw new Error("Unauthorized. Only post owner can delete.");
    }

    // Delete images from ImageKit before removing post from DB
    const fileIds = await postRepository.getMediaFileidsByPostId(postId);
    if (fileIds && fileIds.length > 0) {
      try {
        await imageService.deleteFiles(fileIds);
      } catch (err) {
        // Log but don't block post deletion if ImageKit fails
        console.error("Failed to delete images from ImageKit:", err.message);
      }
    }

    const deletedPost = await postRepository.deletePostById(postId);

    return deletedPost;
  };

  return {
    getPostsService,
    getPostsByUserIdService,
    createPostService,
    getPostByIdService,
    deletePostService,
  };
};
