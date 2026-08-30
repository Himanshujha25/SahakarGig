const router = require('express').Router();
const multer = require('multer');
const { uploadMedia } = require('../lib/cloudinary');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

// In-memory buffer storage for immediate Cloudinary piping
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * POST /api/upload
 * Direct media upload to Cloudinary CDN with automatic WebP/AVIF compression.
 * Accepts either:
 *  1. Base64 payload in JSON: { file: "data:image/...", folder: "sahakargig/proofs" }
 *  2. Multipart file form data: field name "file"
 */
router.post(
  '/',
  auth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const folder = req.body?.folder || 'sahakargig/general';
    let fileInput = req.body?.file || req.body?.image;

    // If sent as multipart form-data via Multer
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      fileInput = `data:${req.file.mimetype};base64,${b64}`;
    }

    if (!fileInput) {
      return res.status(400).json({ message: 'No file or image payload provided for upload.' });
    }

    const result = await uploadMedia(fileInput, { folder });
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
 */
router.post(
  '/multiple',
  auth,
  upload.array('files', 6),
  asyncHandler(async (req, res) => {
    const folder = req.body?.folder || 'sahakargig/evidence';
    const files = [];

    // Form-data files
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const b64 = f.buffer.toString('base64');
        files.push(`data:${f.mimetype};base64,${b64}`);
      }
    } else if (Array.isArray(req.body?.files)) {
      files.push(...req.body.files);
    }

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
