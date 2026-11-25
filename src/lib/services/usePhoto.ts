import { useCallback, useEffect, useRef, useState } from 'react';
import { useServices } from './ServicesContext';

/**
 * The photo of a product that was kept on this device (see PhotoStore), as an address an image
 * can show. `url` is null when there is no photo (or none can be read). The address is freed
 * when the screen goes away. `remove` deletes the photo from the device.
 */
export function usePhoto(productId: string): { url: string | null; remove: () => Promise<void> } {
  const { photos } = useServices();
  const [url, setUrl] = useState<string | null>(null);
  const created = useRef<string | null>(null);

  const release = useCallback(() => {
    if (created.current !== null) URL.revokeObjectURL(created.current);
    created.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void photos.get(productId).then((result) => {
      if (cancelled || !result.ok || result.value === null) return;
      release();
      created.current = URL.createObjectURL(result.value);
      setUrl(created.current);
    });
    return () => {
      cancelled = true;
      release();
    };
  }, [photos, productId, release]);

  const remove = useCallback(async () => {
    const result = await photos.remove(productId);
    // if the photo could not be deleted, it stays on the screen: it is still on the device
    if (!result.ok) return;
    release();
    setUrl(null);
  }, [photos, productId, release]);

  return { url, remove };
}
