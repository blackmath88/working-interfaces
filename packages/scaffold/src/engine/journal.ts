import { read, write } from './storage.ts';

export interface JournalEntry {
  readonly id: string;
  readonly subjectId: string;
  readonly scope?: string;
  readonly decision: string;
  readonly rationale: string;
  readonly alternatives_rejected: readonly string[];
  readonly decided_by: string;
  readonly decided_at: string;
  readonly supersedes?: string;
}

export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'decided_by' | 'decided_at'> & {
  readonly id?: string;
  readonly decided_at?: string;
};

export type AuthorResolver = () => string | null | undefined;

export function getJournal(storageKey: string): readonly JournalEntry[] {
  return read<JournalEntry[]>(storageKey, []);
}

export function appendEntry(
  storageKey: string,
  entry: JournalEntryDraft,
  resolveAuthor: AuthorResolver,
  fallbackAuthor: string,
): JournalEntry {
  const record: JournalEntry = {
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    alternatives_rejected: [...entry.alternatives_rejected],
    decided_by: resolveAuthor() || fallbackAuthor,
    decided_at: entry.decided_at ?? new Date().toISOString(),
  };
  const journal = getJournal(storageKey);
  write(storageKey, [...journal, record]);
  return record;
}

export function supersede(
  storageKey: string,
  previousId: string,
  entry: Omit<JournalEntryDraft, 'supersedes'>,
  resolveAuthor: AuthorResolver,
  fallbackAuthor: string,
): JournalEntry {
  return appendEntry(storageKey, { ...entry, supersedes: previousId }, resolveAuthor, fallbackAuthor);
}
