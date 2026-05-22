import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const UPLOADS_DIR = 'public/uploads';
const UPLOADS_URL_PREFIX = '/uploads';
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Magic bytes for allowed image formats.
 * Used to verify actual file content matches the claimed MIME type,
 * preventing MIME spoofing attacks (e.g. uploading HTML as image/png).
 */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (+ WEBP at offset 8)
];

export interface UploadResult {
  url: string;
  filename: string;
}

function generateFilename(originalName: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] || '.png';
  const base = String(originalName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const prefix = base || 'screenshot';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);

  return `${prefix}-${timestamp}-${random}${ext}`;
}

/**
 * Verify file content magic bytes match the claimed MIME type.
 * Prevents MIME spoofing where attacker sends HTML/SVG with image/png type.
 */
function verifyMagicBytes(buffer: Buffer, claimedType: string): boolean {
  if (buffer.length < 12) return false;

  const entry = MAGIC_BYTES.find((m) => m.mime === claimedType);
  if (!entry) return false;

  for (let i = 0; i < entry.bytes.length; i++) {
    if (buffer[i] !== entry.bytes[i]) return false;
  }

  // Extra check for WebP: bytes 8-11 must be "WEBP"
  if (claimedType === 'image/webp') {
    const webpSig = [0x57, 0x45, 0x42, 0x50]; // WEBP
    for (let i = 0; i < webpSig.length; i++) {
      if (buffer[8 + i] !== webpSig[i]) return false;
    }
  }

  return true;
}

export function validateUpload(file: File, buffer: Buffer) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PNG, JPEG, WebP, and GIF images are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image is too large. Maximum size is 8MB.');
  }

  if (!verifyMagicBytes(buffer, file.type)) {
    throw new Error('File content does not match the claimed image type.');
  }
}

/**
 * Save an uploaded image to local filesystem.
 *
 * Security measures:
 * - MIME type whitelist (only 4 image types)
 * - Magic bytes verification (prevents MIME spoofing / polyglot attacks)
 * - Filename sanitization (strips all non-alphanumeric chars)
 * - Path traversal guard (resolved path must stay within uploads dir)
 * - File size limit (8MB)
 *
 * For production (Vercel / Cloudflare Workers), swap this implementation
 * to use Cloudflare R2, Vercel Blob, or any S3-compatible storage.
 */
export async function saveUpload(file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  validateUpload(file, buffer);

  const filename = generateFilename(file.name, file.type);
  const uploadsPath = resolve(process.cwd(), UPLOADS_DIR);

  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  const filePath = resolve(uploadsPath, filename);

  // Path traversal guard: ensure resolved path stays within uploads directory
  if (!filePath.startsWith(uploadsPath + '/')) {
    throw new Error('Invalid filename.');
  }

  writeFileSync(filePath, buffer);

  return {
    url: `${UPLOADS_URL_PREFIX}/${filename}`,
    filename,
  };
}
