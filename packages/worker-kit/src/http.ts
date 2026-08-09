/**
 * http.ts — request reading and response shapes for a JSON API worker.
 *
 * The body cap is checked twice: once against `content-length`, which is
 * cheap and rejects an honest large upload before any work, and again while
 * reading, because `content-length` is a claim rather than a fact.
 */

export class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

export interface ReadJsonBodyOptions {
  readonly maxBytes?: number;
  /** Required substring of the content-type header. */
  readonly contentType?: string;
}

export async function readJsonBody(request: Request, options: ReadJsonBodyOptions = {}): Promise<unknown> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const expected = (options.contentType ?? 'application/json').toLowerCase();

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new RequestError('Payload too large', 413);
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes(expected)) throw new RequestError('Expected JSON', 415);
  if (!request.body) throw new RequestError('Missing JSON body', 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new RequestError('Payload too large', 413); }
    body += decoder.decode(chunk.value, { stream: true });
  }
  body += decoder.decode();

  try { return JSON.parse(body) as unknown; } catch { throw new RequestError('Invalid JSON', 400); }
}

/** API responses are never cached; the state they describe changes underneath. */
export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}

export function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

export interface ErrorResponseOptions {
  readonly path?: string;
  /** Message for failures that are not a `RequestError`. */
  readonly message?: string;
  log?(line: string): void;
}

/**
 * A `RequestError` states its own status and is safe to show. Anything else is
 * an internal fault: it is logged and answered with a generic 500, so an
 * exception message never leaks into a response body.
 */
export function errorResponse(cause: unknown, options: ErrorResponseOptions = {}): Response {
  if (cause instanceof RequestError) return error(cause.message, cause.status);
  const detail = cause instanceof Error ? cause.message : String(cause);
  const log = options.log ?? ((line: string) => { console.error(line); });
  log(JSON.stringify({ message: 'Request failed', path: options.path, error: detail }));
  return error(options.message ?? 'Internal server error.', 500);
}
