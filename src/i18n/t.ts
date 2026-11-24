import { uk } from './uk';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every valid dictionary key, e.g. 'nav.home'. A wrong key does not compile. */
export type MessageKey = Leaves<typeof uk>;

export type MessageParams = Readonly<Record<string, string | number>>;

/** Returns the text for a key. `{name}` placeholders are replaced from params. */
export function t(key: MessageKey, params?: MessageParams): string {
  let node: unknown = uk;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
