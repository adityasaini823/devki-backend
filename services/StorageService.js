import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import logger from '../logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class StorageService {
  /**
   * Uploads a file to Cloudinary
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options (folder, publicId, etc.)
   * @returns {Promise<Object>} - Upload result with URL
   */
  async upload(file, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const { folder = 'devki_uploads' } = options;
        
        // Use upload_stream to handle buffer from memory storage
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              filename: result.original_filename,
              mimetype: result.format ? `image/${result.format}` : file.mimetype,
              size: result.bytes,
            });
          }
        );

        // Pipe the buffer to the stream
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      } catch (error) {
        logger.error('Error in StorageService.upload:', error);
        reject(error);
      }
    });
  }

  /**
   * Deletes a file from Cloudinary
   * @param {string} publicId - Cloudinary public_id
   * @returns {Promise<boolean>}
   */
  async delete(publicId) {
    try {
      if (!publicId) return false;
      
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`Deleted file from Cloudinary: ${publicId}`, result);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Error in StorageService.delete:', error);
      throw error;
    }
  }
}

export default new StorageService();
