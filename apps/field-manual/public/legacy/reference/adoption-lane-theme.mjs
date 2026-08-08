export const THEME_STORAGE_KEY = 'adoption-lane-theme';

export function resolveTheme(storedTheme) {
  return storedTheme === 'dark' ? 'dark' : 'light';
}

export function getStoredTheme(storage = globalThis.localStorage) {
  try {
    return resolveTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

export function applyTheme(theme, root = globalThis.document?.documentElement) {
  const resolvedTheme = resolveTheme(theme);
  if (root) root.dataset.theme = resolvedTheme;
  return resolvedTheme;
}

export function updateThemeToggle(button, theme) {
  if (!button) return;
  const dark = theme === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  const icon = button.querySelector('[data-theme-icon]');
  if (icon) icon.textContent = dark ? '☀' : '☾';
}

export function setTheme(theme, {
  storage = globalThis.localStorage,
  root = globalThis.document?.documentElement,
  button = globalThis.document?.querySelector('#themeButton'),
} = {}) {
  const resolvedTheme = applyTheme(theme, root);
  try {
    storage?.setItem(THEME_STORAGE_KEY, resolvedTheme);
  } catch {
    // Theme switching still works when storage is unavailable.
  }
  updateThemeToggle(button, resolvedTheme);
  return resolvedTheme;
}

export function toggleTheme(options = {}) {
  const root = options.root ?? globalThis.document?.documentElement;
  const currentTheme = resolveTheme(root?.dataset.theme);
  return setTheme(currentTheme === 'dark' ? 'light' : 'dark', options);
}

export function initializeThemeToggle({
  storage = globalThis.localStorage,
  root = globalThis.document?.documentElement,
  button = globalThis.document?.querySelector('#themeButton'),
} = {}) {
  const theme = applyTheme(getStoredTheme(storage), root);
  updateThemeToggle(button, theme);
  button?.addEventListener('click', () => toggleTheme({ storage, root, button }));
  return theme;
}
