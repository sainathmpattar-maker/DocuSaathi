'use strict';

/**
 * middleware/upload.js
 *
 * Configures Multer for in-memory file buffering and initial upload validation.
 * Memory storage ensures no unencrypted temporary files linger on the disk.
 */

const multer = require('multer');
const { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } = require('../utils/fileValidation');

// Configure in-memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Only 1 file per upload request
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      const err = new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.');
      err.code = 'INVALID_MIME_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  },
});

/**
 * Express middleware wrapper to handle Multer upload and catch Multer-specific errors.
 */
function handleSingleUpload(fieldName = 'file') {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds the 10 MB limit.',
              },
            });
          }
          return res.status(400).json({
            success: false,
            error: {
              code: err.code,
              message: err.message || 'File upload error.',
            },
          });
        }

        if (err.code === 'INVALID_MIME_TYPE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: err.message,
            },
          });
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: err.message || 'Failed to process uploaded file.',
          },
        });
      }
      next();
    });
  };
}

module.exports = {
  handleSingleUpload,
};
