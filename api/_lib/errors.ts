import type { ApiErrorBody, ApiErrorCode } from '../../src/schemas/api.js';

// One place for error codes, HTTP statuses and the texts. The texts are general on purpose:
// no stack, no detail of the implementation, nothing from the request.

export const STATUS: Readonly<Record<ApiErrorCode, number>> = {
  BAD_REQUEST: 400,
  METHOD_NOT_ALLOWED: 405,
  ORIGIN_NOT_ALLOWED: 403,
  IMAGE_TOO_LARGE: 413,
  UNSUPPORTED_FORMAT: 415,
  NO_INGREDIENTS_FOUND: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  AI_BAD_RESPONSE: 502,
  AI_UNAVAILABLE: 503,
  TIMEOUT: 504,
};

const MESSAGES: Readonly<Record<ApiErrorCode, string>> = {
  BAD_REQUEST: 'Не вдалося обробити запит.',
  METHOD_NOT_ALLOWED: 'Цей метод не підтримується.',
  ORIGIN_NOT_ALLOWED: 'Запит відхилено.',
  IMAGE_TOO_LARGE: 'Фото завелике.',
  UNSUPPORTED_FORMAT: 'Формат фото не підтримується.',
  NO_INGREDIENTS_FOUND: 'Склад на фото не знайдено.',
  RATE_LIMITED: 'Забагато запитів. Спробуй пізніше.',
  INTERNAL: 'Щось пішло не так.',
  AI_BAD_RESPONSE: 'Не вдалося розпізнати фото.',
  AI_UNAVAILABLE: 'Сервіс розпізнавання недоступний.',
  TIMEOUT: 'Сервіс відповідає надто довго.',
};

/** A failure that is meant to be sent to the client. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: ApiErrorCode, retryAfterSeconds?: number) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Headers of every answer, success or error.
const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

export function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = { error: { code: error.code, message: MESSAGES[error.code] } };
  const headers: Record<string, string> = {};
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds !== undefined) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil(error.retryAfterSeconds)));
  }
  if (error.code === 'METHOD_NOT_ALLOWED') headers['Allow'] = 'POST';
  return jsonResponse(STATUS[error.code], body, headers);
}
