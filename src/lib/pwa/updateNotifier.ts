// A tiny store that connects the service worker ("a new version is ready") with the screen.
// It has no browser dependencies: the registration itself lives in main.tsx.

export type UpdateNotifier = {
  /** For useSyncExternalStore. */
  readonly subscribe: (listener: () => void) => () => void;
  /** True while a new version waits and the person has not dismissed the message. */
  readonly getSnapshot: () => boolean;
  /** Called by the service worker registration when a new version is ready. */
  readonly markReady: (apply: () => void) => void;
  /** The person agreed: activate the new version (the page reloads). */
  readonly apply: () => void;
  /** The person chose "later": hide the message, the version stays pending. */
  readonly dismiss: () => void;
};

export function createUpdateNotifier(): UpdateNotifier {
  let visible = false;
  let applyUpdate: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const set = (next: boolean) => {
    if (visible === next) return;
    visible = next;
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => visible,
    markReady(apply) {
      applyUpdate = apply;
      set(true);
    },
    apply() {
      applyUpdate?.();
      set(false);
    },
    dismiss() {
      set(false);
    },
  };
}
