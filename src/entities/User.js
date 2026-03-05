// User Entity - Core domain object
// Struktur: { id, name, email, username, password,
//             profile_picture, header_picture, token, isVerified, created_at }

export const DEFAULT_PROFILE_PICTURE =
  "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171";

export const DEFAULT_HEADER_PICTURE =
  "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.avif?updatedAt=1736214212559";

// Validasi format username.
// Return: { valid: boolean, message?: string }
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;

  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: "Username hanya boleh berisi huruf, angka, dan underscore.",
    };
  }
  if (username.length < 3 || username.length > 50) {
    return {
      valid: false,
      message: "Username harus antara 3-50 karakter.",
    };
  }
  if (/\s/.test(username)) {
    return {
      valid: false,
      message: "Username tidak boleh mengandung spasi.",
    };
  }

  return { valid: true };
};

// Hapus field sensitif (password, token) dari objek user.
export const toPublicUser = (user) => {
  const { password, token, ...publicData } = user;
  publicData.profile_picture =
    publicData.profile_picture || DEFAULT_PROFILE_PICTURE;
  publicData.header_picture =
    publicData.header_picture || DEFAULT_HEADER_PICTURE;
  return publicData;
};
