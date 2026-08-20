export const processRestrictedPosts = async (
  posts,
  requesterId,
  { followRepository, postRepository },
) => {
  const processedPosts = [];

  for (const post of posts) {
    const isRestricted = post.is_follower_only || post.is_paid;
    if (!isRestricted) {
      processedPosts.push(post);
      continue;
    }

    // Owner always sees everything
    if (requesterId && requesterId === post.user_id) {
      processedPosts.push({ ...post, is_hidden_unlocked: true });
      continue;
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
      processedPosts.push({ ...post, is_hidden_unlocked: true });
      continue;
    }

    // Count hidden words and images for the blurred overlay info
    const hiddenWordCount = post.hidden_content
      ? post.hidden_content.split(/\s+/).filter(Boolean).length
      : 0;
    const hiddenImageCount =
      post.hidden_media_urls && Array.isArray(post.hidden_media_urls)
        ? post.hidden_media_urls.length
        : 0;

    processedPosts.push({
      ...post,
      hidden_content: null,
      hidden_media_urls: null,
      is_hidden_unlocked: false,
      hidden_word_count: hiddenWordCount,
      hidden_image_count: hiddenImageCount,
    });
  }

  return processedPosts;
};
