import {
  createStorage,
  createViewState,
  deserialize,
  memoryDriver,
  navigate,
  onRouteChange,
  subscribe,
} from '@working-interfaces/scaffold';
import { LESSONS } from './domain/content.ts';
import type { LabViewState } from './domain/types.ts';
import { createLabRuntime } from './views/labs.ts';
import { mountShell } from './views/shell.ts';
import './styles/lab.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('The scaffold lab needs an #app mount point.');

const appStorage = createStorage({ driver: memoryDriver() });

const view = createViewState<LabViewState>({
  lesson: 'overview',
  log: [],
  demoName: '',
  panelOpen: false,
});
const runtime = createLabRuntime(view, appStorage);
const shell = mountShell(root, runtime);

window.addEventListener('lab:navigate', ((event: CustomEvent<{ path: string[]; params: Record<string, string> }>) => {
  navigate(event.detail.path, event.detail.params);
}) as EventListener);

function syncRoute(route = deserialize(window.location.hash)): void {
  const requested = route.path[0];
  const lesson = requested && LESSONS.some((candidate) => candidate.id === requested) ? requested : 'overview';
  view.set({ lesson, log: [], demoName: '', panelOpen: false });
  shell.render();
}

subscribe(() => shell.renderNav());
view.subscribe(() => shell.renderUrl());
onRouteChange(syncRoute);
syncRoute();
