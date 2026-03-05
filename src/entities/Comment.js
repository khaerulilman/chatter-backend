// Comment Entity - Core domain object
// Struktur: { id, user_id, post_id, content, created_at }

// Validasi format commentId (nanoid 21 karakter).
// Return: boolean
export const isValidCommentId = (commentId) => {
  return /^[A-Za-z0-9_-]{21}$/.test(commentId);
};
