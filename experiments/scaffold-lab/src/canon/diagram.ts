import { esc } from '@working-interfaces/scaffold';

const box = (id: string, x: number, y: number, width: number, title: string, detail: string, here: string | null): string => `
  <g class="dg-node" role="link" tabindex="0" data-nav="${esc(id)}" ${here === id ? 'data-here' : ''}>
    <rect class="dgf dgs" x="${x}" y="${y}" width="${width}" height="58"/>
    <text class="dgt" x="${x + width / 2}" y="${y + 24}" text-anchor="middle">${esc(title)}</text>
    <text class="dgd" x="${x + width / 2}" y="${y + 43}" text-anchor="middle">${esc(detail)}</text>
  </g>`;

export function diagramView(here: string | null): string {
  return `<div class="diagram"><svg viewBox="0 0 700 470" role="img" aria-label="Four layers with arrows pointing downward">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" class="dga"/></marker></defs>
    <rect class="dgf dgs" x="30" y="20" width="640" height="52"/>
    <text class="dgt" x="350" y="43" text-anchor="middle">shell / views</text>
    <text class="dgd" x="350" y="61" text-anchor="middle">puts things on screen, wires up buttons</text>
    <line class="dga" x1="350" y1="72" x2="350" y2="96" marker-end="url(#arrow)"/>
    ${box('canon', 30, 96, 640, 'canon', 'turns data into markup, nothing else', here)}
    <line class="dga" x1="350" y1="154" x2="350" y2="178" marker-end="url(#arrow)"/>
    <rect class="dgf2 dgs" x="30" y="178" width="640" height="186"/>
    <text class="dgt" x="48" y="201">engine</text>
    ${box('storage', 46, 214, 196, 'storage', 'saves, upgrades old data', here)}
    ${box('store', 252, 214, 196, 'store', 'one door for changes', here)}
    ${box('journal', 458, 214, 196, 'journal', 'records, never erases', here)}
    ${box('derive', 46, 286, 196, 'derive', 'calculations only', here)}
    ${box('viewstate', 252, 286, 196, 'view-state', 'where you are looking', here)}
    ${box('router', 458, 286, 196, 'router', 'back button, links', here)}
    <line class="dga" x1="350" y1="364" x2="350" y2="388" marker-end="url(#arrow)"/>
    ${box('domain', 30, 388, 640, 'domain', 'the nouns, per project, knows nothing', here)}
  </svg></div>`;
}
