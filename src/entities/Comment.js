export const isValidCommentId = (commentId) => {
  return /^[A-Za-z0-9_-]{21}$/.test(commentId);
};
