/**
 * Processes a list of posts and strips restricted content from viewers
 * who are not authorized to see it (follower-only or paid posts).
 *
 * Extracted as a shared helper because this exact business rule is applied
 * identically in both the posts and saved-posts flows.
 *
 * @param {Array} posts - Raw posts from the database
 * @param {string|null} requesterId - The ID of the authenticated viewer (or null)
 * @param {{ followRepository: object, postRepository: object }} repos
 * @returns {Promise<Array>}
 */
export const processRestrictedPosts = async (
  posts,
  requesterId,
  { followRepository, postRepository },
) => {
  return Promise.all(
    posts.map(async (post) => {
      const isRestricted = post.is_follower_only || post.is_paid;
      if (!isRestricted) return post;

      // Owner always sees everything
      if (requesterId && requesterId === post.user_id) {
        return { ...post, is_hidden_unlocked: true };
      }

      let canSeeHidden = false;
      if (requesterId) {
        if (post.is_follower_only) {
          canSeeHidden = !!(await followRepository.findFollow(
            requesterId,
            post.user_id,
          ));
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

      // Count hidden words and images for the blurred overlay info
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
