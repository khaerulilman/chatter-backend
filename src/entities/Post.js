export const isValidPostId = (postId) => {
  return /^[A-Za-z0-9_-]{21}$/.test(postId);
};
