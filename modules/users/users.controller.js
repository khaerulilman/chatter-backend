import { getUsersService, updateProfileService } from "./users.services.js";

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

export { getUsers, updateProfile };
