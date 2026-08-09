import type { JournalEntry } from '@working-interfaces/scaffold';

export type Register = 'module' | 'decision';

export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly layer: string;
  readonly file: string;
  readonly metaphor: string;
  readonly lead: string;
  readonly register: Register;
}

export interface CheckItem {
  readonly id: string;
  readonly lessonId: string;
  readonly label: string;
}

export interface LogEntry {
  readonly n: number;
  readonly message: string;
  readonly kind?: 'fire' | 'fail' | 'ok';
}

export interface LabViewState {
  readonly lesson: string;
  readonly log: readonly LogEntry[];
  readonly demoName: string;
  readonly panelOpen: boolean;
}

export interface Snapshot {
  readonly instrument: 'scaffold-lab';
  readonly exported: string;
  readonly progress: { readonly understood: number; readonly of: number };
  readonly modules: readonly string[];
  readonly journal: ReadonlyArray<Pick<JournalEntry, 'id' | 'decision'> & { supersedes: string | null }>;
}
