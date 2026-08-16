import { processRestrictedPosts } from "../posts/processRestrictedPosts.js";

export const makeSavedUseCases = ({
  savedRepository,
  postRepository,
  followRepository,
}) => {
  const toggleSaveService = async (userId, postId) => {
    const post = await postRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const existing = await savedRepository.findSavedPost(userId, postId);

    if (existing) {
      await savedRepository.deleteSavedPost(userId, postId);
      return {
        saved: false,
        message: "Post unsaved successfully.",
        isSaved: false,
      };
    }

    await savedRepository.createSavedPost(userId, postId);
    return {
      saved: true,
      message: "Post saved successfully.",
      isSaved: true,
    };
  };

  const getSaveStatusService = async (userId, postId) => {
    const post = await postRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const saved = await savedRepository.isSavedByUser(userId, postId);
    return { isSaved: saved };
  };

  const getSavedPostsService = async (userId, page, limit) => {
    const offset = (page - 1) * limit;
    const posts = await savedRepository.findAllSavedPostsByUserId(
      userId,
      limit,
      offset,
    );
    return processRestrictedPosts(posts, userId, {
      followRepository,
      postRepository,
    });
  };

  return {
    toggleSaveService,
    getSaveStatusService,
    getSavedPostsService,
  };
};
