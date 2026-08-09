/**
 * auth.ts — one shared password, no accounts.
 *
 * The cookie value is a salted SHA-256 of the password, so it is derived
 * rather than stored: rotating the configured secret invalidates every
 * existing session without a session table. There is nothing to expire, revoke
 * per person, or clean up.
 *
 * What this deliberately does not do: identify who is acting. There are no
 * users, so there is no per-person audit trail, no revocation of one seat, and
 * no recovery beyond changing the shared secret for everyone. That is the
 * correct trade for a small team sharing one instrument, and the wrong one the
 * moment anybody needs to know who changed something.
 *
 * The application's own HTML must be served only after `isAuthenticated`
 * passes, through the platform's asset binding. Never inline it here — an
 * inlined page is a page that ships without the gate in front of it.
 */

const DEFAULT_COOKIE_NAME = 'wi_auth';
const DEFAULT_COOKIE_SALT = 'working-interfaces:v1:';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface LoginPageInput {
  /** True when rendering after a rejected attempt. */
  readonly failed: boolean;
  readonly loginPath: string;
}

export type RenderLogin = (input: LoginPageInput) => string;

export interface PasswordGateOptions {
  readonly password: string;
  readonly cookieName?: string;
  readonly cookieSalt?: string;
  readonly maxAgeSeconds?: number;
  readonly loginPath?: string;
  readonly logoutPath?: string;
  /** Where a successful login and a logout redirect to. */
  readonly redirectTo?: string;
  /** Supply the project's own login page. The default is intentionally bare. */
  readonly renderLogin?: RenderLogin;
}

export interface PasswordGate {
  readonly cookieName: string;
  isAuthenticated(request: Request): Promise<boolean>;
  /** Handles the login and logout routes, or returns null if this is neither. */
  handleAuthRoutes(request: Request): Promise<Response | null>;
  loginResponse(failed?: boolean): Response;
  logout(): Response;
}

/**
 * Unstyled on purpose. A gate that ships with someone else's visual language
 * is a gate every project has to undo, so this one only has to be replaceable.
 */
const defaultLogin: RenderLogin = ({ failed, loginPath }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in</title></head>
<body>
<form method="POST" action="${escapeAttribute(loginPath)}" autocomplete="off">
<h1>Sign in</h1>
<label for="password">Password</label>
<input id="password" name="password" type="password" autofocus required>
<button type="submit">Continue</button>
${failed ? '<p role="alert">Incorrect password.</p>' : ''}
</form>
</body></html>`;

export function createPasswordGate(options: PasswordGateOptions): PasswordGate {
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const cookieSalt = options.cookieSalt ?? DEFAULT_COOKIE_SALT;
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const loginPath = options.loginPath ?? '/login';
  const logoutPath = options.logoutPath ?? '/logout';
  const redirectTo = options.redirectTo ?? '/';
  const renderLogin = options.renderLogin ?? defaultLogin;

  const hash = (value: string): Promise<string> => hashPassword(cookieSalt, value);

  function loginResponse(failed = false): Response {
    return new Response(renderLogin({ failed, loginPath }), {
      status: failed ? 401 : 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  function logout(): Response {
    const cookie = `${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
    return new Response(null, { status: 303, headers: { location: redirectTo, 'set-cookie': cookie } });
  }

  async function isAuthenticated(request: Request): Promise<boolean> {
    const cookie = readCookie(request, cookieName);
    if (!cookie) return false;
    return timingSafeEqual(cookie, await hash(options.password));
  }

  async function handleLogin(request: Request): Promise<Response> {
    const form = await request.formData();
    const submitted = String(form.get('password') ?? '');
    const [expectedHash, submittedHash] = await Promise.all([hash(options.password), hash(submitted)]);

    if (!await timingSafeEqual(submittedHash, expectedHash)) return loginResponse(true);

    const cookie = [
      `${cookieName}=${submittedHash}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
    ].join('; ');
    return new Response(null, { status: 303, headers: { location: redirectTo, 'set-cookie': cookie } });
  }

  async function handleAuthRoutes(request: Request): Promise<Response | null> {
    const { pathname } = new URL(request.url);
    if (pathname === loginPath && request.method === 'POST') return handleLogin(request);
    if (pathname === logoutPath && request.method === 'POST') return logout();
    return null;
  }

  return { cookieName, isAuthenticated, handleAuthRoutes, loginResponse, logout };
}

async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(salt + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Both sides are hashed before comparison, so the comparison runs over two
 * fixed-length digests and cannot leak the length of either input.
 *
 * Workers provides a native constant-time compare on `crypto.subtle`; it is
 * not part of the WebCrypto standard, so it is absent under Node and in tests.
 * The fallback is a constant-time XOR over the same two digests.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const native = (crypto.subtle as Partial<{ timingSafeEqual(x: ArrayBuffer, y: ArrayBuffer): boolean }>).timingSafeEqual;
  if (native) return native.call(crypto.subtle, aHash, bHash);
  return constantTimeEqual(new Uint8Array(aHash), new Uint8Array(bHash));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index]! ^ b[index]!;
  return difference === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
