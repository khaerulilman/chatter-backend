import imagekit from "../../frameworks/imagekit/imagekit.js";

// Upload file ke ImageKit.
export const upload = async (opts) => {
  try {
    return await imagekit.upload(opts);
  } catch (error) {
    throw new Error("ImageKit upload failed.");
  }
};

// Hapus satu file dari ImageKit berdasarkan fileId.
export const deleteFile = async (fileId) => {
  return await imagekit.deleteFile(fileId);
};

// Hapus banyak file dari ImageKit sekaligus (max 100).
export const deleteFiles = async (fileIds) => {
  try {
    return await imagekit.bulkDeleteFiles(fileIds);
  } catch (error) {
    throw new Error("ImageKit bulk delete failed.");
  }
};
