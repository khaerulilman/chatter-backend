import {
  DEFAULT_PROFILE_PICTURE,
  DEFAULT_HEADER_PICTURE,
} from "../../entities/User.js";

export const makeUserUseCases = ({
  hashService,
  imageService,
  userRepository,
}) => {
  const getUsersService = async () => {
    const users = await userRepository.findAllUsers();
    return users.map((user) => ({
      ...user,
      profile_picture: user.profile_picture || DEFAULT_PROFILE_PICTURE,
      header_picture: user.header_picture || DEFAULT_HEADER_PICTURE,
    }));
  };

  const getUserByUsernameService = async (username) => {
    const user = await userRepository.findUserByUsername(username);
    if (!user) throw new Error("User not found");
    const { password, token, ...publicUser } = user;

    publicUser.profile_picture =
      publicUser.profile_picture || DEFAULT_PROFILE_PICTURE;
    publicUser.header_picture =
      publicUser.header_picture || DEFAULT_HEADER_PICTURE;

    return publicUser;
  };

  const updateProfileService = async (userId, updates, files) => {
    const currentUser = await userRepository.findUserById(userId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    const dbUpdates = {};

    if (updates.name) {
      dbUpdates.name = updates.name;
    }

    if (updates.password) {
      dbUpdates.password = await hashService.hash(updates.password);
    }

    if (files) {
      const { profile_picture, header_picture } = files;

      if (profile_picture) {
        if (currentUser.profile_picture) {
          try {
            const fileId = currentUser.profile_picture
              .split("/")
              .pop()
              .split(".")[0];
            await imageService.deleteFile(fileId);
          } catch (deleteError) {
            console.error("Failed to delete old profile picture:", deleteError);
          }
        }

        const result = await imageService.upload({
          file: profile_picture[0].buffer,
          fileName: `profile_${userId}_${Date.now()}`,
          folder: "/users/profile",
        });
        dbUpdates.profile_picture = result.url;
      }

      if (header_picture) {
        if (currentUser.header_picture) {
          try {
            const fileId = currentUser.header_picture
              .split("/")
              .pop()
              .split(".")[0];
            await imageService.deleteFile(fileId);
          } catch (deleteError) {
            console.error("Failed to delete old header picture:", deleteError);
          }
        }

        const result = await imageService.upload({
          file: header_picture[0].buffer,
          fileName: `header_${userId}_${Date.now()}`,
          folder: "/users/header",
        });
        dbUpdates.header_picture = result.url;
      }
    }

    await userRepository.updateUser(userId, dbUpdates);

    const updatedUser = await userRepository.findUserById(userId);
    updatedUser.profile_picture =
      updatedUser.profile_picture || DEFAULT_PROFILE_PICTURE;
    updatedUser.header_picture =
      updatedUser.header_picture || DEFAULT_HEADER_PICTURE;
    return updatedUser;
  };

  return {
    getUsersService,
    getUserByUsernameService,
    updateProfileService,
  };
};
