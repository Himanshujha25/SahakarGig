import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";

// Initialize Cloudinary frontend instance
export const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "om7ghkav",
  },
});

/**
 * Transforms a Cloudinary public_id or image URL with auto-format and auto-quality.
 *
 * @param {string} src - Cloudinary public_id or full URL
 * @param {object} [options={}] - Resize width, height, crop options
 * @returns {string} Fast CDN URL
 */
export function getOptimizedImageUrl(src, { width, height, crop = "auto" } = {}) {
  if (!src) return "";

  // If not a Cloudinary URL (e.g. data:image or local), return as is
  if (!src.includes("cloudinary.com") && (src.startsWith("data:") || src.startsWith("http"))) {
    return src;
  }

  // If it's a Cloudinary URL, inject f_auto,q_auto transforms for fast loading
  if (src.includes("/upload/")) {
    let transformString = "f_auto,q_auto";
    if (width && height) {
      transformString += `,w_${width},h_${height},c_${crop}`;
    } else if (width) {
      transformString += `,w_${width}`;
    }
    return src.replace("/upload/", `/upload/${transformString}/`);
  }

  // Treat as public_id
  const img = cld
    .image(src)
    .format("auto")
    .quality("auto");

  if (width && height) {
    img.resize(auto().gravity(autoGravity()).width(width).height(height));
  } else if (width) {
    img.resize(auto().width(width));
  }

  return img.toURL();
}
