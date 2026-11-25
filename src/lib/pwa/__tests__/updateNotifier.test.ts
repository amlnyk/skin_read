import { describe, expect, it, vi } from 'vitest';
import { createUpdateNotifier } from '../updateNotifier';

describe('createUpdateNotifier', () => {
  it('is hidden until a new version is ready', () => {
    expect(createUpdateNotifier().getSnapshot()).toBe(false);
  });

  it('shows the message when a version is ready and tells the listeners', () => {
    const notifier = createUpdateNotifier();
    const listener = vi.fn();
    notifier.subscribe(listener);
    notifier.markReady(() => undefined);
    expect(notifier.getSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('apply runs the update once and hides the message', () => {
    const notifier = createUpdateNotifier();
    const apply = vi.fn();
    notifier.markReady(apply);
    notifier.apply();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(notifier.getSnapshot()).toBe(false);
  });

  it('dismiss hides the message without updating', () => {
    const notifier = createUpdateNotifier();
    const apply = vi.fn();
    notifier.markReady(apply);
    notifier.dismiss();
    expect(apply).not.toHaveBeenCalled();
    expect(notifier.getSnapshot()).toBe(false);
  });

  it('a second ready signal shows the message again after "later"', () => {
    const notifier = createUpdateNotifier();
    notifier.markReady(() => undefined);
    notifier.dismiss();
    notifier.markReady(() => undefined);
    expect(notifier.getSnapshot()).toBe(true);
  });

  it('does not notify when nothing changes, and unsubscribes', () => {
    const notifier = createUpdateNotifier();
    const listener = vi.fn();
    const unsubscribe = notifier.subscribe(listener);
    notifier.dismiss();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    notifier.markReady(() => undefined);
    expect(listener).not.toHaveBeenCalled();
  });

  it('apply without a pending version does nothing', () => {
    const notifier = createUpdateNotifier();
    expect(() => notifier.apply()).not.toThrow();
    expect(notifier.getSnapshot()).toBe(false);
  });
});
