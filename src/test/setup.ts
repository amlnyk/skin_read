import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Lazy screens are separate chunks. With 87 test files running in parallel the first import of a
// chunk can take over the default 1 s of findBy*, which made a test fail at random (stage 14).
// 5 s only raises the ceiling: a test that passes still finishes as soon as the screen is there.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no object addresses for blobs; the pictures of the tests only need some address.
if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  URL.createObjectURL = () => `blob:test-${(counter += 1)}`;
  URL.revokeObjectURL = () => undefined;
}
