import cloudinary from "../config/cloudinary.js";

/*
========================================
☁️ CLOUDINARY UPLOAD SERVICE
Centralizes all image upload logic so
every controller calls the same helper
instead of re-implementing upload logic.
========================================
*/

/**
 * Upload an in-memory file buffer (from multer.memoryStorage())
 * to Cloudinary and return the secure URL.
 *
 * @param {Buffer} buffer     - raw file buffer from req.file.buffer
 * @param {string} folder     - Cloudinary folder, e.g. "campuseventhub/events"
 * @returns {Promise<string>} - secure_url of the uploaded image
 */
export const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Reasonable size cap + format normalization
        transformation: [{ width: 1600, height: 1600, crop: "limit" }],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Upload an image from a remote URL (e.g. Google OAuth avatar)
 * directly to Cloudinary — no local disk write needed.
 *
 * @param {string} url        - remote image URL
 * @param {string} folder     - Cloudinary folder
 * @returns {Promise<string|null>} - secure_url, or null if upload failed
 */
export const uploadUrlToCloudinary = async (url, folder) => {
  if (!url) return null;
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder,
      resource_type: "image",
      transformation: [{ width: 600, height: 600, crop: "limit" }],
    });
    return result.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary URL upload failed:", error.message);
    return null;
  }
};

/**
 * Delete an image from Cloudinary given its secure URL.
 * Extracts the public_id from the URL. Safe to call with
 * non-Cloudinary or empty URLs — it will just no-op.
 *
 * @param {string} secureUrl
 */
export const deleteFromCloudinary = async (secureUrl) => {
  if (!secureUrl || typeof secureUrl !== "string") return;
  if (!secureUrl.includes("res.cloudinary.com")) return;

  try {
    // Extract public_id: everything after /upload/v123456/ and before the extension
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match || !match[1]) return;
    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("❌ Cloudinary delete failed:", error.message);
  }
};