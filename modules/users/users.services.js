import bcrypt from "bcrypt";
import ImageKit from "imagekit";
import {
  findAllUsers,
  findUserById,
  findUserByUsername,
  updateUser,
} from "./users.repositories.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: "public_W3TJLavXEwO7+L/fFTIjA7PsMAQ=",
  privateKey: "private_rK2ZYENIoaTPbVA2XAIkaehZ2sM=",
  urlEndpoint: "https://ik.imagekit.io/fs0yie8l6",
});

const getUsersService = async () => {
  const users = await findAllUsers();
  // Set default images for all users
  return users.map((user) => ({
    ...user,
    profile_picture:
      user.profile_picture ||
      "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171",
    header_picture:
      user.header_picture ||
      "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.avif?updatedAt=1736214212559",
  }));
};

const getUserByUsernameService = async (username) => {
  const user = await findUserByUsername(username);
  if (!user) throw new Error("User not found");
  const { password, token, ...publicUser } = user;

  // Set default images if not set
  publicUser.profile_picture =
    publicUser.profile_picture ||
    "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171";
  publicUser.header_picture =
    publicUser.header_picture ||
    "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.avif?updatedAt=1736214212559";

  return publicUser;
};

const updateProfileService = async (userId, updates, files) => {
  const currentUser = await findUserById(userId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const dbUpdates = {};

  // Handle name
  if (updates.name) {
    dbUpdates.name = updates.name;
  }

  // Handle password
  if (updates.password) {
    dbUpdates.password = await bcrypt.hash(updates.password, 10);
  }

  // Handle file uploads
  if (files) {
    const { profile_picture, header_picture } = files;

    // Upload profile_picture
    if (profile_picture) {
      // Delete old profile picture
      if (currentUser.profile_picture) {
        try {
          const fileId = currentUser.profile_picture
            .split("/")
            .pop()
            .split(".")[0];
          await imagekit.deleteFile(fileId);
        } catch (deleteError) {
          console.error("Failed to delete old profile picture:", deleteError);
        }
      }

      // Upload new profile picture
      const result = await imagekit.upload({
        file: profile_picture[0].buffer,
        fileName: `profile_${userId}_${Date.now()}`,
        folder: "/users/profile",
      });
      dbUpdates.profile_picture = result.url;
    }

    // Upload header_picture
    if (header_picture) {
      // Delete old header picture
      if (currentUser.header_picture) {
        try {
          const fileId = currentUser.header_picture
            .split("/")
            .pop()
            .split(".")[0];
          await imagekit.deleteFile(fileId);
        } catch (deleteError) {
          console.error("Failed to delete old header picture:", deleteError);
        }
      }

      // Upload new header picture
      const result = await imagekit.upload({
        file: header_picture[0].buffer,
        fileName: `header_${userId}_${Date.now()}`,
        folder: "/users/header",
      });
      dbUpdates.header_picture = result.url;
    }
  }

  // Update user in database
  await updateUser(userId, dbUpdates);

  // Return updated user
  const updatedUser = await findUserById(userId);
  // Set default images if not set
  updatedUser.profile_picture =
    updatedUser.profile_picture ||
    "https://ik.imagekit.io/fs0yie8l6/images%20(13).jpg?updatedAt=1736213176171";
  updatedUser.header_picture =
    updatedUser.header_picture ||
    "https://ik.imagekit.io/fs0yie8l6/smooth-gray-background-with-high-quality_53876-124606.png?updatedAt=1736214212559";
  return updatedUser;
};

export { getUsersService, getUserByUsernameService, updateProfileService };
