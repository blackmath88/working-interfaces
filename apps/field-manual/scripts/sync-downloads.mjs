import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const source = path.join(repoRoot, 'knowledge');
const target = path.join(appRoot, 'public', 'downloads', 'knowledge');

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
