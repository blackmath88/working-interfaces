export interface ViewState<T> {
  get(): Readonly<T>;
  set(patch: Partial<T>): void;
  subscribe(fn: () => void): () => void;
}

export function createViewState<T extends object>(initial: T): ViewState<T> {
  let state = { ...initial };
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
