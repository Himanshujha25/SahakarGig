import { useMemo } from "react";
import { cld } from "../lib/cloudinary";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";

/**
 * High-performance Cloudinary media component that delivers WebP/AVIF images
 * with automatic responsive compression and CDN caching.
 */
export default function CloudinaryMedia({
  publicId,
  src,
  alt = "Media",
  className = "",
  width,
  height,
  crop = "auto",
  fallback = null,
}) {
  const isDirectUrl = src && (src.startsWith("http") || src.startsWith("data:"));

  const cldImage = useMemo(() => {
    const id = publicId || (!isDirectUrl ? src : null);
    if (!id) return null;

    try {
      const img = cld
        .image(id)
        .format("auto")
        .quality("auto");

      if (width && height) {
        img.resize(auto().gravity(autoGravity()).width(width).height(height));
      } else if (width) {
        img.resize(auto().width(width));
      }

      return img;
    } catch {
      return null;
    }
  }, [publicId, src, isDirectUrl, width, height, crop]);

  if (cldImage) {
    return <AdvancedImage cldImg={cldImage} alt={alt} className={className} />;
  }

  if (isDirectUrl) {
    // If it's a Cloudinary URL, inject f_auto,q_auto
    let optimizedSrc = src;
    if (src.includes("cloudinary.com") && src.includes("/upload/")) {
      const transform = width && height ? `f_auto,q_auto,w_${width},h_${height},c_${crop}` : "f_auto,q_auto";
      optimizedSrc = src.replace("/upload/", `/upload/${transform}/`);
    }
    return <img src={optimizedSrc} alt={alt} className={className} loading="lazy" />;
  }

  return fallback;
}
