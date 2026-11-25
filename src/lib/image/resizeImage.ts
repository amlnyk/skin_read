import { err, ok, type Result } from '../result';

// Shrinks a photo before it is sent: the longer side to MAX_SIDE, JPEG at quality 0.8.
// Drawing the picture on a canvas also drops everything the file carried besides the pixels
// (EXIF, and with it the place where the photo was taken). If the result is still over the limit
// the quality and then the size go down in steps; if nothing helps the photo is refused.
// The browser parts (decoding, drawing) are behind ImageDeps, so the rest runs in tests.

export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.8;
export const MAX_BYTES = 1_500_000;

// What is tried when the first attempt is too big: [quality, longer side].
const FALLBACKS: readonly (readonly [number, number])[] = [
  [0.7, 1600],
  [0.6, 1400],
  [0.5, 1200],
  [0.5, 1000],
];

export type ImageError = {
  /** NOT_AN_IMAGE: not a picture; UNREADABLE: the browser cannot open it; TOO_BIG: still over the limit. */
  readonly code: 'NOT_AN_IMAGE' | 'UNREADABLE' | 'TOO_BIG';
};

export type DecodedImage = {
  readonly width: number;
  readonly height: number;
  /** Frees what the browser holds for the picture. */
  release(): void;
};

export interface ImageDeps {
  /** null when the browser cannot open the file. The orientation from EXIF is applied. */
  decode(file: Blob): Promise<DecodedImage | null>;
  /** The picture as a JPEG of the given size, or null when drawing failed. */
  encode(image: DecodedImage, width: number, height: number, quality: number): Promise<Blob | null>;
}

/** The size that fits `maxSide` with the same proportions; a small picture is not enlarged. */
export function fitSize(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longer = Math.max(width, height);
  if (longer <= maxSide) return { width, height };
  const scale = maxSide / longer;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function resizeImage(file: Blob, deps: ImageDeps): Promise<Result<Blob, ImageError>> {
  if (!file.type.startsWith('image/')) return err({ code: 'NOT_AN_IMAGE' });

  const image = await deps.decode(file);
  if (!image || image.width < 1 || image.height < 1) return err({ code: 'UNREADABLE' });

  try {
    const attempts: readonly (readonly [number, number])[] = [
      [JPEG_QUALITY, MAX_SIDE],
      ...FALLBACKS,
    ];
    let produced = false;
    for (const [quality, side] of attempts) {
      const size = fitSize(image.width, image.height, side);
      const blob = await deps.encode(image, size.width, size.height, quality);
      if (!blob) continue;
      produced = true;
      if (blob.size <= MAX_BYTES) return ok(blob);
    }
    return err({ code: produced ? 'TOO_BIG' : 'UNREADABLE' });
  } finally {
    image.release();
  }
}
