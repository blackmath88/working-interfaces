export interface Route {
  readonly path: string[];
  readonly params: Record<string, string>;
}

export interface NavigateOptions {
  readonly replace?: boolean;
}

const listeners = new Set<(route: Route) => void>();
let listening = false;

export function serialize(route: Route): string {
  const path = route.path.map(encodeURIComponent).join('/');
  const query = new URLSearchParams(route.params).toString();
  return `#/${path}${query ? `?${query}` : ''}`;
}

export function deserialize(hash: string): Route {
  const source = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = source.split('?');
  return {
    path: path.split('/').filter(Boolean).map(decodeURIComponent),
    params: Object.fromEntries(new URLSearchParams(query)),
  };
}

function currentRoute(): Route {
  return deserialize(window.location.hash);
}

function emit(): void {
  const route = currentRoute();
  listeners.forEach((fn) => fn(route));
}

function ensureListening(): void {
  if (listening) return;
  window.addEventListener('hashchange', emit);
  window.addEventListener('popstate', emit);
  listening = true;
}

export function navigate(path: string | string[], params: Record<string, string> = {}, options: NavigateOptions = {}): void {
  const hash = serialize({ path: Array.isArray(path) ? path : path.split('/').filter(Boolean), params });
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history[options.replace ? 'replaceState' : 'pushState'](null, '', url);
  emit();
}

export function onRouteChange(fn: (route: Route) => void): () => void {
  ensureListening();
  listeners.add(fn);
  return () => listeners.delete(fn);
}
