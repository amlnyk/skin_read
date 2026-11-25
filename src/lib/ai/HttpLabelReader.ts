import {
  IMAGE_MEDIA_TYPES,
  analyzeLabelResponseSchema,
  apiErrorSchema,
  type ApiErrorCode,
} from '@/schemas';
import type { LabelReader, LabelReaderErrorCode } from '../ports';
import { err, ok } from '../result';

// The label reader that talks to our own server function (POST /api/analyze-label).
// Every failure is a value with a code the screen can explain; nothing here throws.
// The photo is sent once, nothing is stored, and the text of the answer is checked by a schema.

export const ANALYZE_ENDPOINT = '/api/analyze-label';
export const CLIENT_TIMEOUT_MS = 20_000;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

type Options = {
  endpoint?: string;
  timeoutMs?: number;
  /** Replaced by a fake in tests. The default is the browser's fetch, looked up at the call. */
  fetchImpl?: FetchLike;
};

// How the codes of the server become the codes of the app.
const FROM_SERVER: Readonly<Record<ApiErrorCode, LabelReaderErrorCode>> = {
  BAD_REQUEST: 'BAD_REQUEST',
  METHOD_NOT_ALLOWED: 'UNAVAILABLE',
  ORIGIN_NOT_ALLOWED: 'UNAVAILABLE',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  NO_INGREDIENTS_FOUND: 'NO_INGREDIENTS_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'UNAVAILABLE',
  AI_BAD_RESPONSE: 'BAD_RESPONSE',
  AI_UNAVAILABLE: 'UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
};

const isAllowedType = (type: string): boolean =>
  (IMAGE_MEDIA_TYPES as readonly string[]).includes(type);

// base64 of the bytes, in pieces so that a large photo does not overflow the call stack
async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createHttpLabelReader(options: Options = {}): LabelReader {
  const endpoint = options.endpoint ?? ANALYZE_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? CLIENT_TIMEOUT_MS;

  return {
    async analyze(image) {
      if (!isAllowedType(image.type)) return err({ code: 'UNSUPPORTED_FORMAT' });

      let imageBase64: string;
      try {
        imageBase64 = await toBase64(image);
      } catch {
        return err({ code: 'BAD_REQUEST' });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
        response = await doFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mediaType: image.type }),
          signal: controller.signal,
        });
      } catch (error) {
        const aborted =
          error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
        return err({ code: aborted ? 'TIMEOUT' : 'NETWORK' });
      } finally {
        clearTimeout(timer);
      }

      const body = await readJson(response);

      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(body);
        if (parsed.success) return err({ code: FROM_SERVER[parsed.data.error.code] });
        // an answer that is not ours (no function there, a host error page, a bare 429)
        return err({ code: response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE' });
      }

      const parsed = analyzeLabelResponseSchema.safeParse(body);
      if (!parsed.success) return err({ code: 'BAD_RESPONSE' });
      const text = parsed.data.ingredientsText?.trim() ?? '';
      if (text === '') return err({ code: 'NO_INGREDIENTS_FOUND' });
      return ok({
        ingredientsText: text,
        productName: parsed.data.productName,
        brand: parsed.data.brand,
        categoryGuess: parsed.data.categoryGuess,
        language: parsed.data.language,
        confidence: parsed.data.confidence,
      });
    },
  };
}
