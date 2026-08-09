import { navView } from '../canon/nav.ts';
import { lessonView } from '../canon/lesson.ts';
import { lessonById, LESSONS } from '../domain/content.ts';
import type { LabRuntime } from './labs.ts';

export interface Shell {
  render(): void;
  renderNav(): void;
  renderUrl(): void;
}

export function mountShell(root: HTMLElement, runtime: LabRuntime): Shell {
  root.innerHTML = `<div class="app"><nav class="rail" aria-label="Lessons"><div class="rail-h"><div class="brand">Working Interfaces · Lab</div><div class="brand-t">Scaffold Lab</div></div><div id="nav"></div></nav>
    <main class="main"><div class="urlbar"><span class="k">url</span><span class="v" id="url">#/</span><button class="nb" type="button" data-history="back">← back</button><button class="nb" type="button" data-history="forward">forward →</button><button class="nb theme-toggle" type="button" data-theme-toggle aria-pressed="false">Signal dark</button><span class="layer" id="layer"></span></div><div class="page" id="page"></div></main></div>`;

  const renderNav = (): void => {
    const nav = root.querySelector<HTMLElement>('#nav');
    if (nav) nav.innerHTML = navView(LESSONS, runtime.view.get().lesson, runtime.got());
  };

  const renderUrl = (): void => {
    const element = root.querySelector<HTMLElement>('#url');
    if (element) element.textContent = window.location.hash || '#/';
  };

  const render = (): void => {
    const lesson = lessonById(runtime.view.get().lesson);
    const status = runtime.progress();
    const layer = root.querySelector<HTMLElement>('#layer');
    const page = root.querySelector<HTMLElement>('#page');
    if (layer) layer.textContent = `layer: ${lesson.layer} · ${status.done}/${status.total} understood`;
    renderNav();
    renderUrl();
    if (page) page.innerHTML = lessonView({
      lesson,
      got: runtime.hasGot(lesson.id),
      understood: status.done,
      total: status.total,
      snapshotJson: JSON.stringify(runtime.snapshot(), null, 2),
    });
    runtime.paint(lesson.id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const navigation = target.closest<HTMLElement>('[data-nav]');
    if (navigation?.dataset.nav) {
      requestNavigation([navigation.dataset.nav]);
      return;
    }

    const history = target.closest<HTMLElement>('[data-history]')?.dataset.history;
    if (history === 'back') { window.history.back(); return; }
    if (history === 'forward') { window.history.forward(); return; }

    if (target.closest('[data-theme-toggle]')) {
      const dark = document.documentElement.dataset.theme === 'signal-dark';
      document.documentElement.dataset.theme = dark ? 'institutional-light' : 'signal-dark';
      const button = root.querySelector<HTMLButtonElement>('[data-theme-toggle]');
      if (button) {
        button.textContent = dark ? 'Signal dark' : 'Institutional light';
        button.setAttribute('aria-pressed', String(!dark));
      }
      return;
    }

    const understood = target.closest<HTMLElement>('[data-got]')?.dataset.got;
    if (understood) {
      runtime.setGot(understood, !runtime.hasGot(understood));
      render();
      return;
    }

    const action = target.closest<HTMLElement>('[data-demo]')?.dataset.demo;
    if (action) runtime.runDemo(action);
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === 'uname') runtime.setCanonName(target.value);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as Element;
    const id = target.closest<HTMLElement>('.dg-node[data-nav]')?.dataset.nav;
    if (id) { event.preventDefault(); requestNavigation([id]); }
  });

  function requestNavigation(path: string[], params: Record<string, string> = {}): void {
    window.dispatchEvent(new CustomEvent('lab:navigate', { detail: { path, params } }));
  }

  return { render, renderNav, renderUrl };
}
