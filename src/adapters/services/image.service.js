import imagekit from "../../frameworks/imagekit/imagekit.js";

// Upload file ke ImageKit.
export const upload = (opts) =>
  new Promise((resolve, reject) => {
    imagekit.upload(opts, (error, result) => {
      if (error) return reject(new Error("ImageKit upload failed."));
      resolve(result);
    });
  });

// Hapus file dari ImageKit berdasarkan fileId.
export const deleteFile = (fileId) => imagekit.deleteFile(fileId);
