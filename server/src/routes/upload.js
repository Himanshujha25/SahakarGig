const router = require('express').Router();
const { uploadMedia } = require('../lib/cloudinary');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

/**
 * POST /api/upload
 * Direct media upload to Cloudinary CDN with automatic WebP/AVIF compression.
 * Accepts JSON payload: { file: "data:image/...", folder: "sahakargig/proofs" }
 */
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const folder = req.body?.folder || 'sahakargig/general';
    const fileInput = req.body?.file || req.body?.image;

    if (!fileInput) {
      return res.status(400).json({ message: 'No file or image payload provided for upload.' });
    }

    const result = await uploadMedia(fileInput, { folder });
    if (!result?.url) {
      return res.status(500).json({ message: 'Cloudinary upload failed.' });
    }

    res.json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  })
);

/**
 * POST /api/upload/multiple
 * Batch upload multiple images/documents to Cloudinary CDN.
 * Accepts JSON payload: { files: ["data:...", ...], folder: "..." }
 */
router.post(
  '/multiple',
  auth,
  asyncHandler(async (req, res) => {
    const folder = req.body?.folder || 'sahakargig/evidence';
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!files.length) {
      return res.status(400).json({ message: 'No files provided for batch upload.' });
    }

    const uploadResults = await Promise.all(
      files.map((file) => uploadMedia(file, { folder }))
    );

    res.json({
      success: true,
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  })
);

module.exports = router;
