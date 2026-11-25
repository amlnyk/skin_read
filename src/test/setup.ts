import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom has no object addresses for blobs; the pictures of the tests only need some address.
if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  URL.createObjectURL = () => `blob:test-${(counter += 1)}`;
  URL.revokeObjectURL = () => undefined;
}
