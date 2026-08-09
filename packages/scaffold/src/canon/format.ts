/**
 * canon/render.ts — string primitives.
 *
 * Pure string builders. No storage, no fetch, no event binding. Views mount
 * the strings and bind behaviour separately, which lets us test primitives
 * without a DOM.
 */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const fmt = (n: number | null | undefined, locale = 'de-CH'): string =>
  n == null || !Number.isFinite(n)
    ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
