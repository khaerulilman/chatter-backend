export const makeFollowUseCases = ({
  idService,
  followRepository,
  notifyService,
}) => {
  const toggleFollowService = async (followerId, followingId) => {
    if (followerId === followingId) {
      throw new Error("You cannot follow yourself.");
    }

    const follower = await followRepository.findUserById(followerId);
    if (!follower) throw new Error("Follower user not found.");

    const following = await followRepository.findUserById(followingId);
    if (!following) throw new Error("Target user not found.");

    const existingFollow = await followRepository.findFollow(
      followerId,
      followingId,
    );

    if (existingFollow) {
      await followRepository.deleteFollow(followerId, followingId);
      const followerCount = await followRepository.countFollowers(followingId);
      return {
        following: false,
        message: "Unfollowed successfully.",
        followerCount,
      };
    }

    const newFollow = {
      id: idService.generateId(),
      follower_id: followerId,
      following_id: followingId,
      created_at: new Date().toISOString(),
    };

    await followRepository.createFollow(newFollow);
    const followerCount = await followRepository.countFollowers(followingId);

    await notifyService.createNotificationService({
      recipient_id: followingId,
      actor_id: followerId,
      type: "follow",
      entity_id: null,
    });

    return {
      following: true,
      message: "Followed successfully.",
      followerCount,
    };
  };

  const getFollowStatusService = async (followerId, followingId) => {
    const isFollowing = !!(await followRepository.findFollow(
      followerId,
      followingId,
    ));
    const followerCount = await followRepository.countFollowers(followingId);
    const followingCount = await followRepository.countFollowing(followingId);
    return { isFollowing, followerCount, followingCount };
  };

  const getFollowersService = async (userId) => {
    const user = await followRepository.findUserById(userId);
    if (!user) throw new Error("User not found.");
    return await followRepository.getFollowers(userId);
  };

  const getFollowingService = async (userId) => {
    const user = await followRepository.findUserById(userId);
    if (!user) throw new Error("User not found.");
    return await followRepository.getFollowing(userId);
  };

  const getRecommendedUsersService = async (userId) => {
    return await followRepository.getRecommendedUsers(userId);
  };

  const getFollowStatsService = async (userId) => {
    const user = await followRepository.findUserById(userId);
    if (!user) throw new Error("User not found.");
    const followerCount = await followRepository.countFollowers(userId);
    const followingCount = await followRepository.countFollowing(userId);
    return { followerCount, followingCount };
  };

  const getFollowingIdsService = async (userId) => {
    return await followRepository.getFollowingIds(userId);
  };

  return {
    toggleFollowService,
    getFollowStatusService,
    getFollowersService,
    getFollowingService,
    getRecommendedUsersService,
    getFollowStatsService,
    getFollowingIdsService,
  };
};
