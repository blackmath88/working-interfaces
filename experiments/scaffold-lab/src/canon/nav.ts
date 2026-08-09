import { esc } from '@working-interfaces/scaffold';
import type { Lesson } from '../domain/types.ts';

const item = (lesson: Lesson, current: string, got: Readonly<Record<string, boolean>>): string => `
  <button class="nav-i" data-nav="${esc(lesson.id)}" ${lesson.id === current ? 'aria-current="page"' : ''}>
    <span class="dot" ${got[lesson.id] ? 'data-got' : ''}></span>
    <span class="lbl">${esc(lesson.title)}</span>
    <span class="lyr">${esc(lesson.layer)}</span>
  </button>`;

export function navView(lessons: readonly Lesson[], current: string, got: Readonly<Record<string, boolean>>): string {
  const modules = lessons.filter((lesson) => lesson.register === 'module');
  const decisions = lessons.filter((lesson) => lesson.register === 'decision');
  return `
    <div class="nav-sec"><div class="nav-sec-h">Module lessons</div>${modules.map((lesson) => item(lesson, current, got)).join('')}</div>
    <div class="nav-sec"><div class="nav-sec-h">Decision lessons</div>${decisions.map((lesson) => item(lesson, current, got)).join('')}</div>`;
}
