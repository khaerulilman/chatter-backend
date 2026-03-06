import imagekit from "../../frameworks/imagekit/imagekit.js";

// Upload file ke ImageKit.
export const upload = (opts) =>
  new Promise((resolve, reject) => {
    imagekit.upload(opts, (error, result) => {
      if (error) return reject(new Error("ImageKit upload failed."));
      resolve(result);
    });
  });

// Hapus satu file dari ImageKit berdasarkan fileId.
export const deleteFile = (fileId) => imagekit.deleteFile(fileId);

// Hapus banyak file dari ImageKit sekaligus (max 100).
export const deleteFiles = (fileIds) =>
  new Promise((resolve, reject) => {
    imagekit.bulkDeleteFiles(fileIds, (error, result) => {
      if (error) return reject(new Error("ImageKit bulk delete failed."));
      resolve(result);
    });
  });
