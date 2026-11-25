import { MAX_IMAGE_BYTES, type ImageMediaType } from '../../src/schemas/api.js';
import { ApiError } from './errors.js';

// The photo is checked by what it really is, not by what the request says: the first bytes
// must match one of the allowed formats and the declared type. Nothing is decoded or run.

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function sniffImageType(bytes: Uint8Array): ImageMediaType | null {
  const at = (index: number) => bytes[index];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  ) {
    return 'image/png';
  }
  // "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/** The size the base64 text will have after decoding, worked out without decoding it. */
function decodedSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function decodeImage(
  base64: string,
  declared: ImageMediaType,
  maxBytes: number = MAX_IMAGE_BYTES,
): Uint8Array {
  if (!BASE64.test(base64)) throw new ApiError('BAD_REQUEST');
  // too big: refuse before the memory for the decoded bytes is allocated
  if (decodedSize(base64) > maxBytes) throw new ApiError('IMAGE_TOO_LARGE');

  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  if (bytes.byteLength === 0) throw new ApiError('BAD_REQUEST');
  if (bytes.byteLength > maxBytes) throw new ApiError('IMAGE_TOO_LARGE');
  if (sniffImageType(bytes) !== declared) throw new ApiError('UNSUPPORTED_FORMAT');
  return bytes;
}
