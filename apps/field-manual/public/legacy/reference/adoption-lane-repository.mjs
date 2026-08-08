import { DEMO_PORTFOLIO, validatePortfolio } from './adoption-lane-data.mjs';

export const EMPTY_PORTFOLIO = { version: 1, fictional: true, customers: [] };

const clone = value => JSON.parse(JSON.stringify(value));

export function createPortfolioRepository(storage, keys = {}) {
  const storageKey = keys.storageKey || 'adoption-lane-portfolio-v1';
  const backupKey = keys.backupKey || 'adoption-lane-portfolio-backup-v1';

  const readValid = raw => {
    if (!raw) return null;
    const candidate = JSON.parse(raw);
    if (validatePortfolio(candidate).length) throw new Error('Saved portfolio data is invalid.');
    return candidate;
  };

  return {
    load() {
      try { return readValid(storage.getItem(storageKey)) || clone(EMPTY_PORTFOLIO); }
      catch { return clone(EMPTY_PORTFOLIO); }
    },
    replaceWithDemo() {
      const current = storage.getItem(storageKey);
      if (current) storage.setItem(backupKey, current);
      const candidate = clone(DEMO_PORTFOLIO);
      const errors = validatePortfolio(candidate);
      if (errors.length) throw new Error(errors.join(' '));
      storage.setItem(storageKey, JSON.stringify(candidate));
      return candidate;
    },
    restore() {
      const backup = readValid(storage.getItem(backupKey));
      if (!backup) return null;
      storage.setItem(storageKey, JSON.stringify(backup));
      storage.removeItem(backupKey);
      return backup;
    },
    clear() {
      const current = storage.getItem(storageKey);
      if (current) storage.setItem(backupKey, current);
      storage.removeItem(storageKey);
      return clone(EMPTY_PORTFOLIO);
    },
    exportCurrent() {
      const current = readValid(storage.getItem(storageKey));
      return current ? JSON.stringify(current, null, 2) : null;
    },
    hasSavedData: () => Boolean(storage.getItem(storageKey)),
    hasBackup: () => Boolean(storage.getItem(backupKey))
  };
}

