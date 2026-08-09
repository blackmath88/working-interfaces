import { now, uid } from './storage.ts';
import type { KeyValueStorage } from './storage.ts';

export interface JournalEntry {
  readonly id: string;
  readonly subjectId: string;
  readonly scope?: string;
  readonly decision: string;
  readonly rationale: string;
  readonly alternatives_rejected: string;
  readonly decided_by: string;
  readonly decided_at: string;
  readonly supersedes?: string;
}

export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'decided_by' | 'decided_at'>
  & Partial<Pick<JournalEntry, 'decided_by' | 'decided_at'>>;

export type AuthorResolver = () => string | null | undefined;

export const getJournal = (storage: KeyValueStorage, storageKey: string): JournalEntry[] =>
  storage.read<JournalEntry[]>(storageKey, []);

export function appendEntry(
  storage: KeyValueStorage,
  storageKey: string,
  entry: JournalEntryDraft,
  resolveAuthor: AuthorResolver,
  fallbackAuthor: string,
): JournalEntry | null {
  if (!entry.subjectId) return null;
  const journal = getJournal(storage, storageKey);
  const record: JournalEntry = {
    id: uid(),
    subjectId: entry.subjectId,
    decision: entry.decision ?? '',
    rationale: entry.rationale ?? '',
    alternatives_rejected: entry.alternatives_rejected ?? '',
    decided_by: entry.decided_by || resolveAuthor() || fallbackAuthor,
    decided_at: entry.decided_at || now(),
    ...(entry.scope ? { scope: entry.scope } : {}),
    ...(entry.supersedes ? { supersedes: entry.supersedes } : {}),
  };
  storage.write(storageKey, [...journal, record]);
  return record;
}

/** Superseding is an append. The superseded entry is never removed. */
export const supersede = (
  storage: KeyValueStorage,
  storageKey: string,
  previousId: string,
  entry: Omit<JournalEntryDraft, 'supersedes'>,
  resolveAuthor: AuthorResolver,
  fallbackAuthor: string,
): JournalEntry | null =>
  appendEntry(storage, storageKey, { ...entry, supersedes: previousId }, resolveAuthor, fallbackAuthor);
