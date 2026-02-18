import {
  getUsersService,
  getUserByUsernameService,
  updateProfileService,
} from "./users.services.js";
import { getPostsByUserIdService } from "../posts/posts.services.js";

const getUsers = async (req, res) => {
  try {
    const users = await getUsersService();
    res.status(200).json({
      message: "Users retrieved successfully.",
      data: users,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await getUserByUsernameService(username);
    res.status(200).json({ user });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ message: "User not found." });
    }
    console.error("Error retrieving user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const getPostsByUser = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const posts = await getPostsByUserIdService(
      userId,
      parseInt(page),
      parseInt(limit),
    );
    res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching posts by user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await updateProfileService(userId, req.body, req.files);
    const { password, token, ...userWithoutSensitive } = updatedUser;
    res.status(200).json({ user: userWithoutSensitive });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui profil", error: error.message });
  }
};

export { getUsers, getUserByUsername, getPostsByUser, updateProfile };
