import { describe, expect, it } from 'vitest';
import { createFakeImageDeps } from '@/test/fakes';
import {
  fitSize,
  JPEG_QUALITY,
  MAX_BYTES,
  MAX_SIDE,
  resizeImage,
  type ImageDeps,
} from './resizeImage';

const file = (type = 'image/jpeg') => new Blob([new Uint8Array(10)], { type });

describe('fitSize', () => {
  it('shrinks the longer side to the limit and keeps the proportions', () => {
    expect(fitSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('does not enlarge a small picture', () => {
    expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitSize(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('never gives a side below 1', () => {
    expect(fitSize(10_000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

describe('resizeImage', () => {
  it('first try: longer side 1600, quality 0.8', async () => {
    const deps = createFakeImageDeps({ width: 4000, height: 3000, sizes: [200_000] });
    const result = await resizeImage(file(), deps);
    expect(result.ok).toBe(true);
    expect(deps.encoded).toEqual([{ width: MAX_SIDE, height: 1200, quality: JPEG_QUALITY }]);
    if (result.ok) expect(result.value.type).toBe('image/jpeg');
  });

  it('a small picture is not enlarged', async () => {
    const deps = createFakeImageDeps({ width: 800, height: 600 });
    await resizeImage(file(), deps);
    expect(deps.encoded[0]).toEqual({ width: 800, height: 600, quality: JPEG_QUALITY });
  });

  it('takes png and webp too: the result is always a JPEG', async () => {
    for (const type of ['image/png', 'image/webp']) {
      const result = await resizeImage(file(type), createFakeImageDeps());
      expect(result.ok && result.value.type).toBe('image/jpeg');
    }
  });

  it('too big: quality and size go down in steps until it fits', async () => {
    const deps = createFakeImageDeps({
      width: 4000,
      height: 3000,
      sizes: [MAX_BYTES + 1, MAX_BYTES + 1, 900_000],
    });
    const result = await resizeImage(file(), deps);
    expect(result.ok).toBe(true);
    expect(deps.encoded).toHaveLength(3);
    expect(deps.encoded[1]?.quality).toBeLessThan(JPEG_QUALITY);
    expect(deps.encoded[2]?.width).toBeLessThan(MAX_SIDE);
  });

  it('still too big after the last step: refused', async () => {
    const deps = createFakeImageDeps({ sizes: [MAX_BYTES + 1] });
    expect(await resizeImage(file(), deps)).toEqual({ ok: false, error: { code: 'TOO_BIG' } });
    expect(deps.encoded).toHaveLength(5);
  });

  it('exactly at the limit is accepted', async () => {
    const deps = createFakeImageDeps({ sizes: [MAX_BYTES] });
    expect((await resizeImage(file(), deps)).ok).toBe(true);
  });

  it('not a picture: refused without opening it', async () => {
    const deps = createFakeImageDeps();
    expect(await resizeImage(file('text/plain'), deps)).toEqual({
      ok: false,
      error: { code: 'NOT_AN_IMAGE' },
    });
    expect(deps.encoded).toHaveLength(0);
  });

  it('the browser cannot open it: unreadable', async () => {
    expect(await resizeImage(file(), createFakeImageDeps({ unreadable: true }))).toEqual({
      ok: false,
      error: { code: 'UNREADABLE' },
    });
  });

  it('drawing always fails: unreadable, and what the browser held is freed', async () => {
    let released = 0;
    const deps: ImageDeps = {
      decode: () =>
        Promise.resolve({ width: 100, height: 100, release: () => void (released += 1) }),
      encode: () => Promise.resolve(null),
    };
    expect(await resizeImage(file(), deps)).toEqual({ ok: false, error: { code: 'UNREADABLE' } });
    expect(released).toBe(1);
  });

  it('frees the picture after success as well', async () => {
    let released = 0;
    const deps: ImageDeps = {
      decode: () =>
        Promise.resolve({ width: 100, height: 100, release: () => void (released += 1) }),
      encode: () => Promise.resolve(new Blob([new Uint8Array(5)], { type: 'image/jpeg' })),
    };
    await resizeImage(file(), deps);
    expect(released).toBe(1);
  });
});
