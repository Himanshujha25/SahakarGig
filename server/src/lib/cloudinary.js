const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment credentials or fallback keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'om7ghkav',
  api_key: process.env.CLOUDINARY_API_KEY || '564711955336682',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'rwv6ieXxx8RuhpYZeY0EHR_X7EU',
  secure: true,
});

/**
 * Upload an image, video, or document (base64, file path, buffer, or remote URL) to Cloudinary.
 * Automatically enables auto-format (WebP/AVIF) and auto-quality for maximum delivery speed.
 *
 * @param {string|Buffer} file - Base64 data URL, file path, remote URL, or buffer
 * @param {object} [options={}] - Custom Cloudinary upload options
 * @returns {Promise<{url: string, public_id: string, format: string, width: number, height: number}>}
 */
async function uploadMedia(file, options = {}) {
  if (!file) return { url: '' };

  // If already a Cloudinary URL or regular HTTP URL without base64, return as is
  if (typeof file === 'string' && file.startsWith('http') && file.includes('cloudinary.com')) {
    return { url: file };
  }

  const folder = options.folder || 'sahakargig';
  const resourceType = options.resource_type || 'auto';

  try {
    const uploadResult = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: resourceType,
      fetch_format: 'auto',
      quality: 'auto',
      ...options,
    });

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      resource_type: uploadResult.resource_type,
    };
  } catch (error) {
    console.error('⚠️ [Cloudinary Upload Error]', error.message);
    // Graceful fallback: return original string if upload fails so user flow is not broken
    return { url: typeof file === 'string' ? file : '' };
  }
}

/**
 * Generates an optimized Cloudinary delivery URL with auto-format and auto-quality.
 *
 * @param {string} publicId - Cloudinary public_id or image identifier
 * @param {object} [transforms={}] - Transformations (width, height, crop, gravity, etc.)
 * @returns {string} Optimized CDN URL
 */
function getOptimizedUrl(publicId, transforms = {}) {
  if (!publicId) return '';
  if (publicId.startsWith('http')) return publicId;

  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    crop: transforms.crop || 'auto',
    gravity: transforms.gravity || 'auto',
    width: transforms.width,
    height: transforms.height,
    secure: true,
  });
}

module.exports = {
  cloudinary,
  uploadMedia,
  getOptimizedUrl,
};
