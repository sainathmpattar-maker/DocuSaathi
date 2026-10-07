'use strict';

/**
 * utils/fileValidation.js
 *
 * Strict server-side file validation for DocuSaathi uploads.
 *
 * SECURITY CHECKS:
 * 1. File size limit validation (max 10 MB).
 * 2. MIME type validation against strict allowlist (PDF, JPEG, PNG).
 * 3. File signature (magic bytes) validation to prevent MIME-spoofing attacks.
 * 4. Path traversal prevention and filename sanitization.
 */

const path = require('path');
const crypto = require('crypto');

const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10); // 10 MB default

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

/**
 * Magic bytes signatures:
 * - PDF: 25 50 44 46 2D (%PDF-)
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 */
const MAGIC_NUMBERS = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
};

/**
 * Checks if buffer matches known magic number prefix.
 */
function checkMagicBytes(buffer, expectedBytes) {
  if (!buffer || buffer.length < expectedBytes.length) return false;
  for (let i = 0; i < expectedBytes.length; i++) {
    if (buffer[i] !== expectedBytes[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Validates the file buffer magic bytes against expected MIME type.
 */
function validateMagicBytes(buffer, mimeType) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, message: 'Invalid or empty file buffer.' };
  }

  if (mimeType === 'application/pdf') {
    if (!checkMagicBytes(buffer, MAGIC_NUMBERS.pdf)) {
      return { valid: false, message: 'File header does not match a valid PDF document.' };
    }
  } else if (mimeType === 'image/jpeg') {
    if (!checkMagicBytes(buffer, MAGIC_NUMBERS.jpg)) {
      return { valid: false, message: 'File header does not match a valid JPEG image.' };
    }
  } else if (mimeType === 'image/png') {
    if (!checkMagicBytes(buffer, MAGIC_NUMBERS.png)) {
      return { valid: false, message: 'File header does not match a valid PNG image.' };
    }
  } else {
    return { valid: false, message: 'Unsupported file type.' };
  }

  return { valid: true };
}

/**
 * Sanitizes a client-provided filename for safe database display.
 * Strips path traversal sequences and dangerous control characters.
 */
function sanitizeOriginalFilename(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return 'document_' + Date.now();
  }
  // Strip paths
  const baseName = path.basename(rawName);
  // Remove control characters and non-printable characters
  const sanitized = baseName.replace(/[^\w\s.-]/gi, '_').trim();
  return sanitized.slice(0, 200) || 'document_' + Date.now();
}

/**
 * Generates a collision-resistant safe storage filename.
 */
function generateSafeStorageName(originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  let validExt = ext;
  if (!ALLOWED_EXTENSIONS.has(validExt)) {
    if (mimeType === 'application/pdf') validExt = '.pdf';
    else if (mimeType === 'image/jpeg') validExt = '.jpg';
    else if (mimeType === 'image/png') validExt = '.png';
    else validExt = '.bin';
  }

  const randomPart = crypto.randomBytes(8).toString('hex');
  return `doc_${Date.now()}_${randomPart}${validExt}`;
}

/**
 * Full validation pipeline for an uploaded file object from Multer.
 */
function validateUploadedFile(file) {
  if (!file) {
    return {
      valid: false,
      code: 'NO_FILE_PROVIDED',
      message: 'No file was provided in the upload request.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: `File size exceeds the 10 MB limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  const mimeType = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      code: 'INVALID_FILE_TYPE',
      message: 'Only PDF documents, JPEG, and PNG images are supported.',
    };
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      code: 'INVALID_FILE_EXTENSION',
      message: 'File extension does not match allowed types (.pdf, .jpg, .jpeg, .png).',
    };
  }

  // Verify binary magic bytes
  const magicCheck = validateMagicBytes(file.buffer, mimeType);
  if (!magicCheck.valid) {
    return {
      valid: false,
      code: 'MAGIC_BYTES_MISMATCH',
      message: magicCheck.message,
    };
  }

  return { valid: true };
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  validateUploadedFile,
  validateMagicBytes,
  sanitizeOriginalFilename,
  generateSafeStorageName,
};
