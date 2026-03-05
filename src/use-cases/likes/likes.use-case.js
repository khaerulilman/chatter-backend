export const makeLikeUseCases = ({
  idService,
  likeRepository,
  notifyService,
}) => {
  const toggleLikeService = async (userId, postId) => {
    const user = await likeRepository.findUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const post = await likeRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const existingLike = await likeRepository.findLike(userId, postId);

    let result;
    if (existingLike) {
      await likeRepository.deleteLike(userId, postId);
      const likeCount = await likeRepository.countLikesByPostId(postId);
      result = {
        liked: false,
        message: "Like removed successfully.",
        likeCount,
        isLiked: false,
      };
    } else {
      const newLike = {
        id: idService.generateUUID(),
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString(),
      };

      await likeRepository.createLike(newLike);
      const likeCount = await likeRepository.countLikesByPostId(postId);

      await notifyService.createNotificationService({
        recipient_id: post.user_id,
        actor_id: userId,
        type: "like",
        entity_id: postId,
      });

      result = {
        liked: true,
        message: "Post liked successfully.",
        like: newLike,
        likeCount,
        isLiked: true,
      };
    }

    return result;
  };

  const getLikeStatusService = async (userId, postId) => {
    const user = await likeRepository.findUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const post = await likeRepository.findPostById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const isLiked = await likeRepository.isPostLikedByUser(userId, postId);
    const likeCount = await likeRepository.countLikesByPostId(postId);

    return { isLiked, likeCount };
  };

  return {
    toggleLikeService,
    getLikeStatusService,
  };
};
