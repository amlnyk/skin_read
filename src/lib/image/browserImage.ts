import type { DecodedImage, ImageDeps } from './resizeImage';

// The real browser side of resizeImage: createImageBitmap to open the file (the orientation
// from EXIF is applied, so a portrait photo stays upright) and a canvas to draw and encode.
// It needs a browser, so it is tested by hand on a phone (see the checks of stage 11).

type Decoded = DecodedImage & { readonly bitmap: ImageBitmap };

export const browserImageDeps: ImageDeps = {
  async decode(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        bitmap,
        release: () => bitmap.close(),
      } satisfies Decoded;
    } catch {
      return null;
    }
  },

  async encode(image, width, height, quality) {
    const bitmap = (image as Decoded).bitmap;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    // a white background: a PNG with transparency would otherwise turn black in a JPEG
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  },
};
