export const makeSavedUseCases = ({ savedRepository, postRepository }) => {
  const toggleSaveService = async (userId, postId) => {
    const post = await savedRepository.findPostById(postId);
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
    const post = await savedRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const saved = await savedRepository.isSavedByUser(userId, postId);
    return { isSaved: saved };
  };

  const processRestrictedPosts = async (posts, requesterId) => {
    return Promise.all(
      posts.map(async (post) => {
        const isRestricted = post.is_follower_only || post.is_paid;
        if (!isRestricted) return post;

        if (requesterId && requesterId === post.user_id) {
          return { ...post, is_hidden_unlocked: true };
        }

        let canSeeHidden = false;
        if (requesterId) {
          if (post.is_follower_only) {
            canSeeHidden = await postRepository.checkIsFollowing(
              requesterId,
              post.user_id,
            );
          }
          if (post.is_paid && !canSeeHidden) {
            canSeeHidden = await postRepository.checkHasPurchased(
              requesterId,
              post.id,
            );
          }
        }

        if (canSeeHidden) {
          return { ...post, is_hidden_unlocked: true };
        }

        const hiddenWordCount = post.hidden_content
          ? post.hidden_content.split(/\s+/).filter(Boolean).length
          : 0;
        const hiddenImageCount =
          post.hidden_media_urls && Array.isArray(post.hidden_media_urls)
            ? post.hidden_media_urls.length
            : 0;

        return {
          ...post,
          hidden_content: null,
          hidden_media_urls: null,
          is_hidden_unlocked: false,
          hidden_word_count: hiddenWordCount,
          hidden_image_count: hiddenImageCount,
        };
      }),
    );
  };

  const getSavedPostsService = async (userId, page, limit) => {
    const offset = (page - 1) * limit;
    const posts = await savedRepository.findAllSavedPostsByUserId(
      userId,
      limit,
      offset,
    );
    return processRestrictedPosts(posts, userId);
  };

  return {
    toggleSaveService,
    getSaveStatusService,
    getSavedPostsService,
  };
};
