import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const source = path.join(repoRoot, 'knowledge');
const target = path.join(appRoot, 'public', 'downloads', 'knowledge');
const foundations = path.join(source, 'foundations');
const tokenStylesheet = path.join(appRoot, 'src', 'styles', 'tokens.css');

function fail(file, message) {
  throw new Error(`Cannot generate tokens.css from ${path.relative(repoRoot, file)}: ${message}`);
}

function validateValue(file, name, field, value) {
  if (field === 'light') {
    const match = value.match(/^oklch\((\d*\.?\d+) (\d*\.?\d+) (\d*\.?\d+)\)$/);
    if (!match) fail(file, `token "${name}" has malformed OKLCH value "${value}"`);
    const [, lightness, chroma, hue] = match.map(Number);
    if (lightness < 0 || lightness > 1 || chroma < 0 || hue < 0 || hue > 360) {
      fail(file, `token "${name}" has an out-of-range OKLCH value "${value}"`);
    }
  } else if (name.startsWith('duration.') && !/^\d+ms$/.test(value)) {
    fail(file, `token "${name}" must be a duration in milliseconds, received "${value}"`);
  } else if (name.startsWith('easing.') && !/^cubic-bezier\((?:-?\d*\.?\d+,){3}-?\d*\.?\d+\)$/.test(value)) {
    fail(file, `token "${name}" has malformed cubic-bezier value "${value}"`);
  }
}

async function foundationTokens(file) {
  const markdown = await readFile(file, 'utf8');
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (!frontmatter) fail(file, 'missing YAML frontmatter');

  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => line === 'tokens:');
  if (start === -1) fail(file, 'missing tokens map');

  const tokens = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(' ')) break;
    if (!line.trim()) continue;

    const token = line.match(/^  ([a-z][a-z0-9.-]*):\s*\{(.+)\}\s*$/);
    if (!token) fail(file, `malformed token entry "${line.trim()}"`);
    const [, name, fields] = token;
    const resolved = fields.match(/(?:^|,\s*)\s*(light|value):\s*"([^"]+)"/);
    if (!resolved) fail(file, `token "${name}" is missing a light or value property`);
    const [, field, value] = resolved;
    validateValue(file, name, field, value);
    tokens.push([name, value]);
  }

  if (!tokens.length) fail(file, 'tokens map is empty');
  return tokens;
}

async function generateTokens() {
  const files = (await readdir(foundations))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => path.join(foundations, file));
  if (!files.length) throw new Error('Cannot generate tokens.css: no knowledge/foundations/*.md records found');

  const allTokens = new Map();
  for (const file of files) {
    for (const [name, value] of await foundationTokens(file)) {
      if (allTokens.has(name)) fail(file, `duplicate token "${name}"`);
      allTokens.set(name, value);
    }
  }

  const declarations = [...allTokens]
    .map(([name, value]) => `  --${name.replaceAll('.', '-')}: ${value};`)
    .join('\n');
  const css = `/* GENERATED from knowledge/foundations/*.md — do not edit */\n:root {\n${declarations}\n}\n`;
  await writeFile(tokenStylesheet, css, 'utf8');
}

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
await generateTokens();
